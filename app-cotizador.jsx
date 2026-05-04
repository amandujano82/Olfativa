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

// Slide dinámico de precios - definido más abajo
let SlideCotizacionPrecios; // forward decl

const SLIDE_RENDERERS = {
  cover: SlideCover, promise: SlidePromise, pillars: SlidePillars,
  curadora: SlideCuradora, method: SlideMethod, aroma: SlideAroma,
  catalog: SlideCatalog, quote: SlideQuote,
  cotizacion: (props) => SlideCotizacionPrecios(props),
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
  cotizacion: "Cotización · precios dinámicos",
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
  cotizacion: "Calculadora dinámica · difusores + descuento + IVA",
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
  // El slide dinámico de cotización aplica a todos los segmentos
  map.cotizacion = ['longtail','core','key','enterprise','master'];
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
  key: "#CC6633", enterprise: "#C2776B",
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

// ── Catálogo de precios ────────────────────────────────────
const DIFUSORES_PRECIO = [
  { id: 'cervino',     name: 'Cervino',          precio: 1090 },
  { id: 'fitz',        name: 'Fitz',             precio: 1620 },
  { id: 'moai',        name: 'Moai',             precio: 1800 },
  { id: 'aspen',       name: 'Aspen',            precio: 2000 },
  { id: 'montblanc',   name: 'Montblanc',        precio: 2000 },
  { id: 'montblancXl', name: 'Montblanc XL',     precio: 4500 },
  { id: 'liberty',     name: 'Liberty',          precio: 4500 },
  { id: 'empire',      name: 'Empire',           precio: 4500 },
  { id: 'ural',        name: 'Ural',             precio: 7200 },
  { id: 'everest',     name: 'Everest',          precio: 9000 },
  { id: 'uralTrim',    name: 'Ural-Moai (trim)', precio: 1800 },
];
const BANDS = [
  { min: 1,  max: 2,   label: 'Hasta 2 difusores',    maxNoAuth: 10 },
  { min: 3,  max: 9,   label: '3 a 9 difusores',      maxNoAuth: 20 },
  { min: 10, max: 29,  label: '10 a 29 difusores',    maxNoAuth: 25 },
  { min: 30, max: Infinity, label: 'Enterprise (30+)', maxNoAuth: 25 },
];
const AUTH = {
  25: 'Cintya', 30: 'Cintya', 35: 'Cintya',
  40: 'Anthony', 45: 'Anthony', 50: 'Anthony',
};
const PRICES_DEFAULTS = {
  lines: [{ id: 1, difusor: 'aspen', cant: 1, descuento: 0 }],
  descuentoMode: 'global', // 'global' | 'unitario'
  descuento: 0,            // usado cuando descuentoMode='global'
  pagoAnual: false,
  fp: { iva: true, contrato: true, vigencia: true, incluye: true },
  fpNotas: '',
  nextId: 2,
};
// Helper: el descuento efectivo de una línea según modo
function lineDescuento(prices, line) {
  return prices.descuentoMode === 'unitario'
    ? (line.descuento || 0)
    : (prices.descuento || 0);
}
const fmtMx = (n) => '$' + Math.round(n).toLocaleString('es-MX');
function bandFor(totalCant) {
  return BANDS.find(b => totalCant >= b.min && totalCant <= b.max) || BANDS[0];
}
function authForDescuento(totalCant, descuento) {
  const band = bandFor(totalCant);
  if (descuento <= band.maxNoAuth) return null;
  for (let pct = descuento; pct >= 25; pct -= 5) {
    if (AUTH[pct]) return AUTH[pct];
  }
  return null;
}

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
  const [prices, setPrices] = useState(() => ({
    ...PRICES_DEFAULTS,
    ...(persisted?.prices || {}),
    fp: { ...PRICES_DEFAULTS.fp, ...(persisted?.prices?.fp || {}) },
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);

  useEffect(() => {
    saveState({ selected, client, prices });
  }, [selected, client, prices]);

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
        onOpenPrices={() => setPricesOpen(true)}
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
                  prices={prices}
                />
              </section>
            );
          })}
          {activeSlides.length === 0 && (
            <section data-screen-label="00 Vacío" style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              background:'#1C1A18', color:'#F5F0E8',
              fontFamily:'Inter Tight, sans-serif',
            }}>
              <div style={{ textAlign:'center', padding:48 }}>
                <div style={{ fontSize:80, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', marginBottom:24, color:'#CC6633' }}>
                  Cotización vacía
                </div>
                <div style={{ fontSize:24, opacity:0.6, lineHeight:1.4, marginBottom: 32 }}>
                  Abre el selector de láminas para empezar
                </div>
                <button onClick={() => setPickerOpen(true)} style={{
                  padding: '14px 28px',
                  background: '#CC6633', color: '#1C1A18',
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

      {pricesOpen && (
        <PricesModal
          prices={prices}
          onChange={setPrices}
          onClose={() => setPricesOpen(false)}
          onApply={() => {
            // Asegurar que el slide cotizacion esté en la lista activa
            setSelected(prev => {
              const exists = prev.some(s => s.kind === 'cotizacion');
              if (exists) {
                return prev.map(s => s.kind === 'cotizacion' ? { ...s, enabled: true } : s);
              }
              return [...prev, {
                uid: `s-cotizacion-${Date.now()}`,
                kind: 'cotizacion', segment: 'master', enabled: true,
              }];
            });
            setPricesOpen(false);
            // Navegar al slide cotizacion en el deck (después de un tick para que React renderice)
            setTimeout(() => {
              const stage = document.querySelector('deck-stage');
              if (stage && stage.length) {
                // Encuentra el índice del slide cotizacion
                const slides = stage.querySelectorAll('section');
                slides.forEach((s, i) => {
                  if (s.dataset.screenLabel && s.dataset.screenLabel.includes('precios dinámicos')) {
                    stage.goTo(i);
                  }
                });
              }
            }, 100);
          }}
        />
      )}
    </>
  );
}

// ============================================================
// Top Bar — siempre visible
// ============================================================
function TopBar({ total, totalAvailable, client, onOpenPicker, onOpenClient, onOpenPrices, onPrint, onReset }) {
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
          <span className="btn-icon">✎</span> Cliente
        </button>
        <button className="btn-secondary btn-edit" onClick={onOpenPrices} title="Calcular precios y generar slide de cotización">
          <span className="btn-icon">$</span> Precios
        </button>
        <button className="btn-primary" onClick={onOpenPicker}>
          <span className="btn-icon">▦</span>
          Láminas <span className="btn-counter">{total} / {totalAvailable}</span>
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

// ============================================================
// PricesModal — calculadora interactiva de precios
// ============================================================
function PricesModal({ prices, onChange, onClose, onApply }) {
  const update = (patch) => onChange({ ...prices, ...patch });
  const updateLine = (id, patch) => update({
    lines: prices.lines.map(l => l.id === id ? { ...l, ...patch } : l)
  });
  const removeLine = (id) => update({ lines: prices.lines.filter(l => l.id !== id) });
  const addLine = () => update({
    lines: [...prices.lines, { id: prices.nextId, difusor: 'fitz', cant: 1 }],
    nextId: prices.nextId + 1,
  });
  const updateFp = (k, v) => update({ fp: { ...prices.fp, [k]: v } });

  const totalCant = prices.lines.reduce((s, l) => s + (Number(l.cant) || 0), 0);
  const totalLista = prices.lines.reduce((s, l) => {
    const d = DIFUSORES_PRECIO.find(x => x.id === l.difusor);
    return s + (d ? d.precio * l.cant : 0);
  }, 0);
  const annualMult = prices.pagoAnual ? 0.9 : 1;
  // Total final calculado según modo (global o por línea)
  const totalFinal = prices.lines.reduce((s, l) => {
    const d = DIFUSORES_PRECIO.find(x => x.id === l.difusor);
    if (!d) return s;
    return s + d.precio * l.cant * (1 - lineDescuento(prices, l) / 100) * annualMult;
  }, 0);
  const ahorro = totalLista - totalFinal;
  const band = bandFor(totalCant);
  // Para modo global: un solo authBy. Para unitario: revisamos cada línea.
  const globalAuth = prices.descuentoMode === 'global'
    ? authForDescuento(totalCant, prices.descuento)
    : null;
  const lineAuths = prices.descuentoMode === 'unitario'
    ? prices.lines.map(l => ({ id: l.id, authBy: authForDescuento(totalCant, l.descuento || 0) }))
    : [];
  const anyAuth = globalAuth || lineAuths.some(la => la.authBy);
  const isUnit = prices.descuentoMode === 'unitario';

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="prices-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Calculadora · arma la cotización</div>
            <h2 className="picker-title">Precios y descuento</h2>
            <div className="picker-sub">
              Mete los difusores, cantidades y descuento. Al darle Aplicar se genera el slide de cotización en el deck.
            </div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="prices-body">
          <div className="prices-section">
            <div className="prices-section-label">Líneas</div>
            {prices.lines.map(line => {
              const dif = DIFUSORES_PRECIO.find(d => d.id === line.difusor);
              if (!dif) return null;
              const lineDesc = lineDescuento(prices, line);
              const subLista = dif.precio * line.cant;
              const subFinal = subLista * (1 - lineDesc / 100) * annualMult;
              const lineAuth = isUnit ? authForDescuento(totalCant, line.descuento || 0) : null;
              return (
                <div key={line.id} className={`prices-line ${isUnit ? 'is-unit' : ''} ${lineAuth ? 'is-warn' : ''}`}>
                  <button className="prices-line-rm" onClick={() => removeLine(line.id)}>×</button>
                  <select className="prices-line-sel" value={line.difusor}
                          onChange={e => updateLine(line.id, { difusor: e.target.value })}>
                    {DIFUSORES_PRECIO.map(d => (
                      <option key={d.id} value={d.id}>{d.name} · {fmtMx(d.precio)}/mes</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={line.cant} className="prices-line-cant"
                         onChange={e => updateLine(line.id, { cant: Math.max(1, +e.target.value || 1) })} />
                  {isUnit && (
                    <div className="prices-line-disc">
                      <input type="number" min="0" max="50" step="5" value={line.descuento || 0}
                             onChange={e => updateLine(line.id, { descuento: Math.max(0, Math.min(50, +e.target.value || 0)) })} />
                      <span>%</span>
                    </div>
                  )}
                  <div className="prices-line-sub">
                    {fmtMx(subFinal)}<span>/mes</span>
                    {lineAuth && <div className="prices-line-auth">⚠ {lineAuth}</div>}
                  </div>
                </div>
              );
            })}
            <button className="prices-add" onClick={addLine}>+ Agregar difusor</button>
          </div>

          <div className={`prices-section prices-disc ${globalAuth ? 'is-warn' : ''} ${prices.descuento > 0 && !globalAuth && !isUnit ? 'is-ok' : ''}`}>
            <div className="prices-section-label">Tipo de descuento</div>
            <div className="prices-mode-toggle">
              <button className={`prices-mode-btn ${!isUnit ? 'is-on' : ''}`}
                      onClick={() => update({ descuentoMode: 'global' })}>
                Global · uno solo para todo
              </button>
              <button className={`prices-mode-btn ${isUnit ? 'is-on' : ''}`}
                      onClick={() => update({ descuentoMode: 'unitario' })}>
                Por línea · uno por difusor
              </button>
            </div>
            <div className="prices-disc-hint" style={{ marginTop: 8 }}>
              Banda: <b>{band.label}</b> · máx sin auth: <b>{band.maxNoAuth}%</b>
            </div>

            {!isUnit && (
              <>
                <div className="prices-disc-row" style={{ marginTop: 14 }}>
                  <div className="prices-disc-l-text">Descuento global</div>
                  <div className="prices-disc-input">
                    <input type="number" min="0" max="50" step="5" value={prices.descuento}
                           onChange={e => update({ descuento: Math.max(0, Math.min(50, +e.target.value || 0)) })} />
                    <span>%</span>
                  </div>
                </div>
                {globalAuth && (
                  <div className="prices-auth">⚠ Descuento de <b>{prices.descuento}%</b> requiere autorización de <b>{globalAuth}</b>.</div>
                )}
              </>
            )}
            {isUnit && (
              <div className="prices-disc-hint" style={{ marginTop: 12, fontStyle: 'italic' }}>
                Mete el % de descuento en cada línea arriba. Líneas con descuento que requieren autorización se marcan en rojo.
              </div>
            )}

            <label className="prices-toggle" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(243,237,227,0.12)' }}>
              <input type="checkbox" checked={prices.pagoAnual}
                     onChange={e => update({ pagoAnual: e.target.checked })} />
              <span><b>+10% adicional</b> por pago anual <span className="muted">(opcional)</span></span>
            </label>
          </div>

          <div className="prices-section">
            <div className="prices-section-label">Totales</div>
            <div className="prices-totals">
              <div className="prices-total-row"><span>Lista mensual</span><span>{fmtMx(totalLista)}</span></div>
              <div className="prices-total-row"><span>Ahorro mensual</span><span>{fmtMx(ahorro)}</span></div>
              <div className="prices-total-row grand"><span>Total mensual final</span><span>{fmtMx(totalFinal)}</span></div>
              <div className="prices-total-row sub"><span>Anual estimado</span><span>{fmtMx(totalFinal * 12)}</span></div>
            </div>
          </div>

          <div className="prices-section">
            <div className="prices-section-label">Letra chiquita del slide</div>
            <div className="prices-fp">
              <label className="prices-toggle"><input type="checkbox" checked={prices.fp.iva} onChange={e => updateFp('iva', e.target.checked)} /><span>Precios <b>+ IVA (16%)</b></span></label>
              <label className="prices-toggle"><input type="checkbox" checked={prices.fp.contrato} onChange={e => updateFp('contrato', e.target.checked)} /><span>Pago de un mes por adelantado con firma de contrato</span></label>
              <label className="prices-toggle"><input type="checkbox" checked={prices.fp.vigencia} onChange={e => updateFp('vigencia', e.target.checked)} /><span>Vigencia de la cotización: <b>30 días</b></span></label>
              <label className="prices-toggle"><input type="checkbox" checked={prices.fp.incluye} onChange={e => updateFp('incluye', e.target.checked)} /><span>Instalación, recargas y mantenimiento incluidos</span></label>
            </div>
            <textarea className="prices-notas" rows="2" placeholder="Notas adicionales (opcional)"
                      value={prices.fpNotas}
                      onChange={e => update({ fpNotas: e.target.value })} />
          </div>
        </div>

        <div className="picker-footer">
          <div className="picker-footer-info">Se guarda automáticamente. <strong>{totalCant}</strong> difusores · <strong>{fmtMx(totalFinal)}/mes</strong></div>
          <div className="picker-footer-btns">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={onApply} className="btn-primary" disabled={prices.lines.length === 0}>
              Aplicar y ver slide →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SlideCotizacionPrecios — slide dinámico que renderiza la calculadora
// ============================================================
SlideCotizacionPrecios = function SlideCotizacionPrecios({ clientName, propId, idx, totalSlides, prices }) {
  if (!prices) prices = PRICES_DEFAULTS;
  const totalCant = prices.lines.reduce((s, l) => s + (l.cant || 0), 0);
  const totalLista = prices.lines.reduce((s, l) => {
    const d = DIFUSORES_PRECIO.find(x => x.id === l.difusor);
    return s + (d ? d.precio * l.cant : 0);
  }, 0);
  const annualMult = prices.pagoAnual ? 0.9 : 1;
  const isUnit = prices.descuentoMode === 'unitario';
  const totalFinal = prices.lines.reduce((s, l) => {
    const d = DIFUSORES_PRECIO.find(x => x.id === l.difusor);
    if (!d) return s;
    return s + d.precio * l.cant * (1 - lineDescuento(prices, l) / 100) * annualMult;
  }, 0);
  // Si modo global: una autorización; si unitario: chequear si CUALQUIER línea requiere
  const authBy = isUnit
    ? (prices.lines.map(l => authForDescuento(totalCant, l.descuento || 0)).find(a => a) || null)
    : authForDescuento(totalCant, prices.descuento);
  const fp = prices.fp || {};

  const fpItems = [];
  if (fp.iva)      fpItems.push(<span key="iva">Precios <b>+ IVA (16%)</b></span>);
  if (fp.contrato) fpItems.push(<span key="ct">Pago de un mes por adelantado con firma de contrato</span>);
  if (fp.vigencia) fpItems.push(<span key="vg">Vigencia de la cotización: <b>30 días</b></span>);
  if (fp.incluye)  fpItems.push(<span key="in">Instalación, recargas y mantenimiento incluidos</span>);
  if (prices.pagoAnual) fpItems.push(<span key="pa">Aplica <b>10% adicional</b> de descuento por pago anual anticipado</span>);
  if (prices.fpNotas && prices.fpNotas.trim()) fpItems.push(<span key="nt">{prices.fpNotas.trim()}</span>);

  const rows = prices.lines.map(line => {
    const d = DIFUSORES_PRECIO.find(x => x.id === line.difusor);
    if (!d) return null;
    const subLista = d.precio * line.cant;
    const desc = lineDescuento(prices, line);
    const subFinal = subLista * (1 - desc / 100) * annualMult;
    return { name: d.name, cant: line.cant, lista: subLista, sub: subFinal, desc };
  }).filter(Boolean);

  return (
    <div style={{ width: '100%', height: '100%', background: PALETTE.ink, color: PALETTE.bone, fontFamily: "'Public Sans', sans-serif", padding: '80px 112px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid rgba(243,237,227,0.15)' }}>
        <div>
          <div style={{ fontSize: 16, letterSpacing: '0.22em', textTransform: 'uppercase', color: PALETTE.gold, fontWeight: 500, marginBottom: 8 }}>
            Cotización · {clientName || '—'}
          </div>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.5)' }}>
            {propId}
          </div>
        </div>
        <div style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.5)', fontVariantNumeric: 'tabular-nums' }}>
          {String((idx || 0) + 1).padStart(2, '0')} / {String(totalSlides || 1).padStart(2, '0')}
        </div>
      </div>

      {/* Title */}
      <div style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 400, fontSize: 96, lineHeight: 1, letterSpacing: '-0.025em', marginBottom: 40 }}>
        Inversión <i style={{ color: PALETTE.gold }}>mensual.</i>
      </div>

      {/* Body — table */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(243,237,227,0.4)', fontStyle: 'italic', fontSize: 28 }}>
            Sin líneas. Abre el botón "Precios" en la barra superior para armar la cotización.
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 24 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '1px solid rgba(243,237,227,0.2)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.55)', fontWeight: 500 }}>Difusor</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px solid rgba(243,237,227,0.2)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.55)', fontWeight: 500 }}>Cant</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px solid rgba(243,237,227,0.2)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.55)', fontWeight: 500 }}>Lista</th>
                  {isUnit && <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px solid rgba(243,237,227,0.2)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.55)', fontWeight: 500 }}>Desc</th>}
                  <th style={{ textAlign: 'right', padding: '12px 8px', borderBottom: '1px solid rgba(243,237,227,0.2)', fontSize: 14, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.55)', fontWeight: 500 }}>Sub-total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid rgba(243,237,227,0.08)', fontVariantNumeric: 'tabular-nums' }}>{r.name}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid rgba(243,237,227,0.08)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.cant}</td>
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid rgba(243,237,227,0.08)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: 'rgba(243,237,227,0.4)', textDecoration: 'line-through', fontSize: 20 }}>{fmtMx(r.lista)}</td>
                    {isUnit && <td style={{ padding: '14px 8px', borderBottom: '1px solid rgba(243,237,227,0.08)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', color: r.desc > 0 ? PALETTE.gold : 'rgba(243,237,227,0.4)' }}>{r.desc}%</td>}
                    <td style={{ padding: '14px 8px', borderBottom: '1px solid rgba(243,237,227,0.08)', fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 500 }}>{fmtMx(r.sub)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Grand total */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: `2px solid ${PALETTE.gold}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.6)' }}>
                  Total mensual final
                </div>
                {((!isUnit && prices.descuento > 0) || isUnit || prices.pagoAnual) && (
                  <div style={{ fontSize: 14, color: 'rgba(243,237,227,0.55)', marginTop: 6 }}>
                    {!isUnit && prices.descuento > 0 && `Descuento global ${prices.descuento}%`}
                    {isUnit && 'Descuentos por línea'}
                    {((!isUnit && prices.descuento > 0) || isUnit) && prices.pagoAnual && ' · '}
                    {prices.pagoAnual && '+10% pago anual'}
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "'Public Sans', sans-serif", fontSize: 72, fontWeight: 600, color: PALETTE.gold, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
                {fmtMx(totalFinal)}
              </div>
            </div>

            {/* Fine print */}
            {fpItems.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed rgba(243,237,227,0.15)', fontSize: 14, lineHeight: 1.5, color: 'rgba(243,237,227,0.55)', columns: 2, columnGap: 32 }}>
                {fpItems.map((it, i) => (
                  <div key={i} style={{ marginBottom: 4, breakInside: 'avoid' }}>
                    <span style={{ color: PALETTE.gold }}>· </span>{it}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(243,237,227,0.1)', display: 'flex', justifyContent: 'space-between', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(243,237,227,0.4)' }}>
        <span>Olfativa · Casa olfativa</span>
        <span>IVA no incluido</span>
      </div>

      {/* Auth stamp */}
      {authBy && (
        <div style={{ position: 'absolute', top: 60, right: 60, transform: 'rotate(8deg)', border: `3px solid ${PALETTE.bronze || '#C2776B'}`, color: '#C2776B', padding: '12px 24px', borderRadius: 6, fontSize: 14, letterSpacing: '0.22em', fontWeight: 700, textTransform: 'uppercase', background: 'rgba(194,119,107,0.05)', textAlign: 'center', lineHeight: 1.2 }}>
          Pendiente<br />Autoriza {authBy}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
