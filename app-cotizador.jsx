/* global React, ReactDOM */
// app-cotizador.jsx
// Cotizador Olfativa — armador interactivo de propuestas.
//
// UI standalone (no depende de claude.ai/design):
//  - Top bar siempre visible: logo, cliente, selector, imprimir
//  - Selector visual overlay: grid de 11 láminas con miniaturas
//  - Por lámina: incluir/excluir + segmento de copy + reordenar
//  - Persistencia en localStorage (sobrevive refresh)

const { useEffect, useMemo, useState, useRef } = React;

const SEGMENTS = window.SEGMENTS;
const PALETTE = window.PALETTE;
const {
  SlideCover, SlidePromise, SlidePillars, SlideMethod, SlideAroma,
  SlideCatalog, SlideQuote, SlideCuradora, SlideCompliance, SlideTrust, SlideClose,
} = window;

const SLIDE_RENDERERS = {
  cover: SlideCover, promise: SlidePromise, pillars: SlidePillars,
  curadora: SlideCuradora, method: SlideMethod, aroma: SlideAroma,
  catalog: SlideCatalog, quote: SlideQuote,
  compliance: SlideCompliance, trust: SlideTrust, close: SlideClose,
};

const SLIDE_LABELS = {
  cover: "Portada",
  promise: "Posicionamiento",
  pillars: "Pilares de valor",
  curadora: "Curaduría · Manuela",
  method: "Metodología (6 fases)",
  aroma: "Arquitectura olfativa",
  catalog: "Catálogo de equipos",
  quote: "Cotización · alcance",
  compliance: "Cumplimiento",
  trust: "Confianza · cliente",
  close: "Cierre",
};

const SLIDE_DESCRIPTIONS = {
  cover: "Saludo · datos del cliente · ID propuesta",
  promise: "Por qué Olfativa · estadística clave",
  pillars: "Las garantías que sostienen la propuesta",
  curadora: "Manuela P. Fleischhacker · 30+ años de oficio",
  method: "Las fases que eliminan la incertidumbre",
  aroma: "Tiers olfativos · arquitectura por zona",
  catalog: "Los difusores que operamos · precios por mes",
  quote: "Alcance económico · términos · entregables",
  compliance: "IFRA · ISO · EcoCert · Grand Cru de Grasse",
  trust: "Quote del cliente referencia",
  close: "Cierre · próximo paso · vigencia",
};

// Qué segmentos contienen cada tipo de slide
const SLIDE_SEGMENTS = (() => {
  const map = {};
  Object.keys(SLIDE_RENDERERS).forEach(k => { map[k] = []; });
  ['longtail','core','key','enterprise','master'].forEach(seg => {
    const s = SEGMENTS[seg];
    if (!s) return;
    s.slides.forEach(kind => {
      if (map[kind] && !map[kind].includes(seg)) map[kind].push(seg);
    });
  });
  return map;
})();

const SEG_LABEL = {
  longtail: "Long Tail · 1-2 difusores",
  core: "Core · 3-9 difusores",
  key: "Key · 10-49 difusores",
  enterprise: "Enterprise · 50+",
  master: "Master · librería completa",
};
const SEG_SHORT = {
  longtail: "Long Tail", core: "Core", key: "Key",
  enterprise: "Enterprise", master: "Master",
};
const SEG_COLOR = {
  longtail: "#7BA7C9", core: "#8FB37E",
  key: "#C7A668", enterprise: "#C2776B",
  master: "#9B8AA8",
};

// Devuelve photo URL de la lámina para usar como thumbnail
function thumbFor(kind, seg) {
  const s = SEGMENTS[seg] || SEGMENTS.master;
  if (s.photos && s.photos[kind]) return s.photos[kind];
  // fallback al master, luego a cualquier segmento que tenga la foto
  const m = SEGMENTS.master;
  if (m.photos && m.photos[kind]) return m.photos[kind];
  for (const k of ['key','enterprise','core','longtail']) {
    const seg2 = SEGMENTS[k];
    if (seg2.photos && seg2.photos[kind]) return seg2.photos[kind];
  }
  return null;
}

// ── Default cotización: master completo ──────────────────────
function defaultSelected() {
  return SEGMENTS.master.slides.map((kind, i) => ({
    uid: `s${i}-${kind}`,
    kind,
    segment: 'master',
    enabled: true,
  }));
}

// ── Persistencia ─────────────────────────────────────────────
const LS_KEY = "olfativa.cotizador.v2";
const loadState = () => {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
};
const saveState = (s) => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} };

const CLIENT_DEFAULTS = {
  clientName: "Cliente",
  propId: "PROP-2026-001",
  propDate: "01 MAY 2026",
  account: "Ejecutivo Olfativa",
  accountEmail: "ventas@olfativa.com",
};

// ============================================================
// App
// ============================================================
function App() {
  const persisted = useMemo(() => loadState(), []);
  const [selected, setSelected] = useState(() =>
    (persisted && Array.isArray(persisted.selected) && persisted.selected.length)
      ? persisted.selected
      : defaultSelected()
  );
  const [client, setClient] = useState(() => ({
    ...CLIENT_DEFAULTS,
    ...(persisted?.client || {}),
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    saveState({ selected, client });
  }, [selected, client]);

  useEffect(() => {
    document.title = `Cotización · ${client.clientName} · ${client.propId}`;
  }, [client.clientName, client.propId]);

  const activeSlides = useMemo(() => selected.filter(s => s.enabled), [selected]);
  const total = activeSlides.length;

  const updateClient = (k, v) => setClient(c => ({ ...c, [k]: v }));

  const print = () => window.print();
  const reset = () => {
    if (!confirm("Restablecer al machote MASTER completo?")) return;
    setSelected(defaultSelected());
  };

  return (
    <>
      <TopBar
        total={total}
        totalAvailable={selected.length}
        client={client}
        onOpenPicker={() => setPickerOpen(true)}
        onOpenClient={() => setClientOpen(true)}
        onPrint={print}
        onReset={reset}
      />

      <div className="deck-area">
        <deck-stage>
          {activeSlides.map((entry, i) => {
            const Renderer = SLIDE_RENDERERS[entry.kind];
            const segObj = SEGMENTS[entry.segment] || SEGMENTS.master;
            if (!Renderer) return null;
            const segLabel = SLIDE_LABELS[entry.kind] || entry.kind;
            const label = `${String(i+1).padStart(2,'0')} ${segLabel}`;
            return (
              <section key={entry.uid} data-screen-label={label} data-om-validate>
                <Renderer
                  segment={segObj}
                  clientName={client.clientName}
                  propId={client.propId}
                  propDate={client.propDate}
                  account={client.account}
                  accountEmail={client.accountEmail}
                  fields={segObj.fields}
                  totalSlides={total}
                  idx={i}
                />
              </section>
            );
          })}
          {activeSlides.length === 0 && (
            <section data-screen-label="00 Vacío" style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'#0E0E0E', color:'#F3EDE3',
              fontFamily:'Inter Tight, sans-serif',
            }}>
              <div style={{ textAlign:'center', padding:48 }}>
                <div style={{ fontSize:80, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', marginBottom:24, color:'#C7A668' }}>
                  Cotización vacía
                </div>
                <div style={{ fontSize:24, opacity:0.6, lineHeight:1.4, marginBottom: 32 }}>
                  Abre el selector de láminas para empezar
                </div>
                <button onClick={() => setPickerOpen(true)} style={{
                  padding: '14px 28px',
                  background: '#C7A668', color: '#0E0E0E',
                  border: 0, borderRadius: 4,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}>
                  Elegir láminas
                </button>
              </div>
            </section>
          )}
        </deck-stage>
      </div>

      {pickerOpen && (
        <SlidePicker
          selected={selected}
          onClose={() => setPickerOpen(false)}
          onApply={(next) => { setSelected(next); setPickerOpen(false); }}
        />
      )}

      {clientOpen && (
        <ClientModal
          client={client}
          onChange={updateClient}
          onClose={() => setClientOpen(false)}
        />
      )}
    </>
  );
}

// ============================================================
// Top Bar — siempre visible
// ============================================================
function TopBar({ total, totalAvailable, client, onOpenPicker, onOpenClient, onPrint, onReset }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-logo">
          Olfativa<span>®</span>
        </div>
        <div className="topbar-divider" />
        <div className="topbar-meta">
          <div className="topbar-meta-eyebrow">Cotización para</div>
          <div className="topbar-client-display">
            <span className="topbar-client-name">{client.clientName}</span>
            <span className="topbar-client-id">· {client.propId}</span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <button className="btn-secondary btn-edit" onClick={onOpenClient} title="Editar nombre del cliente, ID, fecha y ejecutivo">
          <span className="btn-icon">✎</span> Editar cliente
        </button>
        <button className="btn-primary" onClick={onOpenPicker}>
          <span className="btn-icon">▦</span>
          Elegir láminas <span className="btn-counter">{total} / {totalAvailable}</span>
        </button>
        <button className="btn-secondary" onClick={onPrint} title="Imprimir o guardar como PDF">
          <span className="btn-icon">⎙</span> Imprimir
        </button>
        <button className="btn-tertiary" onClick={onReset} title="Restablecer al Master completo">
          ↻
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Slide Picker — overlay visual con grid de láminas
// ============================================================
function SlidePicker({ selected, onClose, onApply }) {
  const [draft, setDraft] = useState(() => selected.map(s => ({ ...s })));
  const [dragKind, setDragKind] = useState(null);
  const [overKind, setOverKind] = useState(null);
  const allKinds = Object.keys(SLIDE_RENDERERS);
  const getRow = (kind) => draft.find(d => d.kind === kind);

  const toggleKind = (kind) => {
    setDraft(prev => {
      const existing = prev.find(d => d.kind === kind);
      if (existing) {
        return prev.map(d => d.kind === kind ? { ...d, enabled: !d.enabled } : d);
      } else {
        return [...prev, {
          uid: `s-${kind}-${Date.now()}`,
          kind, segment: 'master', enabled: true,
        }];
      }
    });
  };

  const setSegmentForKind = (kind, seg) => {
    setDraft(prev => {
      const existing = prev.find(d => d.kind === kind);
      if (existing) {
        return prev.map(d => d.kind === kind ? { ...d, segment: seg } : d);
      } else {
        return [...prev, {
          uid: `s-${kind}-${Date.now()}`,
          kind, segment: seg, enabled: true,
        }];
      }
    });
  };

  const moveKind = (kind, dir) => {
    setDraft(prev => {
      const i = prev.findIndex(d => d.kind === kind);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };

  // Drag & drop reorder
  const onDragStart = (kind) => (e) => {
    setDragKind(kind);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', kind); } catch {}
  };
  const onDragOver = (kind) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overKind !== kind) setOverKind(kind);
  };
  const onDragEnd = () => { setDragKind(null); setOverKind(null); };
  const onDrop = (toKind) => (e) => {
    e.preventDefault();
    const fromKind = dragKind;
    setDragKind(null); setOverKind(null);
    if (!fromKind || fromKind === toKind) return;
    setDraft(prev => {
      const fromIdx = prev.findIndex(d => d.kind === fromKind);
      const toIdx = prev.findIndex(d => d.kind === toKind);
      if (fromIdx < 0) return prev;
      // Si el destino no está en draft, lo agregamos primero
      let work = prev.slice();
      if (toIdx < 0) {
        work.push({ uid: `s-${toKind}-${Date.now()}`, kind: toKind, segment: 'master', enabled: true });
      }
      const fromI = work.findIndex(d => d.kind === fromKind);
      const toI = work.findIndex(d => d.kind === toKind);
      const [item] = work.splice(fromI, 1);
      const adjustedTo = fromI < toI ? toI - 1 : toI;
      work.splice(adjustedTo, 0, item);
      return work;
    });
  };

  const orderedKinds = useMemo(() => {
    const inDraft = draft.map(d => d.kind);
    const notIn = allKinds.filter(k => !inDraft.includes(k));
    return [...inDraft, ...notIn];
  }, [draft]); // eslint-disable-line

  const enabledCount = draft.filter(d => d.enabled).length;

  const loadPreset = (segKey) => {
    const seg = SEGMENTS[segKey];
    setDraft(seg.slides.map((kind, i) => ({
      uid: `s${i}-${kind}`, kind, segment: segKey, enabled: true,
    })));
  };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Selecciona y ordena</div>
            <h2 className="picker-title">Láminas de la cotización</h2>
            <div className="picker-sub">
              Click en la imagen para activar/desactivar · cambia el copy con el dropdown · ordena con ▲▼
            </div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="picker-presets">
          <span className="picker-presets-label">Carga un machote pre-armado:</span>
          {['longtail','core','key','enterprise','master'].map(seg => (
            <button key={seg}
                    onClick={() => { if (confirm(`Reemplazar la cotización con el machote "${SEG_SHORT[seg]}"?`)) loadPreset(seg); }}
                    className="picker-preset-btn">
              <span className="picker-preset-dot" style={{ background: SEG_COLOR[seg] }} />
              {SEG_SHORT[seg]}
            </button>
          ))}
        </div>

        <div className="picker-grid">
          {orderedKinds.map((kind, i) => {
            const row = getRow(kind);
            const enabled = row?.enabled || false;
            const segment = row?.segment || 'master';
            const segs = SLIDE_SEGMENTS[kind] || ['master'];
            const thumb = thumbFor(kind, segment);
            const inDraft = !!row;
            const orderIdx = inDraft ? draft.findIndex(d => d.kind === kind) : -1;
            const isFirst = orderIdx <= 0;
            const isLast = orderIdx === draft.length - 1;
            const isDragging = dragKind === kind;
            const isDragOver = overKind === kind && dragKind !== kind;
            return (
              <div key={kind}
                   draggable={inDraft}
                   onDragStart={inDraft ? onDragStart(kind) : undefined}
                   onDragOver={onDragOver(kind)}
                   onDragEnd={onDragEnd}
                   onDrop={onDrop(kind)}
                   className={`picker-card ${enabled ? 'is-on' : ''} ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-dragover' : ''}`}>
                {inDraft && (
                  <div className="picker-card-handle" title="Arrastra para reordenar">
                    <span className="handle-icon">⋮⋮</span>
                    <span className="handle-pos">#{String(orderIdx + 1).padStart(2,'0')}</span>
                  </div>
                )}
                <div className="picker-card-thumb"
                     style={{ backgroundImage: thumb ? `url('${thumb}')` : 'none' }}
                     onClick={() => toggleKind(kind)}
                     title={enabled ? 'Click para desactivar' : 'Click para activar'}>
                  <div className="picker-card-check">
                    {enabled ? '☑' : '☐'}
                  </div>
                </div>
                <div className="picker-card-body">
                  <div className="picker-card-label">{SLIDE_LABELS[kind]}</div>
                  <div className="picker-card-desc">{SLIDE_DESCRIPTIONS[kind]}</div>
                  <div className="picker-card-controls">
                    <select value={segment}
                            onChange={e => setSegmentForKind(kind, e.target.value)}
                            className="picker-card-select"
                            title="Copy del segmento">
                      {segs.map(s => (
                        <option key={s} value={s}>Copy: {SEG_SHORT[s]}</option>
                      ))}
                    </select>
                    {inDraft && (
                      <div className="picker-card-arrows">
                        <button onClick={() => moveKind(kind, -1)}
                                disabled={isFirst}
                                className="picker-card-arrow"
                                title="Subir un lugar">▲</button>
                        <button onClick={() => moveKind(kind, +1)}
                                disabled={isLast}
                                className="picker-card-arrow"
                                title="Bajar un lugar">▼</button>
                      </div>
                    )}
                  </div>
                  <div className="picker-card-segline" style={{ background: SEG_COLOR[segment] }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="picker-footer">
          <div className="picker-footer-info">
            <strong>{enabledCount}</strong> láminas activas
          </div>
          <div className="picker-footer-btns">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={() => onApply(draft)} className="btn-primary">
              Aplicar ({enabledCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Client Modal — editar datos del cliente
// ============================================================
function ClientModal({ client, onChange, onClose }) {
  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="client-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Datos de la propuesta</div>
            <h2 className="picker-title">Cliente y ejecutivo</h2>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="client-fields">
          <ClientField label="Nombre del cliente" value={client.clientName} onChange={v => onChange('clientName', v)} />
          <ClientField label="ID propuesta" value={client.propId} onChange={v => onChange('propId', v)} />
          <ClientField label="Fecha" value={client.propDate} onChange={v => onChange('propDate', v)} />
          <hr style={{ border: 0, borderTop: '1px solid rgba(243,237,227,0.12)', margin: '16px 0' }} />
          <ClientField label="Ejecutivo de cuenta" value={client.account} onChange={v => onChange('account', v)} />
          <ClientField label="Correo del ejecutivo" value={client.accountEmail} onChange={v => onChange('accountEmail', v)} />
        </div>
        <div className="picker-footer">
          <div className="picker-footer-info">Los cambios se guardan automáticamente.</div>
          <button onClick={onClose} className="btn-primary">Listo</button>
        </div>
      </div>
    </div>
  );
}

function ClientField({ label, value, onChange }) {
  return (
    <label className="client-field">
      <span className="client-field-label">{label}</span>
      <input type="text" value={value || ''}
             onChange={e => onChange(e.target.value)}
             className="client-field-input" />
    </label>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
