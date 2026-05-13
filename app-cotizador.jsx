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
  SlideScentAdvisor, SlideScentAnalysis,
} = window;

// Slide dinámico de precios - definido más abajo
let SlideCotizacionPrecios; // forward decl

const SLIDE_RENDERERS = {
  cover: SlideCover, promise: SlidePromise, pillars: SlidePillars,
  curadora: SlideCuradora, method: SlideMethod, aroma: SlideAroma,
  scentAdvisor: SlideScentAdvisor,
  scentAnalysis: SlideScentAnalysis,
  catalog: SlideCatalog,
  // 'cotizacion' (legacy) y 'cotizador' (new kind del segmento Long Tail)
  // ambos renderizan el slide editable dinámico de precios.
  cotizacion: (props) => SlideCotizacionPrecios(props),
  cotizador:  (props) => SlideCotizacionPrecios(props),
  compliance: SlideCompliance, trust: SlideTrust, close: SlideClose,
};

const SLIDE_LABELS = {
  cover: "Portada",
  promise: "Posicionamiento",
  pillars: "Pilares de valor",
  curadora: "Curaduría · Manuela",
  method: "Metodología (6 fases)",
  aroma: "Arquitectura olfativa",
  scentAdvisor: "Scent Advisor · IA",
  scentAnalysis: "Lectura sensorial · Scent Advisor",
  catalog: "Catálogo de equipos",
  cotizacion: "Cotización · precios dinámicos",
  cotizador: "Cotización · precios dinámicos",
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
  scentAdvisor: "Foto del local → motor olfativo IA → aroma recomendado",
  scentAnalysis: "Foto real del espacio + lectura visual + recomendación olfativa",
  catalog: "Los difusores que operamos · precios por mes",
  cotizacion: "Calculadora dinámica · difusores + descuento + IVA",
  cotizador: "Calculadora dinámica · difusores + descuento + IVA",
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
  // El kind 'cotizador' (nuevo, Long Tail) también es global como editable
  map.cotizador = ['longtail','core','key','enterprise','master'];
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

// ── Orden canónico de tipos de slide en el deck ──────────────
// El picker agrupa POR TIPO. Dentro de cada tipo el vendedor elige
// la variante (qué copy de qué segmento usar). El deck respeta este
// orden y no se reordena manualmente.
// Custom slides — alta manual desde Admin (persisten en LS)
const CUSTOM_LS = 'olfativa.customSlides';
function loadCustomSlides() {
  try { const v = localStorage.getItem(CUSTOM_LS); return v ? JSON.parse(v) : []; }
  catch (_) { return []; }
}
function saveCustomSlides(arr) {
  try { localStorage.setItem(CUSTOM_LS, JSON.stringify(arr || [])); } catch (_) {}
}
// Lookup helpers: si un kind es 'custom-XXX' busca en customSlides
function rendererFor(kind, customSlides) {
  if (SLIDE_RENDERERS[kind]) return SLIDE_RENDERERS[kind];
  if (typeof kind === 'string' && kind.startsWith('custom-')) {
    const slide = (customSlides || []).find(c => c.kind === kind);
    if (slide && window.CustomSlide) {
      return (props) => window.CustomSlide({ ...props, slide });
    }
  }
  return null;
}
function labelFor(kind, customSlides) {
  if (SLIDE_LABELS[kind]) return SLIDE_LABELS[kind];
  const s = (customSlides || []).find(c => c.kind === kind);
  return s?.title || kind;
}
function descFor(kind, customSlides) {
  if (SLIDE_DESCRIPTIONS[kind]) return SLIDE_DESCRIPTIONS[kind];
  const s = (customSlides || []).find(c => c.kind === kind);
  return s?.subtitle || s?.eyebrow || 'Slide personalizado';
}

const KIND_ORDER = [
  'cover', 'promise', 'pillars',
  'curadora', 'method', 'aroma',
  'scentAdvisor',
  'catalog',
  'compliance',
  'cotizacion',
  'trust', 'close',
];

// Normalización: `cotizador` (kind nuevo del rediseño Long Tail) y
// `cotizacion` (legacy) son la MISMA lámina dinámica de precios.
// Mostramos una sola en el picker (`cotizacion`).
function normalizeKind(k) { return k === 'cotizador' ? 'cotizacion' : k; }
function normalizeSelected(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const k = normalizeKind(s.kind);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ...s, kind: k });
  }
  return out;
}

// ── Default cotización: master completo ──────────────────────
function defaultSelected() {
  return normalizeSelected(SEGMENTS.master.slides.map((kind, i) => ({
    uid: `s${i}-${kind}`,
    kind,
    segment: 'master',
    enabled: true,
  })));
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
  // Segmento elegido por el ejecutivo en el triage del Scent Advisor.
  // Se usa para marcar la variante "Recomendado" dentro de cada tipo de slide.
  const triageSegment = persisted?.meta?.segment || null;
  const [selected, setSelected] = useState(() =>
    (persisted && Array.isArray(persisted.selected) && persisted.selected.length)
      ? normalizeSelected(persisted.selected)
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
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [scentIQOpen, setScentIQOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [scentToast, setScentToast] = useState(null);
  const [customSlides, setCustomSlides] = useState(() => loadCustomSlides());
  useEffect(() => { saveCustomSlides(customSlides); window.OLF_CUSTOM_SLIDES = customSlides; }, [customSlides]);
  // Datos del último análisis Scent Advisor aplicado a esta cotización.
  // Se persiste por propId para que el slide del deck sobreviva refresh.
  const [scentData, setScentData] = useState(() => {
    try {
      const pid = (typeof loadState === 'function' ? (loadState()?.client?.propId) : '') || 'default';
      const v = localStorage.getItem('olf:scentData:' + pid);
      return v ? JSON.parse(v) : null;
    } catch (_) { return null; }
  });
  useEffect(() => {
    const key = 'olf:scentData:' + (client?.propId || 'default');
    try {
      if (scentData) localStorage.setItem(key, JSON.stringify(scentData));
    } catch (_) {}
  }, [scentData, client?.propId]);

  // Toast cuando Scent Advisor aplica una recomendacion: muestra mensaje
  // + auto-abre Precios para que el usuario vea la nueva linea.
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail || {};
      // Caso WhatsApp fallback (u otro consumer): mensaje custom, no abre Precios
      if (d.__toast) {
        setScentToast(d.__toast);
        return;
      }
      const aromaName  = d.aromaName  || 'aroma';
      const difusorName = d.difusorName || 'difusor';
      setScentToast(`Scent Advisor: agregado ${aromaName} + ${difusorName} a la cotización`);
      // Pequeno delay para que el toast se vea antes que se abra el modal Precios
      setTimeout(() => setPricesOpen(true), 950);
    };
    window.addEventListener('olfativa:scent-applied', handler);
    return () => window.removeEventListener('olfativa:scent-applied', handler);
  }, []);

  useEffect(() => {
    if (!scentToast) return;
    const t = setTimeout(() => setScentToast(null), 4000);
    return () => clearTimeout(t);
  }, [scentToast]);

  useEffect(() => {
    saveState({ selected, client, prices });
  }, [selected, client, prices]);

  useEffect(() => {
    document.title = `Cotización · ${client.clientName} · ${client.propId}`;
  }, [client.clientName, client.propId]);

  // El deck se renderiza en el orden del draft (definido por el ejecutivo
  // arrastrando en la sección "Vista previa y orden" del picker). KIND_ORDER
  // solo sirve para el orden inicial de los tipos cuando se cargan desde
  // un segmento del triage.
  const activeSlides = useMemo(() => selected.filter(s => s.enabled), [selected]);
  const total = activeSlides.length;

  const updateClient = (k, v) => setClient(c => ({ ...c, [k]: v }));

  // ── Descarga + notificación por correo ───────────────────────
  // Construye el mailto con el resumen de la propuesta para enviar a
  // automation.sales@olfativa.com y clopez@olfativa.com. El vendedor
  // adjunta el PDF (que se descargó vía window.print) manualmente,
  // porque mailto no permite attachments desde el navegador.
  const buildMailto = () => {
    const to = 'automation.sales@olfativa.com,clopez@olfativa.com';
    const segName = (triageSegment && SEG_LABEL[triageSegment]) || '—';
    const slidesList = activeSlides
      .map((s, i) => `  ${String(i + 1).padStart(2,'0')}. ${labelFor(s.kind, customSlides)} (${SEG_SHORT[s.segment] || s.segment})`)
      .join('\n');
    const subject = `Nueva cotización: ${client.clientName || '—'} · ${client.propId || '—'}`;
    const body = [
      `Se generó una nueva cotización el ${client.propDate || '—'} para ${client.clientName || '—'}.`,
      ``,
      `Folio:     ${client.propId || '—'}`,
      `Segmento:  ${segName}`,
      `Ejecutivo: ${client.account || '—'}`,
      ``,
      `Láminas incluidas (${activeSlides.length}):`,
      slidesList,
      ``,
      `—`,
      `Nota: adjunta manualmente el PDF de la cotización antes de enviar este correo. Los navegadores no permiten adjuntar archivos en mailto:.`,
    ].join('\n');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Genera el PDF de la cotización capturando cada slide del deck con
  // html2canvas y armando un PDF multipágina con jsPDF. Params tuneados
  // agresivamente para que el archivo pese poco (objetivo < 10 MB en
  // decks con fotos full-bleed) sin perder legibilidad del texto:
  //   · scale 0.6    (subsample fuerte de la resolución de captura)
  //   · JPEG 0.25    (compresión muy fuerte en fotos)
  //   · compress: true (Flate sobre los streams del PDF)
  // Cada <section> del deck-stage se renderiza y se inserta como una
  // página landscape de 1920×1080.
  const generateDeckPDF = async () => {
    const stage = document.querySelector('deck-stage');
    const html2canvas = window.html2canvas;
    const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!stage || !html2canvas || !jsPDFCtor) {
      throw new Error('PDF libraries no disponibles');
    }
    const sections = Array.from(stage.querySelectorAll('section'));
    if (!sections.length) throw new Error('Sin láminas para exportar');

    const pdf = new jsPDFCtor({
      orientation: 'landscape',
      unit: 'px',
      format: [1920, 1080],
      compress: true,
    });

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(sec, {
        scale: 0.6,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0E0E0E',
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.25);
      if (i > 0) pdf.addPage([1920, 1080], 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080, undefined, 'FAST');
    }

    const slug = (client.clientName || 'cliente').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cliente';
    const propSlug = (client.propId || 'olfativa').toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-');
    pdf.save(`cotizacion-${slug}-${propSlug}.pdf`);
  };

  const confirmDownload = async () => {
    setDownloadOpen(false);
    // Espera a que el modal se desmonte antes de capturar (evita que
    // quede dentro del PDF) y a que el navegador pinte de nuevo el deck.
    await new Promise(r => setTimeout(r, 120));
    try {
      await generateDeckPDF();
      // Dejamos que arranque la descarga antes de abrir el correo.
      setTimeout(() => { window.location.href = buildMailto(); }, 400);
    } catch (err) {
      console.error('PDF gen falló, fallback a window.print()', err);
      window.print();
      setTimeout(() => { window.location.href = buildMailto(); }, 300);
    }
  };

  const reset = () => {
    if (!confirm("Esto borra TODO · cliente, propId, precios, líneas, deck, Scent Advisor y datos guardados. Continuar?")) return;
    // Barrido HARD: cualquier clave en LS que sea olfativa/scent del proyecto
    try {
      Object.keys(localStorage).forEach((k) => {
        if (/^olf:|^olfativa\./.test(k)) localStorage.removeItem(k);
      });
    } catch (_) {}
    // Setters a defaults
    setSelected(defaultSelected());
    setClient({ ...CLIENT_DEFAULTS });
    setPrices({
      ...PRICES_DEFAULTS,
      lines: [{ id: 1, difusor: 'aspen', cant: 1, descuento: 0 }],
      fp: { ...PRICES_DEFAULTS.fp },
      fpNotas: '',
      nextId: 2,
    });
    setScentData(null);
    setCustomSlides([]);
    // UX feedback
    try {
      window.dispatchEvent(new CustomEvent('olfativa:scent-applied', {
        detail: { __toast: 'Cotización restablecida · cliente, deck, precios y Scent Advisor reiniciados.' }
      }));
    } catch (_) {}
    try { window.scrollTo(0, 0); } catch (_) {}
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
        onOpenScentIQ={() => setScentIQOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
        onDownload={() => setDownloadOpen(true)}
        onReset={reset}
      />

      <div className="deck-area">
        <deck-stage>
          {activeSlides.map((entry, i) => {
            const Renderer = rendererFor(entry.kind, customSlides);
            const segObj = SEGMENTS[entry.segment] || SEGMENTS.master;
            if (!Renderer) return null;
            const segLabel = labelFor(entry.kind, customSlides);
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
                  scentData={entry.kind === 'scentAnalysis' ? scentData : undefined}
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
          client={client}
          prices={prices}
          triageSegment={triageSegment}
          customSlides={customSlides}
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

      {downloadOpen && (
        <DownloadReviewModal
          activeSlides={activeSlides}
          client={client}
          prices={prices}
          triageSegment={triageSegment}
          onClose={() => setDownloadOpen(false)}
          onConfirm={confirmDownload}
        />
      )}

      {adminOpen && (
        <AdminPanel
          customSlides={customSlides}
          onClose={() => setAdminOpen(false)}
          onSave={(nextArr) => {
            // Diff con el array anterior: cualquier kind nuevo se agrega
            // automaticamente al deck (selected) con enabled:true.
            // Los kinds eliminados se sacan del deck.
            const oldKinds = new Set(customSlides.map(c => c.kind));
            const newKinds = new Set(nextArr.map(c => c.kind));
            const added = nextArr.filter(c => !oldKinds.has(c.kind));
            const removedKinds = customSlides
              .filter(c => !newKinds.has(c.kind))
              .map(c => c.kind);

            setCustomSlides(nextArr);

            setSelected(prev => {
              let arr = prev.filter(s => !removedKinds.includes(s.kind));
              added.forEach(c => {
                if (!arr.some(s => s.kind === c.kind)) {
                  arr.push({
                    uid: `s-${c.kind}-${Date.now()}`,
                    kind: c.kind,
                    segment: 'master',
                    enabled: true,
                  });
                }
              });
              return arr;
            });

            // Toast confirmando que se agrego al deck
            if (added.length > 0) {
              const n = added.length;
              const titles = added.slice(0, 2).map(c => `"${c.title}"`).join(', ');
              const extra = n > 2 ? ` y ${n - 2} más` : '';
              try {
                window.dispatchEvent(new CustomEvent('olfativa:scent-applied', {
                  detail: { __toast: `Admin: ${titles}${extra} agregado${n > 1 ? 's' : ''} al deck.` }
                }));
              } catch (_) {}
            }
          }}
        />
      )}

      {scentIQOpen && window.ScentIQPanel && React.createElement(window.ScentIQPanel, {
        client,
        onClose: () => setScentIQOpen(false),
        onApply: (rec) => {
          // rec = { difusorKey, difusorName, aromaKey, aromaName, cantidad, full }
          // Política: si el difusor recomendado tiene cotizador_key (priced),
          // se agrega como nueva línea con aroma. Si no, se agrega el aroma
          // sobre una línea con difusor placeholder ('aspen') y notas explicativas.
          setPrices(p => {
            const safeDifKey = rec.difusorKey || 'aspen';
            const newLine = {
              id: p.nextId,
              difusor: safeDifKey,
              aroma: rec.aromaKey || null,
              cant: Math.max(1, Number(rec.cantidad) || 1),
              descuento: 0,
              fromScentIQ: rec.fromScentIQ === true,
            };
            const extraNote = rec.difusorKey
              ? `Scent Advisor · ${rec.difusorName} + ${rec.aromaName}.`
              : `Scent Advisor · recomienda ${rec.difusorName} (sin precio cargado · validar) + ${rec.aromaName}.`;
            const fpNotas = p.fpNotas ? `${p.fpNotas}\n${extraNote}` : extraNote;
            return { ...p, lines: [...p.lines, newLine], nextId: p.nextId + 1, fpNotas };
          });
          // 1. Guardar scentData para que el slide del deck lo pueda leer
          setScentData({
            previewURL: rec.full?._meta?.previewURL || null,
            output: rec.full,
            timestamp: Date.now()
          });

          // 2. Asegurar slide de cotización + insertar slide scentAnalysis JUSTO antes
          setSelected(prev => {
            let arr = [...prev];
            const hasCot = arr.some(s => s.kind === 'cotizacion' || s.kind === 'cotizador');
            if (!hasCot) {
              arr.push({ uid: `s-cotizacion-${Date.now()}`, kind: 'cotizacion', segment: 'master', enabled: true });
            } else {
              arr = arr.map(s => (s.kind === 'cotizacion' || s.kind === 'cotizador') ? { ...s, enabled: true } : s);
            }
            const hasScent = arr.some(s => s.kind === 'scentAnalysis');
            if (!hasScent) {
              const cotIdx = arr.findIndex(s => s.kind === 'cotizacion' || s.kind === 'cotizador');
              const newSlide = { uid: `s-scentAnalysis-${Date.now()}`, kind: 'scentAnalysis', segment: 'master', enabled: true };
              if (cotIdx > 0) arr.splice(cotIdx, 0, newSlide);
              else arr.push(newSlide);
            } else {
              arr = arr.map(s => s.kind === 'scentAnalysis' ? { ...s, enabled: true } : s);
            }
            return arr;
          });
        }
      })}

      {scentToast && (
        <div className="olf-toast" role="status">
          <span className="check">✓</span>
          <span>{scentToast}</span>
          <button className="close" onClick={() => setScentToast(null)} aria-label="Cerrar">×</button>
        </div>
      )}
    </>
  );
}

// ============================================================
// Top Bar — siempre visible
// ============================================================
function TopBar({ total, totalAvailable, client, onOpenPicker, onOpenClient, onOpenPrices, onOpenScentIQ, onOpenAdmin, onDownload, onReset }) {
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
        <button className="btn-secondary btn-edit" onClick={onOpenScentIQ} title="Análisis olfativo por foto del espacio (Scent Advisor)">
          <span className="btn-icon">⌖</span> Scent Advisor
        </button>
        <button className="btn-secondary btn-edit" onClick={onOpenAdmin} title="Admin · slides personalizados">
          <span className="btn-icon">⚙</span> Admin
        </button>
        <button className="btn-primary" onClick={onOpenPicker}>
          <span className="btn-icon">▦</span>
          Láminas <span className="btn-counter">{total} / {totalAvailable}</span>
        </button>
        <button className="btn-download" onClick={onDownload} title="Revisar resumen y descargar la cotización">
          <span className="btn-icon">↓</span> Descargar cotización
        </button>
        <button className="btn-tertiary" onClick={onReset} title="Reset total · cliente, deck, precios y Scent Advisor">
          ↻
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Slide Picker — overlay visual con grid de láminas
// ============================================================
// ============================================================
// SlidePreview — renders a real slide scaled into the card.
// ============================================================
function SlidePreview({ Renderer, slideProps, onClick }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.24);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(w / 1920);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={containerRef} className="picker-card-preview" onClick={onClick}>
      <div className="picker-card-preview-inner" style={{ transform: `scale(${scale})` }}>
        {Renderer ? <Renderer {...slideProps} /> : null}
      </div>
    </div>
  );
}

// ============================================================
// FullPreview — modal a pantalla completa con el slide al máximo.
// ============================================================
function FullPreview({ kind, segmentName, Renderer, slideProps, enabled, onToggle, onClose }) {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(w / 1920);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // ESC para cerrar
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="full-preview-overlay" onClick={onClose}>
      <div className="full-preview-stage" ref={stageRef} onClick={e => e.stopPropagation()}>
        <div className="full-preview-meta">
          {labelFor(kind, window.OLF_CUSTOM_SLIDES || [])}
          {segmentName && <span className="full-preview-meta-seg"> · {segmentName}</span>}
        </div>
        <button className="full-preview-close" onClick={onClose} aria-label="Cerrar">×</button>
        <div className="full-preview-stage-inner" style={{ transform: `scale(${scale})` }}>
          {Renderer ? <Renderer {...slideProps} /> : null}
        </div>
        <button
          className={`full-preview-toggle ${enabled ? '' : 'off'}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {enabled ? '✓ Variante seleccionada · click para reconfirmar' : 'Usar esta variante'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// AdminPanel — CRUD de slides personalizados (custom-XXX)
// ============================================================
function AdminPanel({ customSlides, onSave, onClose }) {
  const [draft, setDraft] = useState(customSlides);
  const [editing, setEditing] = useState(null); // null | { ...slide, isNew: bool }

  const startNew = () => setEditing({
    id: 'custom-' + Date.now(),
    kind: 'custom-' + Date.now(),
    title: '',
    eyebrow: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    layout: 'left-image',
    enabled: true,
    createdAt: Date.now(),
    isNew: true,
  });
  const startEdit = (s) => setEditing({ ...s, isNew: false });
  const saveEditing = () => {
    if (!editing) return;
    if (!editing.title.trim()) { alert('El título es requerido'); return; }
    const clean = { ...editing };
    delete clean.isNew;
    setDraft(prev => {
      const i = prev.findIndex(x => x.id === clean.id);
      if (i === -1) return [...prev, clean];
      const next = [...prev]; next[i] = clean; return next;
    });
    setEditing(null);
  };
  const deleteSlide = (id) => {
    if (!confirm('Eliminar este slide personalizado?')) return;
    setDraft(prev => prev.filter(x => x.id !== id));
    if (editing && editing.id === id) setEditing(null);
  };
  const apply = () => { onSave(draft); onClose(); };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal admin-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Admin · Slides personalizados</div>
            <h2 className="picker-title">Crea slides extra para tu propuesta</h2>
            <div className="picker-sub">Los slides personalizados se inyectan al deck igual que los del machote. Puedes activarlos, reordenarlos y editarlos en cualquier momento.</div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="admin-body">
          <div className="admin-list">
            <div className="admin-list-head">
              <span>Slides existentes ({draft.length})</span>
              <button className="btn-primary" onClick={startNew}>+ Nuevo slide</button>
            </div>
            {draft.length === 0 ? (
              <div className="admin-empty">Aún no tienes slides personalizados. Click en "+ Nuevo slide" para crear el primero.</div>
            ) : draft.map(s => (
              <div key={s.id} className={"admin-row" + (editing?.id === s.id ? ' is-editing' : '')}>
                <div className="admin-row-thumb" onClick={() => startEdit(s)}>
                  {s.imageUrl
                    ? <img src={s.imageUrl} alt={s.title} />
                    : <div className="admin-row-thumb-empty">{(s.title || 'S')[0]}</div>}
                </div>
                <div className="admin-row-info" onClick={() => startEdit(s)}>
                  <div className="admin-row-title">{s.title || 'Sin título'}</div>
                  <div className="admin-row-meta">{s.layout} · {s.kind}</div>
                </div>
                <div className="admin-row-actions">
                  <button className="btn-secondary" onClick={() => startEdit(s)}>Editar</button>
                  <button className="admin-row-del" onClick={() => deleteSlide(s.id)} title="Eliminar">×</button>
                </div>
              </div>
            ))}
          </div>

          {editing && (
            <div className="admin-form">
              <div className="admin-form-head">
                <div className="picker-eyebrow">{editing.isNew ? 'Nuevo slide' : 'Editar slide'}</div>
                <h3>{editing.title || '(sin título)'}</h3>
              </div>
              <div className="admin-field">
                <label>Título <span className="admin-req">*</span></label>
                <input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} placeholder="Casos de éxito" />
              </div>
              <div className="admin-field">
                <label>Eyebrow (texto pequeño arriba)</label>
                <input value={editing.eyebrow} onChange={e => setEditing({...editing, eyebrow: e.target.value})} placeholder="Resultados" />
              </div>
              <div className="admin-field">
                <label>Subtítulo</label>
                <input value={editing.subtitle} onChange={e => setEditing({...editing, subtitle: e.target.value})} placeholder="Lo que dicen nuestros clientes" />
              </div>
              <div className="admin-field">
                <label>Cuerpo (saltos de línea = párrafos)</label>
                <textarea rows={6} value={editing.body} onChange={e => setEditing({...editing, body: e.target.value})} placeholder={'Párrafo 1...\nPárrafo 2...'} />
              </div>
              <div className="admin-field">
                <label>Imagen URL</label>
                <input value={editing.imageUrl} onChange={e => setEditing({...editing, imageUrl: e.target.value})} placeholder="https://..." />
              </div>
              <div className="admin-field">
                <label>Layout</label>
                <select value={editing.layout} onChange={e => setEditing({...editing, layout: e.target.value})}>
                  <option value="left-image">Foto izquierda + texto derecha</option>
                  <option value="right-image">Texto izquierda + foto derecha</option>
                  <option value="full-bleed">Foto a sangre + texto encima</option>
                  <option value="text-only">Solo texto (centrado)</option>
                </select>
              </div>
              <div className="admin-form-actions">
                <button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                {!editing.isNew && <button className="admin-row-del-btn" onClick={() => deleteSlide(editing.id)}>Eliminar</button>}
                <button className="btn-primary" onClick={saveEditing}>Guardar slide</button>
              </div>
            </div>
          )}
        </div>

        <div className="picker-footer">
          <span className="picker-footer-info">Los slides personalizados se persisten en tu navegador.</span>
          <div className="picker-footer-btns">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-download" onClick={apply}>Aplicar cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================
// ============================================================
// DownloadReviewModal — resumen visual de la propuesta antes de descargar.
// Muestra thumbnails de TODAS las láminas activas en orden. Botón final
// dispara window.print() + abre mailto pre-llenado.
// ============================================================
function DownloadReviewModal({ activeSlides, client, prices, triageSegment, onClose, onConfirm }) {
  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Resumen · revisa antes de descargar</div>
            <h2 className="picker-title">Resumen de tu propuesta</h2>
            <div className="picker-sub">
              <strong>{activeSlides.length}</strong> {activeSlides.length === 1 ? 'lámina' : 'láminas'} ·
              {' '}{client.clientName || 'Cliente'} · {client.propId}
              {triageSegment && <> · {SEG_LABEL[triageSegment]}</>}
            </div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="download-summary">
          <div className="download-summary-grid">
            {activeSlides.map((s, i) => {
              const segObj = SEGMENTS[s.segment] || SEGMENTS.master;
              const slideProps = {
                segment: segObj,
                clientName: client?.clientName || 'Cliente',
                propId: client?.propId || '—',
                propDate: client?.propDate || '',
                account: client?.account || '',
                accountEmail: client?.accountEmail || '',
                fields: segObj.fields,
                totalSlides: activeSlides.length,
                idx: i,
                prices,
              };
              return (
                <div key={s.uid || `${s.kind}-${i}`} className="download-summary-card">
                  <div className="download-summary-num">#{String(i + 1).padStart(2,'0')}</div>
                  <SlidePreview
                    Renderer={rendererFor(s.kind, window.OLF_CUSTOM_SLIDES || [])}
                    slideProps={slideProps}
                  />
                  <div className="download-summary-foot">
                    <span className="download-summary-name">{labelFor(s.kind, window.OLF_CUSTOM_SLIDES || [])}</span>
                    <span className="download-summary-seg" style={{ '--seg-color': SEG_COLOR[s.segment] }}>
                      <span className="download-summary-dot" />
                      {SEG_SHORT[s.segment] || s.segment}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="picker-footer">
          <div className="picker-footer-info">
            <span style={{ display: 'block', marginBottom: 2 }}>
              <strong>Acción doble:</strong> se descarga el PDF (comprimido, ideal para correo) <em>y</em> se abre un correo pre-cargado para notificar al equipo.
            </span>
            <span style={{ fontSize: 11, opacity: 0.55 }}>
              Para: automation.sales@olfativa.com, clopez@olfativa.com
            </span>
          </div>
          <div className="picker-footer-btns">
            <button onClick={onClose} className="btn-secondary">Volver a editar</button>
            <button onClick={onConfirm} className="btn-download btn-download-confirm">
              ↓ Descargar y notificar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlidePicker({ selected, client, prices, triageSegment, customSlides = [], onClose, onApply }) {
  const [draft, setDraft] = useState(() => normalizeSelected(selected.map(s => ({ ...s }))));
  // fullPreviewTarget: { kind, segment } | null
  const [fullPreviewTarget, setFullPreviewTarget] = useState(null);
  // Drag&drop reorder state (solo para el strip "Vista previa y orden")
  const [dragKind, setDragKind] = useState(null);
  const [overKind, setOverKind] = useState(null);
  const getRow = (kind) => draft.find(d => d.kind === kind);

  // Variantes disponibles para un tipo de slide (segmentos que tienen copy)
  const variantsFor = (kind) => SLIDE_SEGMENTS[kind] || ['master'];
  // Variante por defecto al activar un tipo: la recomendada si aplica, si no la primera
  const defaultVariantFor = (kind) => {
    const vs = variantsFor(kind);
    return (triageSegment && vs.includes(triageSegment)) ? triageSegment : vs[0];
  };

  // Reordena el draft moviendo `fromKind` justo antes de `toKind`. Si toKind
  // viene después, queda justo después en la práctica (drop at end / between).
  const reorderActive = (fromKind, toKind) => {
    if (!fromKind || fromKind === toKind) return;
    setDraft(prev => {
      const fromIdx = prev.findIndex(d => d.kind === fromKind);
      const toIdx = prev.findIndex(d => d.kind === toKind);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = prev.slice();
      const [item] = next.splice(fromIdx, 1);
      const adjustedTo = fromIdx < toIdx ? toIdx - 1 : toIdx;
      next.splice(adjustedTo, 0, item);
      return next;
    });
  };

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
    const from = dragKind;
    setDragKind(null); setOverKind(null);
    reorderActive(from, toKind);
  };

  // ── Handlers ──────────────────────────────────────────────
  // Selecciona una variante para un tipo de slide. La incluye en el deck.
  const setVariantForKind = (kind, segment) => {
    setDraft(prev => {
      const idx = prev.findIndex(d => d.kind === kind);
      if (idx === -1) {
        return [...prev, {
          uid: `s-${kind}-${Date.now()}`,
          kind, segment, enabled: true,
        }];
      }
      return prev.map(d => d.kind === kind ? { ...d, segment, enabled: true } : d);
    });
  };

  // Move slide up/down within the enabled list. Disabled rows are
  // pushed to the end so the enabled order is the authoritative one.
  const moveEnabled = (kind, delta) => {
    setDraft(prev => {
      const enabled = prev.filter(d => d.enabled);
      const disabled = prev.filter(d => !d.enabled);
      const i = enabled.findIndex(d => d.kind === kind);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= enabled.length) return prev;
      const next = [...enabled];
      [next[i], next[j]] = [next[j], next[i]];
      return [...next, ...disabled];
    });
  };
  const moveUp   = (kind) => moveEnabled(kind, -1);
  const moveDown = (kind) => moveEnabled(kind, +1);

  // Alterna incluir / no incluir un tipo. Si se incluye y no había draft,
  // se inserta con la variante recomendada (o la primera disponible).
  const toggleKindEnabled = (kind) => {
    setDraft(prev => {
      const idx = prev.findIndex(d => d.kind === kind);
      if (idx === -1) {
        return [...prev, {
          uid: `s-${kind}-${Date.now()}`,
          kind,
          segment: defaultVariantFor(kind),
          enabled: true,
        }];
      }
      return prev.map(d => d.kind === kind ? { ...d, enabled: !d.enabled } : d);
    });
  };

  // "Aplicar todo": para CADA tipo, escoger la variante de un segmento dado
  // (o la primera disponible si ese segmento no tiene copy para ese tipo).
  // Marca como enabled solo los tipos donde el segmento elegido sí tiene copy.
  const applyAllVariants = (segKey) => {
    setDraft(prev => {
      const next = prev.map(d => ({ ...d }));
      KIND_ORDER.forEach(kind => {
        if (!SLIDE_RENDERERS[kind]) return;
        const vs = variantsFor(kind);
        const segHasIt = vs.includes(segKey);
        const targetSeg = segHasIt ? segKey : vs[0];
        const i = next.findIndex(d => d.kind === kind);
        if (i === -1) {
          next.push({
            uid: `s-${kind}-${Date.now()}`,
            kind, segment: targetSeg, enabled: segHasIt,
          });
        } else {
          next[i] = { ...next[i], segment: targetSeg, enabled: segHasIt };
        }
      });
      return next;
    });
  };

  // Lista de tipos a mostrar en el picker, en orden canónico + customs al final.
  const kindList = useMemo(() => {
    const base = KIND_ORDER.filter(k => !!SLIDE_RENDERERS[k]);
    const customs = (customSlides || []).map(c => c.kind);
    return [...base, ...customs];
  }, [customSlides]);

  const enabledCount = useMemo(() => (
    draft.filter(d => d.enabled).length
  ), [draft]);

  const buildSlideProps = (kind, segment) => {
    const segObj = SEGMENTS[segment] || SEGMENTS.master;
    return {
      segment: segObj,
      clientName: client?.clientName || 'Cliente',
      propId: client?.propId || '—',
      propDate: client?.propDate || '',
      account: client?.account || '',
      accountEmail: client?.accountEmail || '',
      fields: segObj.fields,
      totalSlides: enabledCount || 1,
      idx: 0,
      prices,
    };
  };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Tipos de lámina · elige variante</div>
            <h2 className="picker-title">Armado de la cotización</h2>
            <div className="picker-sub">
              {triageSegment
                ? <>Recomendado para tu cliente <strong>{SEG_LABEL[triageSegment]}</strong>. Cambia la variante en el tipo que quieras.</>
                : <>Cada tipo de lámina tiene variantes por segmento. Click en la variante que quieras usar.</>}
            </div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="picker-presets">
          <span className="picker-presets-label">Aplicar copy de un segmento a todos los tipos:</span>
          {['longtail','core','key','enterprise','master'].map(seg => (
            <button key={seg}
                    onClick={() => { if (confirm(`Aplicar el copy "${SEG_SHORT[seg]}" a todos los tipos de slide?`)) applyAllVariants(seg); }}
                    className={`picker-preset-btn ${seg === triageSegment ? 'is-recommended' : ''}`}>
              <span className="picker-preset-dot" style={{ background: SEG_COLOR[seg] }} />
              {SEG_SHORT[seg]}
              {seg === triageSegment && <span className="picker-preset-tag">★</span>}
            </button>
          ))}
        </div>

        <div className="picker-sections">
          {kindList.map(kind => {
            const row = getRow(kind);
            const isEnabled = !!row?.enabled;
            const currentSegment = row?.segment;
            const isCustom = typeof kind === 'string' && kind.startsWith('custom-');
            const variants = isCustom ? ['master'] : variantsFor(kind);
            const recommended = (triageSegment && variants.includes(triageSegment)) ? triageSegment : null;
            const Renderer = rendererFor(kind, customSlides);
            if (!Renderer) return null;
            return (
              <section key={kind} className={`picker-kind ${isEnabled ? 'is-on' : 'is-off'}`}>
                <header className="picker-kind-head">
                  <div className="picker-kind-info">
                    <div className="picker-kind-title-row">
                      <h3 className="picker-kind-title">{labelFor(kind, customSlides)}</h3>
                      {isEnabled
                        ? <span className="picker-kind-status on">Incluida en la cotización</span>
                        : <span className="picker-kind-status off">No incluida</span>}
                    </div>
                    <div className="picker-kind-desc">{descFor(kind, customSlides)}</div>
                  </div>
                  <div className="picker-kind-actions">
                    <button
                      onClick={() => toggleKindEnabled(kind)}
                      className={`picker-kind-toggle ${isEnabled ? 'on' : ''}`}
                      title={isEnabled ? 'Quitar este tipo del deck' : 'Incluir este tipo en el deck'}>
                      {isEnabled ? '✓ Incluida' : '+ Incluir'}
                    </button>
                  </div>
                </header>

                <div className="picker-variants">
                  {variants.map(seg => {
                    const isSelected = isEnabled && currentSegment === seg;
                    const isRecommended = seg === recommended;
                    const slideProps = buildSlideProps(kind, seg);
                    return (
                      <div key={seg}
                           className={`picker-variant ${isSelected ? 'is-selected' : ''} ${isRecommended ? 'is-recommended' : ''}`}
                           onClick={() => setVariantForKind(kind, seg)}>
                        {isRecommended && (
                          <span className="picker-variant-badge" title="Recomendado para tu cliente según el triage">
                            ★ Recomendado
                          </span>
                        )}
                        <div className="picker-variant-check" title={isSelected ? 'Variante seleccionada' : 'Click para seleccionar'}>
                          {isSelected ? '✓' : ''}
                        </div>
                        <SlidePreview
                          Renderer={Renderer}
                          slideProps={slideProps}
                          onClick={() => setVariantForKind(kind, seg)}
                        />
                        <div className="picker-variant-foot">
                          <span className="picker-variant-dot" style={{ background: SEG_COLOR[seg] }} />
                          <span className="picker-variant-name">{SEG_SHORT[seg]}</span>
                          <button
                            className="picker-variant-expand"
                            onClick={(e) => { e.stopPropagation(); setFullPreviewTarget({ kind, segment: seg }); }}
                            title="Ver a pantalla completa">
                            ⤢
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* ── Vista previa y orden · arrastra o usa ▲ ▼ para reordenar ── */}
          <section className="picker-order-section">
            <div className="picker-order-head">
              <span className="picker-order-eyebrow">Vista previa y orden</span>
              <h3 className="picker-order-title">Orden del deck</h3>
              <span className="picker-order-count">
                {enabledCount} {enabledCount === 1 ? 'lámina' : 'láminas'}
              </span>
              <span className="picker-order-hint">
                {enabledCount > 1 ? 'Arrastra o usa ▲ ▼ para reordenar' : 'Activa al menos 2 tipos para reordenar'}
              </span>
              <button
                className="picker-order-reset"
                onClick={() => {
                  if (confirm('Restablecer el orden del deck al machote MASTER?')) {
                    setDraft(defaultSelected());
                  }
                }}
                title="Volver al orden por defecto del machote master"
              >
                ↺ Restablecer orden por defecto
              </button>
            </div>
            {enabledCount === 0 ? (
              <div className="picker-order-empty">
                Aún no incluiste ninguna lámina. Activa tipos arriba y aparecerán aquí en el orden en que se mostrarán.
              </div>
            ) : (
              <div className="picker-order-strip">
                {draft.filter(d => d.enabled).map((row, i) => {
                  const Renderer = rendererFor(row.kind, customSlides);
                  if (!Renderer) return null;
                  const slideProps = buildSlideProps(row.kind, row.segment);
                  const isDragging = dragKind === row.kind;
                  const isDragOver = overKind === row.kind && dragKind !== row.kind;
                  const isFirst = i === 0;
                  const isLast = i === enabledCount - 1;
                  return (
                    <div key={row.uid || row.kind}
                         draggable
                         onDragStart={onDragStart(row.kind)}
                         onDragOver={onDragOver(row.kind)}
                         onDragEnd={onDragEnd}
                         onDrop={onDrop(row.kind)}
                         className={`picker-order-item ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-dragover' : ''}`}
                         title="Arrastra o usa ▲ ▼ para mover">
                      <div className="picker-order-num">#{String(i + 1).padStart(2,'0')}</div>
                      <div className="picker-order-grip" aria-hidden="true">⋮⋮</div>
                      <div className="picker-order-moves">
                        <button
                          className="picker-order-move"
                          disabled={isFirst}
                          onClick={(e) => { e.stopPropagation(); moveUp(row.kind); }}
                          title="Subir"
                          aria-label="Subir"
                        >▲</button>
                        <button
                          className="picker-order-move"
                          disabled={isLast}
                          onClick={(e) => { e.stopPropagation(); moveDown(row.kind); }}
                          title="Bajar"
                          aria-label="Bajar"
                        >▼</button>
                      </div>
                      <SlidePreview
                        Renderer={Renderer}
                        slideProps={slideProps}
                      />
                      <div className="picker-order-foot">
                        <span className="picker-order-name">{labelFor(row.kind, customSlides)}</span>
                        <span className="picker-order-seg">
                          <span className="picker-order-dot" style={{ background: SEG_COLOR[row.segment] }} />
                          {SEG_SHORT[row.segment] || row.segment}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
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

        {fullPreviewTarget && (() => {
          const { kind, segment } = fullPreviewTarget;
          const row = getRow(kind);
          const isSelectedVariant = !!row?.enabled && row?.segment === segment;
          return (
            <FullPreview
              kind={kind}
              segmentName={SEG_LABEL[segment] || segment}
              Renderer={rendererFor(kind, customSlides)}
              slideProps={buildSlideProps(kind, segment)}
              enabled={isSelectedVariant}
              onToggle={() => setVariantForKind(kind, segment)}
              onClose={() => setFullPreviewTarget(null)}
            />
          );
        })()}
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
                  <div className="prices-line-sel-wrap">
                    <select className="prices-line-sel" value={line.difusor}
                            onChange={e => updateLine(line.id, { difusor: e.target.value })}>
                      {DIFUSORES_PRECIO.map(d => (
                        <option key={d.id} value={d.id}>{d.name} · {fmtMx(d.precio)}/mes</option>
                      ))}
                    </select>
                    {line.fromScentIQ && <span className="siq-badge" title="Agregado por Scent Advisor">Scent IQ</span>}
                  </div>
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
