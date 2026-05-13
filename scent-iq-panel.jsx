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
  // helpers
  // ----------------------------------------------------------
  function readDemo() {
    return fetch('scent-iq-demo.json?v=20260513h').then(r => r.ok ? r.json() : null).catch(() => null);
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
  function buildScentNarrative(output, client) {
    const o = output;
    const av = o.analisis_visual || {};
    const lectura = o.lectura_emocional || {};
    const est = o.estrategia_olfativa || {};
    const dif = o.difusion || {};
    const cliente = client?.clientName || 'cliente';

    const fvName = (OLF_KNOW.familiasVisuales.find(f => f.id === av.familia_visual) || {}).nombre
      || av.familia_visual || 'el carácter del espacio';
    const aroma = est.aroma_principal || 'el aroma recomendado';
    const familiaOlf = est.familia_olfativa || '';
    const direccion = est.subacorde_olfativo || '';
    const luz = av.tipo_de_luz || '';
    const temp = av.temperatura_visual || '';
    const paleta = av.paleta_dominante || '';
    const materiales = av.materialidad
      || (Array.isArray(av.materiales_principales) ? av.materiales_principales.join(', ') : '');
    const formas = av.formas || av.geometria || '';
    const densidad = av.densidad || '';
    const emocion = lectura.emocion_deseada || av.emocion_deseada || av.emocion_actual || '';
    const difusor = dif.difusor_recomendado || '';
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
        `visual y olfativamente se conectan con notas ${familiaOlf ? String(familiaOlf).toLowerCase() : 'congruentes con la paleta'}, ` +
        `que prolongan la sensación de la madera, la piedra y los textiles en el aire.`
      );
    }
    if (paleta) {
      lineas.push(
        `La paleta ${String(paleta).toLowerCase()} pide un perfume de baja saturación y alta profundidad — ` +
        `exactamente lo que entrega *${aroma}*.`
      );
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
    lineas.push('');
    if (emocion) {
      lineas.push(
        `La emoción deseada — *${emocion}* — encuentra en ${aroma} su contraparte olfativa: ` +
        `${direccion ? `una dirección ${String(direccion).toLowerCase()}` : 'una composición congruente'} ` +
        `que sostiene la atmósfera buscada sin imponerse.`
      );
    }
    lineas.push('');
    lineas.push(
      `*Recomendación final:* ${aroma}` +
      `${familiaOlf ? ` (familia ${String(familiaOlf).toLowerCase()})` : ''}, ` +
      `difundido con ${difusor || 'el equipo recomendado'}` +
      `${cant ? ` (${cant} unidad${cant > 1 ? 'es' : ''})` : ''}.`
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
  function ImageUploader({ previewURL, onFile, onUseDemo, disabled }) {
    const inputRef = useRef(null);
    const [drag, setDrag] = useState(false);

    const onDrop = useCallback((e) => {
      e.preventDefault(); setDrag(false);
      const f = e.dataTransfer.files?.[0];
      if (f && /^image\//.test(f.type)) onFile(f);
    }, [onFile]);

    return (
      <div className="siq-uploader">
        <div
          className={"siq-drop" + (drag ? ' is-drag' : '') + (previewURL ? ' has-preview' : '')}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          {previewURL ? (
            <img src={previewURL} alt="preview" className="siq-preview" />
          ) : (
            <>
              <div className="siq-drop-icon">⬆</div>
              <div className="siq-drop-title">Sube una foto del espacio</div>
              <div className="siq-drop-sub">Arrastra una imagen aquí, o haz click para seleccionar (JPG · PNG)</div>
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
          <button className="btn-secondary" onClick={onUseDemo} disabled={disabled}>
            ▶ Usar análisis demo
          </button>
          <span className="siq-uploader-note">
            Adapter actual: <b>mock</b> · genera análisis razonable para validar el flujo. Conectar vision real desde <code>scent-iq-engines.js</code>.
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

    const leftBullets = [
      { k: 'Iluminación', v: pretty(analisis.tipo_de_luz, '—') },
      { k: 'Materiales',  v: pretty(analisis.materialidad, '—') },
      { k: 'Geometría',   v: pretty(analisis.formas, '—') },
      { k: 'Aroma',       v: aromaName || '—' }
    ];
    const rightBullets = [
      { k: 'Dirección olfativa', v: subacorde && subacorde !== 'requiere validación' ? `${familiaOlf} · ${subacorde}` : familiaOlf },
      { k: 'Familia visual',     v: familiaVisualName },
      { k: 'Densidad',           v: pretty(analisis.densidad, '—') },
      { k: 'Estilo',             v: 'minimalista premium' }
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

    const close = () => { onClose && onClose(); };

    const startAnalysis = async (a, opts = {}) => {
      setPhase('analyzing');
      try {
        // Si recibimos analisis directo (demo) lo usamos; si no, llamamos al adapter.
        let an = a;
        if (!an) {
          an = await OLF_IA.analyzeImage(opts.file || null, opts.adapterOpts);
        }
        const out = OLF_IA.buildOutput(an);
        const v = OLF_IA.schemaValidate(out);
        if (!v.ok) {
          throw new Error('Output inválido: ' + v.errors.join(', '));
        }
        setAnalisis(an);
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
      startAnalysis(null, { file: f });
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

    const onCopyPrompt = async () => {
      try { await copyToClipboard(output.designer.prompt_final); setCopied(true); setTimeout(() => setCopied(false), 1500); }
      catch (e) { console.error('copy failed', e); }
    };

    const onExport = () => {
      const stamp = new Date().toISOString().slice(0, 10);
      const clientSlug = (client?.clientName || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
      downloadJson(`scent-iq_${clientSlug}_${stamp}.json`, output);
    };

    const onApplyToCotizacion = () => {
      if (!output) return;
      const meta = output._meta || {};
      const payload = {
        difusorKey:  meta.cotizador_key,           // null si no priced
        difusorName: output.difusion.difusor_recomendado,
        aromaKey:    meta.aroma_principal_full?.key || null,
        aromaName:   output.estrategia_olfativa.aroma_principal,
        cantidad:    output.difusion.cantidad,
        fromScentIQ: true,
        full: output
      };
      onApply && onApply(payload);
      setApplied(true);
      // Toast + apertura automatica del panel Precios (lo gestiona el cotizador via evento global)
      try {
        window.dispatchEvent(new CustomEvent('olfativa:scent-applied', { detail: payload }));
      } catch (_) {}
      // Auto-cerrar el modal para que el usuario vea donde quedo
      setTimeout(() => { onClose && onClose(); }, 900);
    };

    const onShareWhatsApp = async () => {
      if (!output || !evidenceRef.current) return;
      const texto = buildScentNarrative(output, client);
      const cliente = (client?.clientName || 'cliente').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const fileName = `Olfativa-${cliente}.png`;

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
        const file = new File([blob], fileName, { type: 'image/png' });

        // 2. Web Share API con archivos (Android / iOS / Mac con WhatsApp)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Recomendación olfativa Olfativa',
              text: texto
            });
            return;
          } catch (shareErr) {
            if (shareErr && shareErr.name === 'AbortError') return; // usuario cancelo
            console.warn('navigator.share falló, caigo al fallback', shareErr);
          }
        }

        // 3. Fallback desktop: descarga PNG + copia texto al portapapeles + abre wa.me
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 800);

        try { await navigator.clipboard.writeText(texto); } catch (_) {}

        // Toast con instruccion clara antes de abrir wa.me
        try {
          window.dispatchEvent(new CustomEvent('olfativa:scent-applied', {
            detail: { __toast: 'Imagen descargada + texto copiado. Adjunta la imagen en WhatsApp y pega el texto.' }
          }));
        } catch (_) {}

        setTimeout(() => {
          window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener,noreferrer');
        }, 300);
      } catch (err) {
        console.error('share failed', err);
        // ultimo recurso: solo abrir wa.me con el texto
        try { await navigator.clipboard.writeText(texto); } catch (_) {}
        window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener,noreferrer');
      }
    };

    const onReset = () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
      setFile(null); setPreviewURL(null); setAnalisis(null); setOutput(null);
      setUsingDemo(false); setApplied(false); setPhase('intro');
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
                disabled={false}
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

                <div className="siq-grid">
                  <VisualAnalysisCard a={analisis} />
                  <OlfactoryRecommendationCard est={output.estrategia_olfativa} principalFull={principalFull} alternativoFull={alternativoFull} />
                  <DiffuserRecommendationCard dif={{...output.difusion, _meta: output._meta?.difusor_full}} />
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
      </div>
    );
  }

  W.ScentIQPanel = ScentIQPanel;
})(window);
