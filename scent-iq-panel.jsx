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
  const { useState, useMemo, useRef, useCallback } = W.React;

  // ----------------------------------------------------------
  // helpers
  // ----------------------------------------------------------
  function readDemo() {
    return fetch('scent-iq-demo.json?v=20260513c').then(r => r.ok ? r.json() : null).catch(() => null);
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
  // Photo evidence — foto subida + overlay estilo Designer
  // (título + 4 labels infografía + dirección olfativa + logo)
  // ----------------------------------------------------------
  // Strategy: el overlay simula el output del prompt Designer
  // SIN llamar a la API generativa: aplica color grading cálido,
  // título "sensory space Analysis", 4 labels al borde apuntando
  // con líneas SVG a anchors aproximados, y firma olfativa abajo.
  function PhotoEvidenceCard({ previewURL, analisis, output }) {
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

    const aromaName = output.estrategia_olfativa.aroma_principal;
    const familiaOlf = output.estrategia_olfativa.familia_olfativa;
    const subacorde = output.estrategia_olfativa.subacorde_olfativo;
    const mats = Array.isArray(analisis.materiales_principales)
      ? analisis.materiales_principales.slice(0, 3).join(', ')
      : '';
    const brief = [
      `Este espacio se lee como ${fv ? fv.nombre.toLowerCase() : 'ambiguo'}${mats ? `: ${mats}` : ''}.`,
      analisis.emocion_deseada ? `Buscamos ${String(analisis.emocion_deseada).toLowerCase()}.` : '',
      `Por eso la dirección olfativa es ${familiaOlf}, encarnada en ${aromaName}.`
    ].filter(Boolean).join(' ');

    // 4 etiquetas infografía. Cada una: posición del texto + anchor
    // donde apunta la línea (en % del frame). Posiciones por defecto
    // genéricas que funcionan razonablemente para fotos de interiores.
    const overlayLabels = [
      { text: pretty(analisis.tipo_de_luz, 'Natural daylight flow'),                txt: { x: 24, y: 30 }, anc: { x: 42, y: 18 } },
      { text: pretty(fv ? `Sophisticated ${fv.nombre.toLowerCase()}` : analisis.materialidad, 'Sophisticated palette'), txt: { x: 78, y: 26 }, anc: { x: 70, y: 26 } },
      { text: pretty(analisis.materialidad, 'Organic material palette'),            txt: { x: 24, y: 60 }, anc: { x: 42, y: 56 } },
      { text: pretty(analisis.formas, 'Soft architectural curves'),                 txt: { x: 78, y: 70 }, anc: { x: 60, y: 70 } }
    ];

    // Footer izquierdo: 2 líneas tipo "Olfactive direction: X / Y"
    const olfactiveLines = [
      `Olfactive direction · ${familiaOlf}`,
      subacorde && subacorde !== 'requiere validación' ? subacorde : `${aromaName} accord`
    ].filter(Boolean);

    const frameStyle = aspect ? { aspectRatio: String(aspect) } : { aspectRatio: '16 / 10' };

    return (
      <div className="siq-evidence">
        {previewURL ? (
          <div className="siq-photo-frame" style={frameStyle}>
            <img src={previewURL} className="siq-evidence-img" alt="Espacio del cliente" onLoad={onImgLoad} />
            <div className="siq-overlay-warm" />

            <div className="siq-overlay-title">
              <div className="siq-overlay-title-main">sensory space Analysis</div>
              <div className="siq-overlay-title-sub">Visual reading and olfactory direction</div>
            </div>

            <svg className="siq-overlay-lines" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden="true">
              {overlayLabels.map((L, i) => (
                <g key={i}>
                  <line x1={L.txt.x} y1={L.txt.y} x2={L.anc.x} y2={L.anc.y} stroke="rgba(255,255,255,0.85)" strokeWidth="0.18" vectorEffect="non-scaling-stroke" />
                  <circle cx={L.anc.x} cy={L.anc.y} r="0.55" fill="rgba(255,255,255,0.95)" vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </svg>

            {overlayLabels.map((L, i) => (
              <div
                key={i}
                className={"siq-overlay-label siq-overlay-label-" + (i + 1)}
                style={{ left: L.txt.x + '%', top: L.txt.y + '%' }}
              >
                {L.text}
              </div>
            ))}

            <div className="siq-overlay-direction">
              {olfactiveLines.map((line, i) => <div key={i}>{line}</div>)}
            </div>

            <div className="siq-overlay-logo" title="Olfativa">
              <span>O</span>
            </div>
          </div>
        ) : (
          <div className="siq-evidence-photo" style={{ aspectRatio: '16 / 10' }}>
            <div className="siq-evidence-placeholder">
              Análisis demo · sin imagen de origen
            </div>
          </div>
        )}

        <div className="siq-evidence-body">
          <div className="siq-card-eyebrow">Foto de origen</div>
          {caption && <div className="siq-evidence-caption">{caption}</div>}
          <p className="siq-evidence-brief">{brief}</p>
        </div>
      </div>
    );
  }

  // helper local: trim + fallback si valor está vacío
  function pretty(v, fallback) {
    const s = (v == null ? '' : String(v)).trim();
    if (!s || s === '—') return fallback;
    // capitalizar primera letra
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
        full: output
      };
      onApply && onApply(payload);
      setApplied(true);
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

                <PhotoEvidenceCard previewURL={previewURL} analisis={analisis} output={output} />

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
