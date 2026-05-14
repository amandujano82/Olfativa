/* global React, OLF_KNOW, OLF_IA */
// scent-iq-panel.jsx
// Modal Scent Advisor (interno: scent-iq). Vive dentro de cotizador.html
// y se monta desde app-cotizador.jsx. UI completa del flujo IA:
//   intro (uploader + demo) -> analyzing -> result (4 cards + Designer + JSON + acciones).
//
// Expone: window.ScentIQPanel
// Props:
//   open          (bool)              — controla el portal en el padre
//   onClose       () => void
//   client        { clientName, propId, ... }   — desde el cotizador
//   onApply       ({ difusorKey, aromaKey, cantidad, full }) => void
//                   El padre lo usa para escribir a prices.lines + LS.

(function (W) {
  const { useState, useMemo, useRef, useCallback, forwardRef } = W.React;

  // ----------------------------------------------------------
  // Catálogo de Tipo de espacio · obligatorio antes de analizar
  // Mapeo a profileIndex (0..4) del mock vision adapter para que el
  // perfil mock al menos respete el giro real del negocio. Sin esto,
  // el mock elegía perfil por hash(nombre+size) — p.ej. una oficina
  // podía caer en "Costero tropical boutique costera".
  // ----------------------------------------------------------
  const SPACE_TYPES = [
    { id: 'spa',         label: 'Spa o wellness',                 profileIndex: 0 },
    { id: 'hotel',       label: 'Hotel lobby o quiet luxury',     profileIndex: 1 },
    { id: 'boutique',    label: 'Boutique costero o resort',      profileIndex: 2 },
    { id: 'bar',         label: 'Bar lounge o nightlife',         profileIndex: 3 },
    { id: 'restaurante', label: 'Restaurante bohemio mexicano',   profileIndex: 4 },
    { id: 'oficina',     label: 'Oficina corporativa',            profileIndex: 1 },
    { id: 'retail',      label: 'Retail moda',                    profileIndex: 4 },
    { id: 'showroom',    label: 'Showroom premium',               profileIndex: 1 },
    { id: 'clinica',     label: 'Clínica o estética',             profileIndex: 0 },
    { id: 'gym',         label: 'Gym o estudio',                  profileIndex: 0 },
    { id: 'residencia',  label: 'Residencia premium',             profileIndex: 1 },
  ];
  const profileIndexForSpace = (id) => {
    const s = SPACE_TYPES.find(s => s.id === id);
    return s ? s.profileIndex : null;
  };

  // Tipos de luz disponibles para el override manual del especialista.
  const TIPOS_LUZ = [
    { id: 'calida_difusa', label: 'Cálida difusa' },
    { id: 'neutra',        label: 'Neutra' },
    { id: 'fria',          label: 'Fría' },
    { id: 'dramatica',     label: 'Dramática' },
  ];

  // ----------------------------------------------------------
  // helpers
  // ----------------------------------------------------------
  function readDemo() {
    return fetch('scent-iq-demo.json?v=20260514c').then(r => r.ok ? r.json() : null).catch(() => null);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  function downloadJson(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // Narrativa profesional en espanol que conecta materiales, luz,
  // geometria, paleta y emocion con el aroma elegido. Tono perfumista
  // explicando al cliente, NO listado tecnico.
  // CRITICO: lee SIEMPRE los datos del aroma/difusor desde
  // output._meta.aroma_principal_full y output._meta.difusor_full
  // para que los overrides manuales arrastren descripcion/acordes/etc.
  function buildScentNarrative(output, client) {
    const o = output || {};
    const av = o.analisis_visual || {};
    const lectura = o.lectura_emocional || {};
    const est = o.estrategia_olfativa || {};
    const dif = o.difusion || {};
    const meta = o._meta || {};
    const aromaFull = meta.aroma_principal_full || {};
    const difFull = meta.difusor_full || {};
    const overrides = meta.manual_overrides || {};
    const cliente = client?.clientName || 'cliente';

    const fvName = (OLF_KNOW.familiasVisuales.find(f => f.id === av.familia_visual) || {}).nombre
      || av.familia_visual || 'el carácter del espacio';

    // Aroma: leer del catalogo (aroma_principal_full) con fallback al campo plano
    const aromaNombre  = aromaFull.nombre        || est.aroma_principal       || 'el aroma recomendado';
    const aromaFamilia = aromaFull.familia       || est.familia_olfativa      || '';
    const aromaDesc    = aromaFull.descripcion   || est.descripcion_principal || '';
    const aromaAcordes = (aromaFull.acordes || []).filter(Boolean).join(' / ');
    const isManualAroma = !!(aromaFull.manual_override || overrides.aroma);

    // Difusor: leer del _meta con fallback al campo plano
    const difModelo     = difFull.modelo            || dif.difusor_recomendado || '';
    const difCobMax     = difFull.cobertura_max_m2;
    const difIntensidad = difFull.intensidad        || dif.intensidad          || '';
    const cobertura     = (difCobMax != null && difCobMax !== '') ? `cobertura hasta ${difCobMax} m²` : '';
    const isManualDif   = !!(difFull.manual_override || overrides.difusor);

    const luz = av.tipo_de_luz || '';
    const temp = av.temperatura_visual || '';
    const paleta = av.paleta_dominante || '';
    const materiales = av.materialidad
      || (Array.isArray(av.materiales_principales) ? av.materiales_principales.join(', ') : '');
    const formas = av.formas || av.geometria || '';
    const densidad = av.densidad || '';
    const emocion = lectura.emocion_deseada || av.emocion_deseada || av.emocion_actual || '';
    const cant = dif.cantidad || '';

    const lineas = [];
    lineas.push(`*Olfativa · Recomendación sensorial para ${cliente}*`);
    lineas.push('');
    lineas.push(
      `Tras leer la fotografía del espacio identificamos un carácter *${String(fvName).toLowerCase()}*. ` +
      `La iluminación ${luz ? String(luz).toLowerCase() : 'observada'}` +
      `${temp ? ` con temperatura ${String(temp).toLowerCase()}` : ''} ` +
      `establece un tono envolvente que pide un aroma con cuerpo y sin estridencias.`
    );
    lineas.push('');
    if (materiales) {
      lineas.push(
        `Los materiales (${String(materiales).toLowerCase()}) aportan calidez táctil y memoria orgánica; ` +
        `visual y olfativamente se conectan con notas ${aromaFamilia ? String(aromaFamilia).toLowerCase() : 'congruentes con la paleta'}, ` +
        `que prolongan la sensación de la madera, la piedra y los textiles en el aire.`
      );
    }

    // Bloque del aroma SIEMPRE desde el catalogo
    lineas.push('');
    if (isManualAroma) {
      lineas.push(
        `Aroma seleccionado para este espacio: *${aromaNombre}*` +
        `${aromaFamilia ? ` (familia ${String(aromaFamilia).toLowerCase()})` : ''}.`
      );
      if (aromaDesc) lineas.push(aromaDesc);
      if (aromaAcordes) lineas.push(`Acordes principales: ${aromaAcordes}.`);
    } else {
      if (paleta) {
        lineas.push(
          `La paleta ${String(paleta).toLowerCase()} pide un perfume de baja saturación y alta profundidad — ` +
          `exactamente lo que entrega *${aromaNombre}*.`
        );
      }
      if (aromaDesc) lineas.push(aromaDesc);
      if (aromaAcordes) lineas.push(`Acordes principales: ${aromaAcordes}.`);
    }

    if (formas) {
      lineas.push(
        `La geometría ${String(formas).toLowerCase()} se acompaña mejor de un aroma sin aristas, fluido, ` +
        `que respete la cadencia visual del espacio.`
      );
    }
    if (densidad) {
      lineas.push(
        `La densidad ${String(densidad).toLowerCase()} permite que el aroma se distribuya sin saturar, ` +
        `manteniendo la sensación de amplitud.`
      );
    }
    if (emocion && !isManualAroma) {
      lineas.push('');
      lineas.push(
        `La emoción deseada — *${emocion}* — encuentra en ${aromaNombre} su contraparte olfativa.`
      );
    }
    lineas.push('');
    lineas.push(
      `*Recomendación final:* ${aromaNombre}` +
      `${aromaFamilia ? ` (familia ${String(aromaFamilia).toLowerCase()})` : ''}` +
      `${isManualAroma ? ' · selección manual' : ''}, ` +
      `difundido con ${difModelo || 'el equipo recomendado'}` +
      `${cobertura ? ` (${cobertura})` : ''}` +
      `${difIntensidad ? ` con intensidad ${String(difIntensidad).toLowerCase()}` : ''}` +
      `${cant ? ` · ${cant} unidad${cant > 1 ? 'es' : ''}` : ''}` +
      `${isManualDif ? ' · equipo seleccionado manualmente por el especialista' : ''}.`
    );
    if (o.resumen_comercial) {
      lineas.push('');
      lineas.push(o.resumen_comercial);
    }
    lineas.push('');
    lineas.push('— Olfativa · diseño de identidad olfativa');
    return lineas.join('\n');
  }

  // ----------------------------------------------------------
  // ImageUploader
  // ----------------------------------------------------------
  function ImageUploader({ previewURL, onFile, onUseDemo, onAnalyzeWithoutPhoto, disabled, spaceType, onSpaceType }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);
    const ready = !!spaceType;

    const onDrop = useCallback((e) => {
      e.preventDefault(); setDrag(false);
      if (!ready) return;
      const f = e.dataTransfer.files?.[0];
      if (f && /^image\//.test(f.type)) onFile(f);
    }, [onFile, ready]);

    return (
      <div className="siq-uploader">
        {/* Tipo de espacio · obligatorio antes de analizar */}
        <div className="siq-space-type">
          <label className="siq-space-type-label" htmlFor="siq-space-type-select">
            Tipo de espacio <span className="siq-req">*</span>
          </label>
          <select
            id="siq-space-type-select"
            className="siq-space-type-select"
            value={spaceType || ''}
            onChange={(e) => onSpaceType(e.target.value || null)}
          >
            <option value="">— Selecciona el giro del cliente —</option>
            {SPACE_TYPES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <div className="siq-space-type-hint">
            {ready
              ? 'Listo · el análisis usará este giro como base. Puedes subir foto o seguir sin imagen.'
              : 'Selecciona primero el giro · sin esto el motor mock asigna perfil por hash del archivo y puede equivocar la lectura.'}
          </div>
        </div>

        <div
          className={"siq-drop" + (drag ? ' is-drag' : '') + (previewURL ? ' has-preview' : '') + (!ready ? ' is-locked' : '')}
          onClick={() => { if (!disabled && ready) inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); if (ready) setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          title={!ready ? 'Selecciona primero el tipo de espacio' : ''}
        >
          {previewURL ? (
            <img src={previewURL} alt="preview" className="siq-preview" />
          ) : (
            <>
              <div className="siq-drop-icon">⬆</div>
              <div className="siq-drop-title">Sube una foto del espacio</div>
              <div className="siq-drop-sub">
                {ready
                  ? 'Arrastra una imagen aquí, o haz click para seleccionar (JPG · PNG)'
                  : 'Bloqueado hasta seleccionar el tipo de espacio'}
              </div>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        <div className="siq-uploader-actions">
          <button
            className="btn-primary"
            onClick={onAnalyzeWithoutPhoto}
            disabled={disabled || !ready}
            title={!ready ? 'Selecciona primero el tipo de espacio' : 'Analizar usando solo el giro, sin foto (resultado marcado como estimado).'}
          >
            ⌖ Analizar sin foto
          </button>
          <button className="btn-secondary" onClick={onUseDemo} disabled={disabled || !ready} title={!ready ? 'Selecciona primero el tipo de espacio' : ''}>
            ▶ Usar análisis demo
          </button>
          <span className="siq-uploader-note">
            Adapter actual: <b>mock</b> · el giro elegido fija el perfil del catálogo; el override manual del especialista vive en la siguiente pantalla.
          </span>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Photo evidence — render estilo Microsoft Designer
  // (marco crema, foto centrada, 2 columnas de bullets, logo Olfativa)
  // forwardRef para que el parent pueda capturarlo con html2canvas.
  // ----------------------------------------------------------
  const PhotoEvidenceCard = forwardRef(function PhotoEvidenceCard({ previewURL, analisis, output }, ref) {
    const [aspect, setAspect] = useState(null);
    const onImgLoad = (e) => {
      const w = e.target.naturalWidth, h = e.target.naturalHeight;
      if (w && h) setAspect(w / h);
    };

    const fv = OLF_KNOW.familiasVisuales.find(f => f.id === analisis.familia_visual);
    const captionParts = [];
    if (analisis.tipo_de_espacio) captionParts.push(analisis.tipo_de_espacio);
    if (fv) captionParts.push(fv.nombre);
    if (analisis.emocion_actual) captionParts.push(analisis.emocion_actual);
    const caption = captionParts.join(' · ');

    const aromaName  = output.estrategia_olfativa.aroma_principal;
    const familiaOlf = output.estrategia_olfativa.familia_olfativa;
    const subacorde  = output.estrategia_olfativa.subacorde_olfativo;
    const familiaVisualName = fv ? fv.nombre : (analisis.familia_visual || '—');

    const mats = Array.isArray(analisis.materiales_principales)
      ? analisis.materiales_principales.slice(0, 3).join(', ')
      : '';
    const brief = [
      `Este espacio se lee como ${fv ? fv.nombre.toLowerCase() : 'ambiguo'}${mats ? `: ${mats}` : ''}.`,
      analisis.emocion_deseada ? `Buscamos ${String(analisis.emocion_deseada).toLowerCase()}.` : '',
      `Por eso la dirección olfativa es ${familiaOlf}, encarnada en ${aromaName}.`
    ].filter(Boolean).join(' ');

    // Bullets reflejan exactamente las 8 variables canonicas del playbook
    const leftBullets = [
      { k: 'Tipo de luz',  v: pretty(analisis.tipo_de_luz, '—') },
      { k: 'Materialidad', v: pretty(analisis.materialidad, '—') },
      { k: 'Formas',       v: pretty(analisis.formas, '—') },
      { k: 'Densidad',     v: pretty(analisis.densidad, '—') }
    ];
    const rightBullets = [
      { k: 'Familia visual',     v: familiaVisualName || '—' },
      { k: 'Familia olfativa',   v: familiaOlf || '—' },
      { k: 'Subacorde olfativo', v: subacorde || '—' },
      { k: 'Aroma',              v: aromaName || '—' }
    ];

    const photoStyle = aspect ? { aspectRatio: String(aspect) } : { aspectRatio: '16 / 10' };

    return (
      <div className="siq-evidence" ref={ref}>
        <div className="siq-designer">
          <div className="siq-designer-head">
            <div className="siq-designer-title">Análisis sensorial del espacio</div>
            <div className="siq-designer-sub">Lectura visual y dirección olfativa</div>
          </div>

          <div className="siq-designer-body">
            <ul className="siq-designer-bullets siq-designer-bullets-left">
              {leftBullets.map((b, i) => (
                <li key={i}>
                  <span className="siq-bullet-key">{b.k}</span>
                  <span className="siq-bullet-dot">·</span>
                  <span className="siq-bullet-val">{b.v}</span>
                </li>
              ))}
            </ul>

            <div className="siq-designer-photo" style={photoStyle}>
              {previewURL ? (
                <img src={previewURL} className="siq-designer-img" alt="Espacio del cliente" onLoad={onImgLoad} />
              ) : (
                <div className="siq-designer-placeholder">
                  Análisis demo · sin imagen de origen
                </div>
              )}
            </div>

            <ul className="siq-designer-bullets siq-designer-bullets-right">
              {rightBullets.map((b, i) => (
                <li key={i}>
                  <span className="siq-bullet-key">{b.k}</span>
                  <span className="siq-bullet-dot">·</span>
                  <span className="siq-bullet-val">{b.v}</span>
                </li>
              ))}
            </ul>
          </div>

          {caption && (
            <div className="siq-designer-caption">{caption}</div>
          )}

          <div className="siq-designer-logo">Olfativa</div>
        </div>

        <div className="siq-evidence-body">
          <div className="siq-card-eyebrow">Lectura sensorial del espacio</div>
          <p className="siq-evidence-brief">{brief}</p>
        </div>
      </div>
    );
  });

  // helper local: trim + fallback si valor está vacío
  function pretty(v, fallback) {
    const s = (v == null ? '' : String(v)).trim();
    if (!s || s === '—') return fallback;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ----------------------------------------------------------
  // 4 cards
  // ----------------------------------------------------------
  // ----------------------------------------------------------
  // VisualOverridesPanel — overrides manuales del especialista
  // sobre la lectura visual del motor. Si cambia un campo, el
  // padre regenera output con buildOutput para que aroma + prompt
  // queden coherentes con la lectura corregida.
  // ----------------------------------------------------------
  function VisualOverridesPanel({ analisis, overrides, onChange, onClear }) {
    const ov = overrides || {};
    const isOn = ov.familia_visual || ov.materialidad || ov.tipo_de_luz;
    return (
      <div className="siq-visual-overrides">
        <div className="siq-visual-overrides-head">
          <div>
            <div className="siq-eyebrow">Override visual del especialista</div>
            <div className="siq-visual-overrides-sub">
              Si el motor leyó mal, ajusta aquí. Esto regenera la familia olfativa y el prompt Designer.
            </div>
          </div>
          {isOn && (
            <button className="siq-override-clear" onClick={onClear} title="Volver a la lectura del motor">
              Volver a la lectura del motor
            </button>
          )}
        </div>
        <div className="siq-visual-overrides-grid">
          <label className="siq-vo-field">
            <span className="siq-vo-label">Familia visual</span>
            <select
              className="siq-vo-control"
              value={ov.familia_visual || analisis?.familia_visual || ''}
              onChange={(e) => onChange({ familia_visual: e.target.value })}
            >
              <option value="">— Detectada por motor —</option>
              {OLF_KNOW.familiasVisuales.map(f => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </label>
          <label className="siq-vo-field">
            <span className="siq-vo-label">Materialidad</span>
            <input
              type="text"
              className="siq-vo-control"
              value={ov.materialidad ?? (analisis?.materialidad || '')}
              placeholder="madera clara, lino, mármol…"
              onChange={(e) => onChange({ materialidad: e.target.value })}
            />
          </label>
          <label className="siq-vo-field">
            <span className="siq-vo-label">Tipo de luz</span>
            <select
              className="siq-vo-control"
              value={ov.tipo_de_luz || analisis?.tipo_de_luz || ''}
              onChange={(e) => onChange({ tipo_de_luz: e.target.value })}
            >
              <option value="">— Detectada por motor —</option>
              {TIPOS_LUZ.map(t => (
                <option key={t.id} value={t.label}>{t.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }

  function VisualAnalysisCard({ a }) {
    const fv = OLF_KNOW.familiasVisuales.find(f => f.id === a.familia_visual);
    const fv2 = OLF_KNOW.familiasVisuales.find(f => f.id === a.familia_visual_secundaria);
    const rows = [
      ['Tipo de luz', a.tipo_de_luz],
      ['Temperatura visual', a.temperatura_visual],
      ['Paleta dominante', a.paleta_dominante],
      ['Saturación', a.saturacion],
      ['Contraste', a.contraste],
      ['Materialidad', a.materialidad],
      ['Materiales', Array.isArray(a.materiales_principales) ? a.materiales_principales.join(' · ') : ''],
      ['Formas', a.formas],
      ['Geometría', a.geometria],
      ['Densidad', a.densidad],
      ['Familia visual', fv ? `${fv.nombre} · ${fv.alias}` : a.familia_visual],
      ['Familia secundaria', fv2 ? fv2.nombre : (a.familia_visual_secundaria || '—')],
      ['Nivel premium', a.nivel_premium],
      ['Naturaleza presente', a.presencia_naturaleza],
      ['Tipo de espacio', a.tipo_de_espacio],
      ['Emoción actual', a.emocion_actual],
      ['Emoción deseada', a.emocion_deseada]
    ];
    return (
      <div className="siq-card">
        <div className="siq-card-eyebrow">Análisis visual</div>
        <div className="siq-card-title">Lectura del espacio</div>
        <dl className="siq-kv">
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd>{v || <span className="siq-muted">—</span>}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    );
  }

  function OlfactoryRecommendationCard({ est, principalFull, alternativoFull }) {
    return (
      <div className="siq-card">
        <div className="siq-card-eyebrow">Estrategia olfativa</div>
        <div className="siq-card-title">{est.familia_olfativa}</div>
        <div className="siq-subacorde">{est.subacorde_olfativo}</div>

        <div className="siq-aroma siq-aroma-principal">
          <div className="siq-aroma-tag">Aroma principal</div>
          <div className="siq-aroma-name">{est.aroma_principal}</div>
          {principalFull && (
            <>
              <div className="siq-aroma-meta">
                <span>{principalFull.familia}</span>
                {principalFull.acordes?.length ? <span>· {principalFull.acordes.filter(Boolean).join(' / ')}</span> : null}
              </div>
              <p className="siq-aroma-desc">{principalFull.descripcion}</p>
              {principalFull.notas && (
                <div className="siq-notas">
                  {principalFull.notas.salida && <div><b>Salida</b> · {principalFull.notas.salida}</div>}
                  {principalFull.notas.corazon && <div><b>Corazón</b> · {principalFull.notas.corazon}</div>}
                  {principalFull.notas.fondo && <div><b>Fondo</b> · {principalFull.notas.fondo}</div>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="siq-aroma siq-aroma-alt">
          <div className="siq-aroma-tag">
            Alternativo {alternativoFull?.funcion ? <span className="siq-aroma-fn">· {alternativoFull.funcion}</span> : null}
          </div>
          <div className="siq-aroma-name">{est.aroma_alternativo}</div>
          {alternativoFull && (
            <>
              <div className="siq-aroma-meta">
                <span>{alternativoFull.familia}</span>
                {alternativoFull.acordes?.length ? <span>· {alternativoFull.acordes.filter(Boolean).join(' / ')}</span> : null}
              </div>
              <p className="siq-aroma-desc">{alternativoFull.descripcion}</p>
            </>
          )}
        </div>

        <div className="siq-risk">
          <span className={"siq-risk-pill is-" + est.nivel_riesgo}>Riesgo: {est.nivel_riesgo}</span>
        </div>
        <p className="siq-justif">{est.justificacion}</p>
      </div>
    );
  }

  function DiffuserRecommendationCard({ dif }) {
    const full = dif._meta;
    const img = full?.imagen_url;
    return (
      <div className="siq-card">
        <div className="siq-card-eyebrow">Difusión</div>
        <div className="siq-card-title">{dif.difusor_recomendado}</div>

        {img && (
          <div className="siq-difusor-photo">
            <img src={img} alt={dif.difusor_recomendado} />
          </div>
        )}

        <dl className="siq-kv">
          <dt>Cantidad</dt>
          <dd>{dif.cantidad} {dif.cantidad_estimada && <em className="siq-est">(estimado)</em>}</dd>
          <dt>Ubicación</dt>
          <dd>{dif.ubicacion_sugerida}</dd>
          <dt>Intensidad</dt>
          <dd>{dif.intensidad}</dd>
          {full && (
            <>
              <dt>Cobertura</dt>
              <dd>{full.cobertura_min_m2}–{full.cobertura_max_m2} m²</dd>
              <dt>Configuración</dt>
              <dd>{full.configuracion}</dd>
              <dt>Nivel premium</dt>
              <dd>{full.nivel_premium} / 5</dd>
              {full.precio_renta_mxn != null && (
                <>
                  <dt>Precio renta</dt>
                  <dd>${full.precio_renta_mxn.toLocaleString('es-MX')} / mes</dd>
                </>
              )}
            </>
          )}
        </dl>

        {dif.riesgos?.length > 0 && (
          <div className="siq-block">
            <div className="siq-block-title">Riesgos</div>
            <ul>{dif.riesgos.map((r,i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
        {dif.ajustes_recomendados?.length > 0 && (
          <div className="siq-block">
            <div className="siq-block-title">Ajustes</div>
            <ul>{dif.ajustes_recomendados.map((r,i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}
      </div>
    );
  }

  function DesignerPromptCard({ designer, onCopy, copied }) {
    return (
      <div className="siq-card">
        <div className="siq-card-eyebrow">Microsoft Designer</div>
        <div className="siq-card-title">Prompt visual generado</div>
        <div className="siq-labels">
          {designer.labels.map((l, i) => <span key={i} className="siq-label-chip">{l}</span>)}
        </div>
        <textarea className="siq-prompt" readOnly value={designer.prompt_final} rows={14} />
        <button className="btn-primary siq-copy" onClick={onCopy}>
          {copied ? '✓ Copiado' : 'Copiar prompt'}
        </button>
      </div>
    );
  }

  function JsonOutput({ output }) {
    const [open, setOpen] = useState(false);
    return (
      <div className="siq-json-block">
        <button className="siq-json-toggle" onClick={() => setOpen(v => !v)}>
          {open ? '▾' : '▸'} JSON estructurado completo
        </button>
        {open && <pre className="siq-json">{JSON.stringify(output, null, 2)}</pre>}
      </div>
    );
  }

  // ----------------------------------------------------------
  // Override pickers: aroma / difusor (selección manual del especialista)
  // ----------------------------------------------------------
  function AromaPicker({ onSelect, onClose, current }) {
    const [familiaFilter, setFamiliaFilter] = useState([]);
    const [sublineaFilter, setSublineaFilter] = useState([]);
    const [soloNicho, setSoloNicho] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(current?.id || null);

    const familias = ['Cítricas','Herbales','Verdes','Florales','Frutales','Amaderadas','De ocasión'];
    const sublineas = ['Nueva colección','Nicho','Regular','Odor control','De ocasión'];
    const toggleArr = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

    const filtered = OLF_KNOW.aromas.filter(a => {
      if (familiaFilter.length > 0 && !familiaFilter.includes(a.familia)) return false;
      if (sublineaFilter.length > 0 && !sublineaFilter.includes(a.sublinea)) return false;
      if (soloNicho && !a.flags?.nicho) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = [a.nombre, a.familia, ...(a.acordes||[]), a.descripcion].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const selected = filtered.find(a => a.id === selectedId) || OLF_KNOW.aromas.find(a => a.id === selectedId);

    return (
      <div className="siq-picker">
        <div className="siq-picker-head">
          <div className="siq-eyebrow">Override manual · Aroma</div>
          <button className="siq-picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="siq-picker-filters">
          <input
            className="siq-picker-search"
            placeholder="Buscar nombre, acordes, descripción…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="siq-chips-row">
            <span className="siq-chips-label">Familia</span>
            {familias.map(f => (
              <button key={f} className={"siq-chip" + (familiaFilter.includes(f) ? ' is-on' : '')} onClick={() => setFamiliaFilter(arr => toggleArr(arr, f))}>{f}</button>
            ))}
          </div>
          <div className="siq-chips-row">
            <span className="siq-chips-label">Sublínea</span>
            {sublineas.map(s => (
              <button key={s} className={"siq-chip" + (sublineaFilter.includes(s) ? ' is-on' : '')} onClick={() => setSublineaFilter(arr => toggleArr(arr, s))}>{s}</button>
            ))}
            <label className="siq-toggle">
              <input type="checkbox" checked={soloNicho} onChange={e => setSoloNicho(e.target.checked)} />
              Solo nicho
            </label>
          </div>
        </div>
        <div className="siq-picker-list">
          {filtered.length === 0 ? (
            <div className="siq-picker-empty">Sin resultados con esos filtros.</div>
          ) : filtered.map(a => {
            const isSel = selectedId === a.id;
            const acordes = (a.acordes || []).filter(Boolean).slice(0, 3);
            return (
              <div key={a.id} className={"siq-picker-row" + (isSel ? ' is-selected' : '')} onClick={() => setSelectedId(a.id)}>
                <div className="siq-picker-row-main">
                  <span className="siq-picker-row-name">{a.nombre}</span>
                  <span className="siq-picker-row-meta">{a.familia} · {a.sublinea}</span>
                </div>
                {acordes.length > 0 && (
                  <div className="siq-picker-row-acordes">
                    {acordes.map((ac, i) => <span key={i}>{ac}</span>)}
                  </div>
                )}
                {isSel && <span className="siq-picker-check">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="siq-picker-foot">
          <span className="siq-picker-count">{filtered.length} aromas</span>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-download" disabled={!selected} onClick={() => selected && onSelect(selected)}>
            Usar este aroma
          </button>
        </div>
      </div>
    );
  }

  function DifusorPicker({ onSelect, onClose, current }) {
    const [catFilter, setCatFilter] = useState([]);
    const [tamFilter, setTamFilter] = useState([]);
    const [intFilter, setIntFilter] = useState([]);
    const [minCoverage, setMinCoverage] = useState(0);
    const [selectedId, setSelectedId] = useState(current?.key || null);

    const cats = ['Manual basico','Industrial / Profesional','Premium'];
    const tams = ['muy pequeño','pequeño','pequeño-mediano','mediano','mediano-grande','grande','muy grande'];
    const ints = ['baja','media','media-alta','alta'];
    const toggleArr = (arr, v) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

    const filtered = OLF_KNOW.difusores.filter(d => {
      if (catFilter.length > 0 && !catFilter.includes(d.categoria)) return false;
      if (tamFilter.length > 0 && !tamFilter.includes(d.tamano)) return false;
      if (intFilter.length > 0 && !intFilter.includes(d.intensidad)) return false;
      if (minCoverage > 0 && (Number(d.cobertura_max_m2) || 0) < minCoverage) return false;
      return true;
    });
    const selected = filtered.find(d => d.key === selectedId) || OLF_KNOW.difusores.find(d => d.key === selectedId);

    return (
      <div className="siq-picker">
        <div className="siq-picker-head">
          <div className="siq-eyebrow">Override manual · Difusor</div>
          <button className="siq-picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="siq-picker-filters">
          <div className="siq-chips-row">
            <span className="siq-chips-label">Categoría</span>
            {cats.map(c => (
              <button key={c} className={"siq-chip" + (catFilter.includes(c) ? ' is-on' : '')} onClick={() => setCatFilter(arr => toggleArr(arr, c))}>{c}</button>
            ))}
          </div>
          <div className="siq-chips-row">
            <span className="siq-chips-label">Tamaño</span>
            {tams.map(t => (
              <button key={t} className={"siq-chip" + (tamFilter.includes(t) ? ' is-on' : '')} onClick={() => setTamFilter(arr => toggleArr(arr, t))}>{t}</button>
            ))}
          </div>
          <div className="siq-chips-row">
            <span className="siq-chips-label">Intensidad</span>
            {ints.map(i => (
              <button key={i} className={"siq-chip" + (intFilter.includes(i) ? ' is-on' : '')} onClick={() => setIntFilter(arr => toggleArr(arr, i))}>{i}</button>
            ))}
          </div>
          <div className="siq-chips-row">
            <span className="siq-chips-label">Cobertura mínima requerida</span>
            <input type="number" min="0" step="10" value={minCoverage}
              className="siq-picker-num"
              onChange={e => setMinCoverage(Math.max(0, Number(e.target.value) || 0))} />
            <span className="siq-picker-unit">m²</span>
          </div>
        </div>
        <div className="siq-picker-list">
          {filtered.length === 0 ? (
            <div className="siq-picker-empty">Sin difusores con esos filtros.</div>
          ) : filtered.map(d => {
            const isSel = selectedId === d.key;
            return (
              <div key={d.key} className={"siq-picker-row" + (isSel ? ' is-selected' : '')} onClick={() => setSelectedId(d.key)}>
                <div className="siq-picker-row-main">
                  <span className="siq-picker-row-name">{d.modelo}</span>
                  <span className="siq-picker-row-meta">{d.categoria} · {d.tamano} · {d.intensidad}</span>
                </div>
                <div className="siq-picker-row-acordes">
                  <span>{d.cobertura_min_m2}–{d.cobertura_max_m2} m²</span>
                  {d.cotizador_key
                    ? <span>${(Number(d.precio_renta_mxn) || 0).toLocaleString('es-MX')}/mes</span>
                    : <span className="siq-picker-warn">sin precio cargado</span>}
                </div>
                {isSel && <span className="siq-picker-check">✓</span>}
              </div>
            );
          })}
        </div>
        <div className="siq-picker-foot">
          <span className="siq-picker-count">{filtered.length} difusores</span>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-download" disabled={!selected} onClick={() => selected && onSelect(selected)}>
            Usar este difusor
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // Root component
  // ----------------------------------------------------------
  function ScentIQPanel({ onClose, client, onApply }) {
    const [phase, setPhase] = useState('intro'); // intro | analyzing | result | error
    const [file, setFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [analisis, setAnalisis] = useState(null);
    const [output, setOutput] = useState(null);
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);
    const [errMsg, setErrMsg] = useState('');
    const [usingDemo, setUsingDemo] = useState(false);
    const evidenceRef = useRef(null);
    // Modal interno de pre-envio WhatsApp (fallback desktop)
    const [shareData, setShareData] = useState(null); // { imageUrl, blob, text }
    const [copiedImg, setCopiedImg] = useState(false);
    const [copiedTxt, setCopiedTxt] = useState(false);
    // Tipo de espacio · obligatorio antes de analizar. Mapea a profileIndex
    // del mock para que el giro real del cliente nunca quede ignorado.
    const [spaceType, setSpaceType] = useState(null);
    // Overrides manuales del especialista (encima del análisis IA)
    const [aromaOverride, setAromaOverride] = useState(null);
    const [difusorOverride, setDifusorOverride] = useState(null);
    const [aromaPickerOpen, setAromaPickerOpen] = useState(false);
    const [difusorPickerOpen, setDifusorPickerOpen] = useState(false);
    // Overrides visuales (familia, materialidad, tipo de luz). Cuando el
    // ejecutivo cambia uno, rearmamos `output` con buildOutput sobre un
    // analisis fusionado para que la recomendación y el prompt Designer
    // queden coherentes con lo que ve en el slide.
    const [visualOverrides, setVisualOverrides] = useState(null);
    const [analisisBase, setAnalisisBase] = useState(null);

    const close = () => { onClose && onClose(); };

    const startAnalysis = async (a, opts = {}) => {
      setPhase('analyzing');
      try {
        // Si recibimos analisis directo (demo) lo usamos; si no, llamamos al adapter.
        let an = a;
        if (!an) {
          an = await OLF_IA.analyzeImage(opts.file || null, opts.adapterOpts);
        }
        // Si el ejecutivo siguió sin foto, marcamos el resultado como
        // estimado total para que el slide del deck lo declare.
        if (opts.markEstimadoTotal) an = { ...an, _estimadoTotal: true };
        const out = OLF_IA.buildOutput(an);
        const v = OLF_IA.schemaValidate(out);
        if (!v.ok) {
          throw new Error('Output inválido: ' + v.errors.join(', '));
        }
        setAnalisis(an);
        setAnalisisBase(an);
        setVisualOverrides(null);
        setOutput(out);
        setPhase('result');
      } catch (e) {
        console.error(e);
        setErrMsg(e.message || String(e));
        setPhase('error');
      }
    };

    const onFile = (f) => {
      setFile(f);
      if (previewURL) URL.revokeObjectURL(previewURL);
      const url = URL.createObjectURL(f);
      setPreviewURL(url);
      setUsingDemo(false);
      // Pasamos profileIndex del giro al adapter para fijar el perfil mock.
      startAnalysis(null, { file: f, adapterOpts: { profileIndex: profileIndexForSpace(spaceType) } });
    };

    const onAnalyzeWithoutPhoto = () => {
      const pi = profileIndexForSpace(spaceType);
      if (pi == null) return;
      setFile(null);
      if (previewURL) { URL.revokeObjectURL(previewURL); setPreviewURL(null); }
      setUsingDemo(false);
      startAnalysis(null, { file: null, adapterOpts: { profileIndex: pi }, markEstimadoTotal: true });
    };

    const onUseDemo = async () => {
      setUsingDemo(true);
      const demo = await readDemo();
      if (!demo) {
        setErrMsg('No se pudo cargar scent-iq-demo.json');
        setPhase('error');
        return;
      }
      startAnalysis(demo.analisis);
    };

    // Aplica un override visual y regenera el output completo con
    // buildOutput sobre el analisis fusionado, así la recomendación
    // y el prompt Designer reflejan lo que el especialista corrigió.
    const applyVisualOverride = (patch) => {
      const next = { ...(visualOverrides || {}), ...patch };
      // Limpia entradas vacías
      Object.keys(next).forEach(k => { if (next[k] === '' || next[k] == null) delete next[k]; });
      setVisualOverrides(Object.keys(next).length ? next : null);
      if (!analisisBase) return;
      const merged = { ...analisisBase, ...next, _visualOverride: Object.keys(next).length > 0 };
      try {
        const out = OLF_IA.buildOutput(merged);
        const v = OLF_IA.schemaValidate(out);
        if (v.ok) {
          setAnalisis(merged);
          setOutput(out);
        }
      } catch (e) { console.error('rebuild output failed', e); }
    };

    const clearVisualOverrides = () => {
      setVisualOverrides(null);
      if (!analisisBase) return;
      const out = OLF_IA.buildOutput(analisisBase);
      setAnalisis(analisisBase);
      setOutput(out);
    };

    const onCopyPrompt = async () => {
      try { await copyToClipboard(output.designer.prompt_final); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (e) { console.error('copy failed', e); }
    };

    const onExport = () => {
      const stamp = new Date().toISOString().slice(0, 10);
      const clientSlug = (client?.clientName || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      downloadJson(`scent-iq_${clientSlug}_${stamp}.json`, output);
    };

    const onApplyToCotizacion = async () => {
      if (!output) return;
      // Convertir el archivo subido a dataURL para que la foto del
      // slide del deck sobreviva refresh (blob: URLs son session-scoped).
      let dataURL = null;
      if (file) {
        try {
          dataURL = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = e => res(e.target.result);
            fr.onerror = rej;
            fr.readAsDataURL(file);
          });
        } catch (_) { /* si falla, dejamos el blob URL como mejor esfuerzo */ }
      }

      // Aplicar overrides manuales (deep clone para no mutar el state).
      // CRITICO: reemplaza TODOS los campos derivados del aroma/difusor
      // (familia, subacorde, descripcion, notas, intensidad, cobertura...)
      // para que el slide #08 y el WhatsApp sean coherentes con el catalogo.
      const base = JSON.parse(JSON.stringify(output));
      base.estrategia_olfativa = base.estrategia_olfativa || {};
      base.difusion = base.difusion || {};
      base._meta = base._meta || {};

      if (aromaOverride) {
        const ao = aromaOverride;
        base.estrategia_olfativa.aroma_principal      = ao.nombre || '';
        base.estrategia_olfativa.familia_olfativa     = ao.familia || base.estrategia_olfativa.familia_olfativa || '';
        base.estrategia_olfativa.subacorde_olfativo   = (ao.acordes || []).filter(Boolean).join(' + ') || base.estrategia_olfativa.subacorde_olfativo || '';
        base.estrategia_olfativa.descripcion_principal = ao.descripcion || '';
        base.estrategia_olfativa.notas_principal      = ao.notas || null;
        base.estrategia_olfativa.inspiracion_principal = ao.inspiracion || null;
        base._meta.aroma_principal_full = { ...ao, manual_override: true };
      }
      if (difusorOverride) {
        const dor = difusorOverride;
        base.difusion.difusor_recomendado = dor.modelo || '';
        base.difusion.difusor_key         = dor.key || null;
        base.difusion.cotizador_key       = dor.cotizador_key || null;
        // intensidad se sobreescribe; cantidad y ubicacion_sugerida quedan
        // como las calculo la IA segun m² del espacio (las mantenemos).
        base.difusion.intensidad          = dor.intensidad || base.difusion.intensidad || '';
        base._meta.difusor_full = {
          modelo:           dor.modelo,
          cobertura_min_m2: dor.cobertura_min_m2,
          cobertura_max_m2: dor.cobertura_max_m2,
          configuracion:    dor.configuracion,
          nivel_premium:    dor.nivel_premium,
          imagen_url:       dor.imagen_url,
          url_producto:     dor.url_producto,
          precio_renta_mxn: dor.precio_renta_mxn,
          categoria:        dor.categoria,
          tamano:           dor.tamano,
          intensidad:       dor.intensidad,
          manual_override:  true
        };
        base._meta.difusor_key     = dor.key || null;
        base._meta.cotizador_key   = dor.cotizador_key || null;
      }
      base._meta.manual_overrides = {
        aroma:   !!aromaOverride,
        difusor: !!difusorOverride,
        visual:  !!(visualOverrides && Object.keys(visualOverrides).length)
      };
      base._meta.space_type    = spaceType || null;
      base._meta.estimadoTotal = analisis?._estimadoTotal === true || !file;
      base._meta.previewURL = dataURL || previewURL || null;

      const payload = {
        difusorKey:  base._meta.cotizador_key,           // null si no priced
        difusorName: base.difusion.difusor_recomendado,
        aromaKey:    base._meta.aroma_principal_full?.key || null,
        aromaName:   base.estrategia_olfativa.aroma_principal,
        cantidad:    base.difusion.cantidad,
        fromScentIQ: true,
        full: base
      };
      onApply && onApply(payload);
      setApplied(true);
      try {
        window.dispatchEvent(new CustomEvent('olfativa:scent-applied', { detail: payload }));
      } catch (_) {}
      setTimeout(() => { onClose && onClose(); }, 900);
    };

    const onShareWhatsApp = async () => {
      if (!output || !evidenceRef.current) return;
      const text = buildScentNarrative(output, client);
      try {
        // 1. Capturar la foto/overlay (.siq-designer) como PNG
        const node = evidenceRef.current.querySelector('.siq-designer') || evidenceRef.current;
        if (typeof window.html2canvas !== 'function') {
          throw new Error('html2canvas no disponible');
        }
        const canvas = await window.html2canvas(node, {
          backgroundColor: '#f4ede0',
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: node.scrollWidth,
          windowHeight: node.scrollHeight
        });
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
        if (!blob) throw new Error('canvas.toBlob devolvió null');
        const imageUrl = URL.createObjectURL(blob);

        // 2. Mobile/Mac con WhatsApp app: share sheet nativo del SO
        const file = new File([blob], 'olfativa-analisis.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text, title: 'Recomendación olfativa Olfativa' });
            URL.revokeObjectURL(imageUrl);
            return;
          } catch (shareErr) {
            if (shareErr && shareErr.name === 'AbortError') { URL.revokeObjectURL(imageUrl); return; }
            console.warn('navigator.share falló, abro modal interno', shareErr);
          }
        }

        // 3. Desktop fallback: modal interno con preview + 3 acciones
        setShareData({ imageUrl, blob, text });
      } catch (err) {
        console.error('share failed', err);
        alert('No se pudo generar la imagen. Intenta de nuevo.');
      }
    };

    const copyImageToClipboard = async () => {
      if (!shareData) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareData.blob })]);
        setCopiedImg(true);
        setTimeout(() => setCopiedImg(false), 2000);
      } catch (err) {
        console.error('clipboard image failed', err);
        downloadImage();
        alert('Tu navegador no permite copiar imágenes al portapapeles. Descargamos el PNG para que lo adjuntes manualmente.');
      }
    };

    const copyTextToClipboard = async () => {
      if (!shareData) return;
      try {
        await navigator.clipboard.writeText(shareData.text);
        setCopiedTxt(true);
        setTimeout(() => setCopiedTxt(false), 2000);
      } catch (err) {
        console.error('clipboard text failed', err);
      }
    };

    const downloadImage = () => {
      if (!shareData) return;
      const cliente = (client?.clientName || 'cliente').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const a = document.createElement('a');
      a.href = shareData.imageUrl;
      a.download = `olfativa-${cliente}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    };

    const openWhatsAppWeb = () => {
      window.open('https://web.whatsapp.com/', '_blank', 'noopener,noreferrer');
    };

    const closeShare = () => {
      if (shareData?.imageUrl) URL.revokeObjectURL(shareData.imageUrl);
      setShareData(null);
      setCopiedImg(false);
      setCopiedTxt(false);
    };

    const onReset = () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
      setFile(null); setPreviewURL(null); setAnalisis(null); setOutput(null);
      setUsingDemo(false); setApplied(false); setPhase('intro');
      setSpaceType(null);
      setVisualOverrides(null); setAnalisisBase(null);
      setAromaOverride(null); setDifusorOverride(null);
    };

    const principalFull = output?._meta?.aroma_principal_full;
    const alternativoFull = output?._meta?.aroma_alternativo_full;

    return (
      <div className="picker-overlay" onClick={close}>
        <div className="picker-modal scent-iq-modal" onClick={e => e.stopPropagation()}>
          <div className="picker-header">
            <div>
              <div className="picker-eyebrow">Scent Advisor · análisis por foto</div>
              <h2 className="picker-title">Recomendación olfativa para {client?.clientName || 'el cliente'}</h2>
              <div className="picker-sub">
                Sube una foto del espacio. El sistema lee la imagen, mapea la familia decorativa, propone aroma y difusor del catálogo y genera el prompt listo para Microsoft Designer.
              </div>
            </div>
            <button className="picker-close" onClick={close} title="Cerrar">×</button>
          </div>

          <div className="picker-body siq-body">

            {/* INTRO */}
            {phase === 'intro' && (
              <ImageUploader
                previewURL={previewURL}
                onFile={onFile}
                onUseDemo={onUseDemo}
                onAnalyzeWithoutPhoto={onAnalyzeWithoutPhoto}
                disabled={false}
                spaceType={spaceType}
                onSpaceType={setSpaceType}
              />
            )}

            {/* ANALYZING */}
            {phase === 'analyzing' && (
              <div className="siq-analyzing">
                {previewURL && <img src={previewURL} alt="preview" className="siq-analyzing-img" />}
                <div className="siq-analyzing-text">
                  <div className="siq-spinner" />
                  <div className="siq-eyebrow">Analizando espacio</div>
                  <div className="siq-step">Lectura visual · familias decorativas · matriz olfativa · catálogo</div>
                </div>
              </div>
            )}

            {/* RESULT */}
            {phase === 'result' && output && (
              <div className="siq-result">
                {analisis?._warning && (
                  <div className="siq-warning">
                    <b>⚠ Vision mock:</b> {analisis._warning}
                  </div>
                )}

                <PhotoEvidenceCard ref={evidenceRef} previewURL={previewURL} analisis={analisis} output={output} />

                {/* Override visual · permite al especialista corregir
                    la lectura del motor (familia, materialidad, luz)
                    y regenera la recomendación olfativa coherente. */}
                <VisualOverridesPanel
                  analisis={analisis}
                  overrides={visualOverrides}
                  onChange={applyVisualOverride}
                  onClear={clearVisualOverrides}
                />

                <div className="siq-grid">
                  <VisualAnalysisCard a={analisis} />

                  <div className="siq-card-stack">
                    {aromaOverride && (
                      <div className="siq-override-banner">⚙ Override manual · aroma seleccionado por el especialista</div>
                    )}
                    <OlfactoryRecommendationCard
                      est={aromaOverride ? { ...output.estrategia_olfativa, aroma_principal: aromaOverride.nombre } : output.estrategia_olfativa}
                      principalFull={aromaOverride || principalFull}
                      alternativoFull={alternativoFull}
                    />
                    <div className="siq-override-actions">
                      <button className="siq-override-btn" onClick={() => setAromaPickerOpen(v => !v)}>
                        {aromaPickerOpen ? '✕ Cancelar' : (aromaOverride ? '↻ Cambiar selección' : '⌖ Cambiar aroma manualmente')}
                      </button>
                      {aromaOverride && (
                        <button className="siq-override-clear" onClick={() => setAromaOverride(null)}>
                          Volver al recomendado
                        </button>
                      )}
                    </div>
                    {aromaPickerOpen && (
                      <AromaPicker
                        current={aromaOverride}
                        onSelect={(a) => { setAromaOverride(a); setAromaPickerOpen(false); }}
                        onClose={() => setAromaPickerOpen(false)}
                      />
                    )}
                  </div>

                  <div className="siq-card-stack">
                    {difusorOverride && (
                      <div className="siq-override-banner">⚙ Override manual · difusor seleccionado por el especialista</div>
                    )}
                    <DiffuserRecommendationCard
                      dif={difusorOverride
                        ? {
                            ...output.difusion,
                            difusor_recomendado: difusorOverride.modelo,
                            difusor_key: difusorOverride.key,
                            cotizador_key: difusorOverride.cotizador_key || null,
                            _meta: difusorOverride
                          }
                        : { ...output.difusion, _meta: output._meta?.difusor_full }
                      }
                    />
                    <div className="siq-override-actions">
                      <button className="siq-override-btn" onClick={() => setDifusorPickerOpen(v => !v)}>
                        {difusorPickerOpen ? '✕ Cancelar' : (difusorOverride ? '↻ Cambiar selección' : '⌖ Cambiar difusor manualmente')}
                      </button>
                      {difusorOverride && (
                        <button className="siq-override-clear" onClick={() => setDifusorOverride(null)}>
                          Volver al recomendado
                        </button>
                      )}
                    </div>
                    {difusorPickerOpen && (
                      <DifusorPicker
                        current={difusorOverride}
                        onSelect={(d) => { setDifusorOverride(d); setDifusorPickerOpen(false); }}
                        onClose={() => setDifusorPickerOpen(false)}
                      />
                    )}
                  </div>

                  <DesignerPromptCard designer={output.designer} onCopy={onCopyPrompt} copied={copied} />
                </div>

                <div className="siq-summary">
                  <div className="siq-eyebrow">Resumen comercial</div>
                  <p>{output.resumen_comercial}</p>
                </div>

                <JsonOutput output={output} />

                <div className="siq-actions">
                  <button className="btn-secondary" onClick={onReset}>↻ Analizar otro espacio</button>
                  <button className="btn-secondary" onClick={onExport}>↓ Exportar JSON</button>
                  <button className="btn-secondary siq-whatsapp" onClick={onShareWhatsApp}>
                    Enviar por WhatsApp
                  </button>
                  <button
                    className={"btn-download" + (applied ? ' btn-download-confirm' : '')}
                    onClick={onApplyToCotizacion}
                    disabled={applied}
                    title={!output._meta?.cotizador_key ? 'El difusor recomendado no tiene precio cargado; igual se agrega el aroma.' : ''}
                  >
                    {applied
                      ? '✓ Aplicado a la cotización'
                      : (output._meta?.cotizador_key
                          ? `Usar en esta cotización · ${output.difusion.difusor_recomendado} + ${output.estrategia_olfativa.aroma_principal}`
                          : `Usar (sin precio cargado) · ${output.estrategia_olfativa.aroma_principal}`)
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {phase === 'error' && (
              <div className="siq-error">
                <div className="siq-eyebrow">No se pudo procesar</div>
                <p>{errMsg}</p>
                <button className="btn-secondary" onClick={onReset}>Reintentar</button>
              </div>
            )}

          </div>
        </div>

        {shareData && (
          <div className="siq-share-overlay" onClick={closeShare}>
            <div className="siq-share-modal" onClick={e => e.stopPropagation()}>
              <div className="siq-share-head">
                <div className="siq-eyebrow">Compartir por WhatsApp</div>
                <h3>Enviar análisis a tu cliente</h3>
                <p>WhatsApp no permite adjuntar imágenes desde un link. Hazlo en 3 pasos:</p>
                <button className="siq-share-close" onClick={closeShare} aria-label="Cerrar">×</button>
              </div>

              <div className="siq-share-body">
                <div className="siq-share-preview">
                  <img src={shareData.imageUrl} alt="Análisis sensorial" />
                </div>
                <div className="siq-share-text">
                  <label>Texto que se enviará:</label>
                  <textarea readOnly value={shareData.text} rows={14} />
                </div>
              </div>

              <div className="siq-share-steps">
                <button className="siq-share-step" onClick={copyImageToClipboard}>
                  <span className="siq-share-step-num">1</span>
                  <span className="siq-share-step-label">{copiedImg ? '✓ Copiada' : 'Copiar imagen'}</span>
                  <span className="siq-share-step-hint">Luego pega en WhatsApp con Cmd/Ctrl+V</span>
                </button>
                <button className="siq-share-step" onClick={copyTextToClipboard}>
                  <span className="siq-share-step-num">2</span>
                  <span className="siq-share-step-label">{copiedTxt ? '✓ Copiado' : 'Copiar texto'}</span>
                  <span className="siq-share-step-hint">Pégalo como mensaje</span>
                </button>
                <button className="siq-share-step siq-share-step-go" onClick={openWhatsAppWeb}>
                  <span className="siq-share-step-num">3</span>
                  <span className="siq-share-step-label">Abrir WhatsApp Web</span>
                  <span className="siq-share-step-hint">Elige el contacto y pega</span>
                </button>
              </div>

              <div className="siq-share-alt">
                <button className="btn-secondary" onClick={downloadImage}>↓ Descargar imagen PNG</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  W.ScentIQPanel = ScentIQPanel;
})(window);
