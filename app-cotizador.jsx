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
  try { localStorage.setItem(CUSTOM_LS, JSON.stringify(arr || [])); return true; }
  catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      alert('No se pudo guardar · el almacenamiento local está lleno. Elimina slides custom antiguos o usa imágenes más chicas.');
    }
    return false;
  }
}
// Inserta una row en un array de selected segun pos:
//   'start' -> al inicio  ·  'end'/null -> al final  ·  kindX -> después de kindX.
function insertSlideAt(arr, row, pos) {
  const next = [...arr];
  if (pos === 'start') { next.unshift(row); return next; }
  if (!pos || pos === 'end') { next.push(row); return next; }
  const idx = next.findIndex(s => s.kind === pos);
  if (idx < 0) { next.push(row); return next; }
  next.splice(idx + 1, 0, row);
  return next;
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

// Fecha dinamica para nuevas cotizaciones · "14 MAY 2026" segun el dia
// que el ejecutivo abre la app. Si el usuario ya tiene una cotizacion
// guardada en localStorage con propDate custom, ese valor se preserva
// (loadState gana sobre CLIENT_DEFAULTS).
function getDefaultPropDate() {
  const d = new Date();
  const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return String(d.getDate()).padStart(2, '0') + ' ' + meses[d.getMonth()] + ' ' + d.getFullYear();
}

const CLIENT_DEFAULTS = {
  clientName: "Cliente",
  propId: "PROP-2026-001",
  propDate: getDefaultPropDate(),
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
  // Coach mark del primer ingreso · LS: olfativa.coachSeen
  const [coachOpen, setCoachOpen] = useState(() => {
    try { return localStorage.getItem('olfativa.coachSeen') !== '1'; }
    catch { return true; }
  });
  // Soft tip cuando el ejecutivo se salta un paso (siempre permite continuar)
  const [softTip, setSoftTip] = useState(null);
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
    // Reset también re-arma el coach mark de bienvenida.
    setCoachOpen(true);
    setSoftTip(null);
    // UX feedback
    try {
      window.dispatchEvent(new CustomEvent('olfativa:scent-applied', {
        detail: { __toast: 'Cotización restablecida · cliente, deck, precios y Scent Advisor reiniciados.' }
      }));
    } catch (_) {}
    try { window.scrollTo(0, 0); } catch (_) {}
  };

  // ── Soft guides · si saltas un paso, mostramos un tip (no bloquea) ──
  const dismissCoach = () => {
    setCoachOpen(false);
    try { localStorage.setItem('olfativa.coachSeen', '1'); } catch (_) {}
  };
  const isClientUnset = !client.clientName || client.clientName.trim() === '' || client.clientName.trim() === CLIENT_DEFAULTS.clientName;
  const hasAnyPriceLine = (prices?.lines || []).some(l => Number(l.cant) > 0 && l.difusor);
  const openScentIQGuarded = () => {
    if (isClientUnset) {
      setSoftTip({
        eyebrow: 'Tip de flujo',
        body: 'Configura primero el cliente para que la propuesta tenga su nombre. Puedes seguir y editarlo después.',
        primary: { label: 'Configurar cliente', onClick: () => { setSoftTip(null); setClientOpen(true); } },
        ghost:   { label: 'Continuar al Scent Advisor', onClick: () => { setSoftTip(null); setScentIQOpen(true); } },
      });
      return;
    }
    setScentIQOpen(true);
  };
  const openDownloadGuarded = () => {
    if (!hasAnyPriceLine) {
      setSoftTip({
        eyebrow: 'Antes de descargar',
        body: 'Aún no hay líneas de precios cargadas. La cotización saldrá sin el slide de inversión.',
        primary: { label: 'Definir precios', onClick: () => { setSoftTip(null); setPricesOpen(true); } },
        ghost:   { label: 'Continuar a descarga', onClick: () => { setSoftTip(null); setDownloadOpen(true); } },
      });
      return;
    }
    setDownloadOpen(true);
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
        onOpenScentIQ={openScentIQGuarded}
        onOpenAdmin={() => setAdminOpen(true)}
        onDownload={openDownloadGuarded}
        onReset={reset}
      />

      {coachOpen && (
        <div className="coach-mark" role="status">
          <span className="coach-dot" aria-hidden="true" />
          <span>Empieza por <span className="coach-step">Cliente</span><span className="coach-sep">·</span>luego <span className="coach-step">Scent Advisor</span><span className="coach-sep">·</span>después <span className="coach-step">Precios</span></span>
          <button className="coach-close" onClick={dismissCoach} aria-label="Cerrar guía">×</button>
        </div>
      )}

      {softTip && (
        <div className="soft-tip" role="dialog" aria-live="polite">
          <div className="soft-tip-body">
            <div className="soft-tip-eyebrow">{softTip.eyebrow}</div>
            <div>{softTip.body}</div>
            <div className="soft-tip-actions">
              <button className="soft-tip-primary" onClick={softTip.primary.onClick}>{softTip.primary.label}</button>
              <button className="soft-tip-ghost" onClick={softTip.ghost.onClick}>{softTip.ghost.label}</button>
            </div>
          </div>
          <button className="soft-tip-close" onClick={() => setSoftTip(null)} aria-label="Cerrar tip">×</button>
        </div>
      )}

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
          enabledKinds={new Set(selected.filter(s => s.enabled).map(s => s.kind))}
          selected={selected}
          onClose={() => setAdminOpen(false)}
          onToggleInDeck={(kind, on) => {
            setSelected(prev => {
              const idx = prev.findIndex(s => s.kind === kind);
              if (idx === -1) {
                if (!on) return prev;
                // Insertar respetando insertAfter del custom slide si existe
                const cs = customSlides.find(c => c.kind === kind);
                const row = {
                  uid: `s-${kind}-${Date.now()}`,
                  kind,
                  segment: (cs && cs.segment) || 'master',
                  enabled: true,
                };
                return insertSlideAt(prev, row, cs?.insertAfter || 'end');
              }
              if (!on) return prev.filter((_, i) => i !== idx);
              return prev.map((s, i) => i === idx ? { ...s, enabled: true } : s);
            });
          }}
          onSave={(arr, newlyCreatedKinds) => {
            const oldMap = new Map((customSlides || []).map(s => [s.kind, s]));
            setCustomSlides(arr);
            const newIds = new Set(arr.map(s => s.id));
            const removedKinds = (customSlides || [])
              .filter(s => !newIds.has(s.id))
              .map(s => s.kind);

            setSelected(prev => {
              let next = [...prev];
              // 1. Remover los eliminados
              if (removedKinds.length) next = next.filter(s => !removedKinds.includes(s.kind));
              // 2. Para cada slide del nuevo array, decidir agregar o mover
              arr.forEach(slide => {
                const exists = next.find(s => s.kind === slide.kind);
                const isNew = (newlyCreatedKinds || []).includes(slide.kind);
                const old = oldMap.get(slide.kind);
                const positionChanged = old && old.insertAfter !== slide.insertAfter;
                if (!exists && isNew) {
                  // Agregar en la posicion indicada
                  const row = {
                    uid: `s-${slide.kind}-${Date.now()}`,
                    kind: slide.kind,
                    segment: slide.segment || 'master',
                    enabled: true,
                  };
                  next = insertSlideAt(next, row, slide.insertAfter || 'end');
                } else if (exists && positionChanged) {
                  // Mover a la nueva posicion (preservando uid + enabled + segment)
                  const row = { ...exists, segment: slide.segment || exists.segment };
                  next = next.filter(s => s.kind !== slide.kind);
                  next = insertSlideAt(next, row, slide.insertAfter || 'end');
                } else if (exists && slide.segment && slide.segment !== exists.segment) {
                  // Solo cambio de segmento
                  next = next.map(s => s.kind === slide.kind ? { ...s, segment: slide.segment } : s);
                }
              });
              return next;
            });

            const n = (newlyCreatedKinds || []).length;
            if (n > 0) {
              const firstNew = arr.find(s => s.kind === newlyCreatedKinds[0]);
              const where = firstNew ? (firstNew.insertAfter === 'start' ? 'al inicio del deck'
                : firstNew.insertAfter === 'end' ? 'al final del deck'
                : `después de ${SLIDE_LABELS[firstNew.insertAfter] || firstNew.insertAfter}`) : 'al deck';
              try {
                window.dispatchEvent(new CustomEvent('olfativa:scent-applied', {
                  detail: { __toast: n === 1 ? `Slide agregado ${where}.` : `${n} slides agregados al deck.` }
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
        <button className="btn-secondary" onClick={onOpenClient} title="Editar nombre del cliente, ID, fecha y ejecutivo">
          Cliente
        </button>
        <button className="btn-secondary" onClick={onOpenScentIQ} title="Análisis olfativo por foto del espacio (Scent Advisor)">
          Scent Advisor
        </button>
        <button className="btn-secondary" onClick={onOpenPrices} title="Calcular precios y generar slide de cotización">
          Precios
        </button>
        <button className="btn-secondary" onClick={onOpenAdmin} title="Admin · slides personalizados">
          Admin
        </button>
        <button className="btn-primary" onClick={onOpenPicker}>
          <span className="btn-icon">▦</span>
          Láminas <span className="btn-counter">{total} / {totalAvailable}</span>
        </button>
        <button className="btn-download" onClick={onDownload} title="Revisar resumen y descargar la cotización">
          <span className="btn-icon">↓</span> Descargar
        </button>
        <span className="topbar-reset-divider" aria-hidden="true" />
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
// Helper: titulo default tipo "Slide custom 13 may 21:30"
function defaultSlideTitle() {
  const d = new Date();
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Slide custom ${d.getDate()} ${months[d.getMonth()]} ${hh}:${mm}`;
}

// ============================================================
// CatalogEditor — pestaña Admin para que Tony edite el catálogo
// de aromas. Persiste en localStorage.olfativa.catalogOverrides
// vía window.OLF_IA.setCatalog (alias de OLF_KNOW.setCatalog).
// Soporta export/import JSON y restauración al bundle default.
//
// Ronda 6 · marco 5 sentidos. Click en un aroma de la lista abre
// CatalogAromaModal con 3 secciones visualmente separadas:
//   · SECCIÓN 1 (verde) · perfil sensorial 5 sentidos · campos
//     TIPO A derivados de foundations.json. Cada campo muestra punto
//     de confianza (verde = override Tony, amarillo = sugerido alta o
//     media, gris = baja o sin dato) y botón "Restaurar a sugerencia".
//   · SECCIÓN 2 (ámbar) · voz de Tony · campos TIPO B humanos sin
//     sugerencia automática. notas_internas_tony es privado y nunca
//     viaja al proxy de visión.
//   · SECCIÓN 3 (gris) · operacional · nombre, familia, notas,
//     descripción, tags visuales, precio relativo, stock, marca,
//     inspiración, rating.
// ============================================================
const CATALOG_TEXTAREA_FIELDS = [
  { key: 'contextos_recomendados', label: 'Contextos recomendados', hint: 'Una línea por contexto · ej "oficina ejecutiva".' },
  { key: 'contextos_a_evitar',     label: 'Contextos a evitar',     hint: 'Una línea por anti-contexto · ej "espacios costeros".' },
];
const linesToArray = (s) => String(s || '').split('\n').map(t => t.trim()).filter(Boolean);
const arrayToLines = (a) => (Array.isArray(a) ? a.join('\n') : '');
const csvToArray = (s) => String(s || '').split(',').map(t => t.trim()).filter(Boolean);
const arrayToCsv = (a) => (Array.isArray(a) ? a.join(', ') : '');

// Vocabularios controlados · si el JSON de foundations ya está cargado,
// los leemos de ahí; sino, fallback al hardcode (la UI no se rompe).
function getFoundationsVocab() {
  const F = (window.OLF_KNOW && window.OLF_KNOW.foundations) || null;
  const v = F && F.meta && F.meta.vocabularios_controlados ? F.meta.vocabularios_controlados : {};
  return {
    familia_visual_compatible:        v.familia_visual_compatible        || ['minimalista_nordico','japandi','boho_mediterraneo','contemporaneo_calido','clasico_transicional','industrial','glam_nocturno','arabe_contemporaneo','biophilic','costero_tropical'],
    tipo_luz_compatible:              v.tipo_luz_compatible              || ['led_frio_5000k','neutro_4000k','calido_2700k','ambar_2200k','mixto'],
    intensidad_luminica:              v.intensidad_luminica              || ['alta_directa','media_difusa','baja_intima'],
    texturas_compatibles:             v.texturas_compatibles             || ['lino_algodon','vidrio_metal_pulido','madera_natural','boucle_lana','terciopelo_seda','cuero','marmol','latones','ratan_yute','cemento_pulido'],
    peso_visual_mobiliario:           v.peso_visual_mobiliario           || ['ligero','medio','opulento'],
    densidad_textil:                  v.densidad_textil                  || ['etereo','ligero','medio','denso','opulento'],
    generos_musicales_compatibles:    v.generos_musicales_compatibles    || [],
    instrumentacion_predominante:     v.instrumentacion_predominante     || ['cuerdas','piano','electronica','voz','mixto'],
    ambiente_sonoro:                  v.ambiente_sonoro                  || ['silencio_natural','murmullo_humano','musica_protagonista'],
    tipos_cocina_compatibles:         v.tipos_cocina_compatibles         || ['mediterranea','asiatica_oriental','mexicana_contemporanea','internacional_lujo','comfort_food','sushi_omakase','parrilla_steakhouse','pasteleria_cafeteria','vegetariana_saludable','fine_dining_creativo'],
    sabores_predominantes_compatibles:v.sabores_predominantes_compatibles|| ['dulce','salado','umami','acido_citrico','amargo','picante'],
    tipos_bebida_compatibles:         v.tipos_bebida_compatibles         || ['cocteleria_clasica','cocteleria_de_autor','mocktails','vinos_tintos','vinos_blancos','vinos_espumosos','destilados_premium','cafe_especialidad','te_e_infusiones','refrescos_y_jugos','cerveza_artesanal'],
    momento_consumo:                  v.momento_consumo                  || ['desayuno','brunch','almuerzo','merienda','cena','coctel_post_cena'],
    energia:                          v.energia                          || ['calmante','neutra','estimulante','euforizante'],
    temperatura_emocional:            v.temperatura_emocional            || ['frio','fresco','templado','calido','caliente'],
    persistencia:                     v.persistencia                     || ['corta','media','larga'],
    playlist_etiqueta:                v.playlist_etiqueta                || ['core','soporte','comercial'],
  };
}

function readCatalogFromGlobals() {
  try {
    if (window.OLF_IA && Array.isArray(window.OLF_IA.catalog)) {
      // Deep clone para que el draft no mute la fuente.
      return window.OLF_IA.catalog.map(a => JSON.parse(JSON.stringify(a)));
    }
  } catch (_) {}
  return [];
}

// Valor efectivo = override si existe, sino sugerido
function getEffectiveTipoA(aroma, fieldId) {
  if (!aroma || !aroma.tipo_a || !aroma.tipo_a[fieldId]) return null;
  const s = aroma.tipo_a[fieldId];
  if (s.valor_override !== null && s.valor_override !== undefined) return s.valor_override;
  return s.valor_sugerido;
}

// Estado de confianza para el dot indicador
//  verde  · Tony aplicó override
//  amarillo · sugerido alta o media
//  gris   · sin dato o baja
function getConfidenceClass(slot) {
  if (!slot) return 'siq-dot-gray';
  if (slot.valor_override !== null && slot.valor_override !== undefined) return 'siq-dot-green';
  if (slot.confianza === 'alta' || slot.confianza === 'media') return 'siq-dot-yellow';
  return 'siq-dot-gray';
}

function ConfidenceDot({ slot, title }) {
  const cls = getConfidenceClass(slot);
  const tip = title || (slot && slot.valor_override !== null && slot.valor_override !== undefined
    ? 'Override aplicado por Tony · sobreescribe la sugerencia'
    : slot && (slot.confianza === 'alta' || slot.confianza === 'media')
      ? `Sugerido por foundations · confianza ${slot.confianza}`
      : 'Sin dato o confianza baja · llene a mano o restaure a la sugerencia');
  return <span className={"siq-dot " + cls} title={tip} aria-label={tip}></span>;
}

// TIPO B completitud · cuántos campos humanos están llenos
function tipoBProgress(aroma) {
  const tb = aroma && aroma.tipo_b;
  if (!tb) return 0;
  const filled = [];
  if (tb.a_que_huele && String(tb.a_que_huele).trim()) filled.push(1);
  if (Array.isArray(tb.adjetivos_vivenciales) && tb.adjetivos_vivenciales.length) filled.push(1);
  if (tb.nivel_de_agrado_real) filled.push(1);
  if (tb.intensidad_real_medida != null) filled.push(1);
  if (tb.gusta_o_no_gusta && (tb.gusta_o_no_gusta.value !== null || (tb.gusta_o_no_gusta.razon || '').trim())) filled.push(1);
  if (tb.anecdotas_de_uso && String(tb.anecdotas_de_uso).trim()) filled.push(1);
  if (tb.notas_internas_tony && String(tb.notas_internas_tony).trim()) filled.push(1);
  if (Array.isArray(tb.aromas_combos) && tb.aromas_combos.length) filled.push(1);
  if (Array.isArray(tb.aromas_rivales) && tb.aromas_rivales.length) filled.push(1);
  return filled.length;
}
function tipoBStatus(aroma) {
  const n = tipoBProgress(aroma);
  if (n === 0) return 'vacio';
  if (n < 5) return 'parcial';
  return 'completo';
}

// Detección de gastronómico para la subsección 1.5 Gusto
function isGastronomico(aroma) {
  const tci = getEffectiveTipoA(aroma, 'tipo_cliente_ideal') || [];
  if (!Array.isArray(tci)) return false;
  return tci.some(s => /gastronomico|gastronómico|hospitality_food|cafeteria|cafetería|restaurante|bar/i.test(String(s)));
}

// Validación suave de playlist: min 3 géneros, ≥1 comercial
function validatePlaylist(playlist) {
  if (!Array.isArray(playlist) || playlist.length === 0) {
    return { ok: false, msg: 'Sin playlist · agrega al menos 3 géneros, incluyendo uno comercial.' };
  }
  if (playlist.length < 3) {
    return { ok: false, msg: 'Sugerencia: agrega al menos 3 géneros distintos para cubrir todos los perfiles del cliente final.' };
  }
  const hasComercial = playlist.some(p => p && p.etiqueta === 'comercial');
  if (!hasComercial) {
    return { ok: false, msg: 'Sugerencia: incluye al menos un género con etiqueta "comercial" como gancho masivo.' };
  }
  return { ok: true, msg: '' };
}

// =============================================================
// Componente · TipoAField · render genérico de un campo TIPO A
// Maneja: dot de confianza, sugerencia gris a la izquierda, input
// override a la derecha, botón "Restaurar".
// =============================================================
function TipoAField({ aroma, fieldId, label, shape, options, placeholder, onChange, onRestore }) {
  const slot = aroma && aroma.tipo_a && aroma.tipo_a[fieldId];
  if (!slot) return null;
  const sug   = slot.valor_sugerido;
  const ovr   = slot.valor_override;
  const eff   = (ovr !== null && ovr !== undefined) ? ovr : sug;
  const hasOvr = (ovr !== null && ovr !== undefined);

  const sugDisplay = Array.isArray(sug) ? (sug.length ? sug.join(', ') : '—')
                   : (sug && typeof sug === 'object') ? JSON.stringify(sug)
                   : (sug || '—');

  const renderInput = () => {
    if (shape === 'enum' && options) {
      return (
        <select className="siq-tipoa-input" value={(eff || '')} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">— sin valor —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (shape === 'enum_multi' && options) {
      const arr = Array.isArray(eff) ? eff : [];
      return (
        <div className="siq-tipoa-chips">
          {options.map(o => {
            const on = arr.indexOf(o) >= 0;
            return (
              <button
                type="button"
                key={o}
                className={"siq-chip" + (on ? ' is-on' : '')}
                onClick={() => {
                  const next = on ? arr.filter(x => x !== o) : arr.concat(o);
                  onChange(next);
                }}>{o}</button>
            );
          })}
        </div>
      );
    }
    if (shape === 'numero') {
      return (
        <input
          type="number"
          className="siq-tipoa-input"
          value={(eff === null || eff === undefined) ? '' : eff}
          min={placeholder && placeholder.min}
          max={placeholder && placeholder.max}
          step="1"
          onChange={(e) => {
            const n = e.target.value === '' ? null : Number(e.target.value);
            onChange(n);
          }}
        />
      );
    }
    if (shape === 'lista_libre') {
      const arr = Array.isArray(eff) ? eff : [];
      return (
        <textarea
          className="siq-tipoa-input siq-tipoa-textarea"
          rows={2}
          placeholder={typeof placeholder === 'string' ? placeholder : 'Una línea por valor'}
          value={arrayToLines(arr)}
          onChange={(e) => onChange(linesToArray(e.target.value))}
        />
      );
    }
    if (shape === 'texto') {
      return (
        <textarea
          className="siq-tipoa-input siq-tipoa-textarea"
          rows={2}
          placeholder={typeof placeholder === 'string' ? placeholder : ''}
          value={eff || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    // default: texto plano
    return (
      <input
        type="text"
        className="siq-tipoa-input"
        value={(eff === null || eff === undefined) ? '' : String(eff)}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  return (
    <div className="siq-tipoa-field">
      <div className="siq-tipoa-head">
        <ConfidenceDot slot={slot} />
        <span className="siq-tipoa-label">{label}</span>
        {hasOvr && (
          <button type="button" className="siq-tipoa-restore" onClick={onRestore} title="Restaurar valor sugerido por foundations">
            ↺ Restaurar
          </button>
        )}
      </div>
      <div className="siq-tipoa-sug" title="Valor sugerido por foundations">
        sugerido: <code>{sugDisplay}</code>
      </div>
      <div className="siq-tipoa-input-wrap">{renderInput()}</div>
    </div>
  );
}

// =============================================================
// Componente · NivelVolumenField · {escala 1-10, rango_db_sugerido}
// =============================================================
function NivelVolumenField({ aroma, onChange, onRestore }) {
  const slot = aroma && aroma.tipo_a && aroma.tipo_a.nivel_volumen_exacto;
  if (!slot) return null;
  const eff   = slot.valor_override || slot.valor_sugerido || {};
  const hasOvr = !!slot.valor_override;
  return (
    <div className="siq-tipoa-field">
      <div className="siq-tipoa-head">
        <ConfidenceDot slot={slot} />
        <span className="siq-tipoa-label">Nivel de volumen exacto</span>
        {hasOvr && (
          <button type="button" className="siq-tipoa-restore" onClick={onRestore} title="Restaurar valor sugerido por foundations">↺ Restaurar</button>
        )}
      </div>
      <div className="siq-tipoa-sug">
        sugerido: <code>{slot.valor_sugerido ? `escala ${slot.valor_sugerido.escala} · ${slot.valor_sugerido.rango_db_sugerido}` : '—'}</code>
      </div>
      <div className="siq-tipoa-input-wrap siq-tipoa-row">
        <label className="siq-tipoa-sub">
          <span>Escala (1-10)</span>
          <input type="number" min="1" max="10" step="1" className="siq-tipoa-input siq-tipoa-input-num"
            value={eff.escala || ''}
            onChange={(e) => onChange({ ...eff, escala: e.target.value === '' ? null : Number(e.target.value) })} />
        </label>
        <label className="siq-tipoa-sub">
          <span>Rango dB sugerido</span>
          <input type="text" placeholder="ej. 45-55 dB" className="siq-tipoa-input"
            value={eff.rango_db_sugerido || ''}
            onChange={(e) => onChange({ ...eff, rango_db_sugerido: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

// =============================================================
// Componente · PlaylistField · array de {genero, etiqueta, ejemplo}
// Validación suave: mín 3 géneros, ≥1 con etiqueta "comercial".
// =============================================================
function PlaylistField({ aroma, onChange, onRestore }) {
  const slot = aroma && aroma.tipo_a && aroma.tipo_a.playlist_sugerida;
  if (!slot) return null;
  const eff   = (slot.valor_override !== null && slot.valor_override !== undefined)
    ? slot.valor_override
    : (slot.valor_sugerido || []);
  const hasOvr = (slot.valor_override !== null && slot.valor_override !== undefined);
  const v     = validatePlaylist(eff);
  const tags  = getFoundationsVocab().playlist_etiqueta;

  const updateItem = (i, key, value) => {
    const next = eff.slice();
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };
  const removeItem = (i) => {
    const next = eff.slice();
    next.splice(i, 1);
    onChange(next);
  };
  const addItem = () => onChange(eff.concat([{ genero: '', etiqueta: 'soporte', ejemplo_artista_o_track: '' }]));

  return (
    <div className="siq-tipoa-field">
      <div className="siq-tipoa-head">
        <ConfidenceDot slot={slot} />
        <span className="siq-tipoa-label">Playlist sugerida</span>
        {hasOvr && (
          <button type="button" className="siq-tipoa-restore" onClick={onRestore} title="Restaurar sugerencia">↺ Restaurar</button>
        )}
      </div>
      {!v.ok && (
        <div className="siq-tipoa-warn">⚠ {v.msg}</div>
      )}
      <div className="siq-playlist">
        {eff.map((item, i) => (
          <div className="siq-playlist-row" key={i}>
            <input
              type="text"
              className="siq-tipoa-input siq-playlist-genero"
              placeholder="género (ej. jazz_lounge)"
              value={item.genero || ''}
              onChange={(e) => updateItem(i, 'genero', e.target.value)} />
            <select
              className="siq-tipoa-input siq-playlist-tag"
              value={item.etiqueta || 'soporte'}
              onChange={(e) => updateItem(i, 'etiqueta', e.target.value)}>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="text"
              className="siq-tipoa-input siq-playlist-ej"
              placeholder="artista / track (opcional)"
              value={item.ejemplo_artista_o_track || ''}
              onChange={(e) => updateItem(i, 'ejemplo_artista_o_track', e.target.value)} />
            <button type="button" className="siq-playlist-del" onClick={() => removeItem(i)} aria-label="Eliminar">×</button>
          </div>
        ))}
        <button type="button" className="siq-playlist-add" onClick={addItem}>+ agregar género</button>
      </div>
    </div>
  );
}

// =============================================================
// Componente · CatalogAromaModal · 3 secciones visualmente separadas
// =============================================================
function CatalogAromaModal({ aroma, onChange, onClose, onSave }) {
  // Subsecciones colapsables · 1.5 Gusto colapsada por default a menos
  // que tipo_cliente_ideal incluya gastronomico/hospitality_food.
  const gastro = useMemo(() => isGastronomico(aroma), [aroma]);
  const [open, setOpen] = useState({
    olfato: true,
    vista: true,
    tacto: true,
    oido: true,
    gusto: gastro,
    voz: true,
    op: true
  });
  useEffect(() => {
    // Si cambia el flag gastronomico (override de tipo_cliente_ideal), reflejarlo
    setOpen(prev => ({ ...prev, gusto: prev.gusto || gastro }));
  }, [gastro]);

  const vocab = getFoundationsVocab();

  // Helper para actualizar un campo TIPO A (escribe en valor_override)
  const updateTipoA = (fieldId, value) => {
    onChange(prev => ({
      ...prev,
      tipo_a: {
        ...prev.tipo_a,
        [fieldId]: { ...prev.tipo_a[fieldId], valor_override: value }
      }
    }));
  };
  const restoreTipoA = (fieldId) => {
    onChange(prev => ({
      ...prev,
      tipo_a: {
        ...prev.tipo_a,
        [fieldId]: { ...prev.tipo_a[fieldId], valor_override: null }
      }
    }));
  };

  const updateTipoB = (fieldId, value) => {
    onChange(prev => ({
      ...prev,
      tipo_b: { ...prev.tipo_b, [fieldId]: value }
    }));
  };

  const updateOp = (key, value) => onChange(prev => ({ ...prev, [key]: value }));

  if (!aroma) return null;

  return (
    <div className="siq-modal-backdrop" onClick={(e) => { if (e.target.classList.contains('siq-modal-backdrop')) onClose(); }}>
      <div className="siq-modal siq-modal-catalog" role="dialog" aria-modal="true">
        <header className="siq-modal-head">
          <div>
            <div className="siq-modal-eyebrow">Editor de aroma · ronda 6 · 5 sentidos</div>
            <h2 className="siq-modal-title">{aroma.nombre || '(sin nombre)'}</h2>
            <div className="siq-modal-sub">{aroma.familia_olfativa || aroma.familia || 'sin familia'} · {aroma.sublinea || 'sin sublínea'}</div>
          </div>
          <button className="siq-modal-close" onClick={onClose} aria-label="Cerrar editor">×</button>
        </header>

        <div className="siq-modal-body">

          {/* ============================================
              SECCIÓN 1 · PERFIL SENSORIAL 5 SENTIDOS
              =============================================*/}
          <section className="siq-section siq-section-1">
            <h3 className="siq-section-title">1. Perfil sensorial · los 5 sentidos del aroma</h3>
            <p className="siq-section-help">
              Campos derivados automáticamente de <code>foundations.json</code>. Cada uno muestra punto de confianza
              (<span className="siq-dot siq-dot-green"></span> override aplicado · <span className="siq-dot siq-dot-yellow"></span> sugerencia
              de foundations · <span className="siq-dot siq-dot-gray"></span> sin dato). Edite a la derecha para sobrescribir;
              use <em>Restaurar</em> para volver a la sugerencia.
            </p>

            {/* 1.1 OLFATO */}
            <div className={"siq-subsection" + (open.olfato ? ' is-open' : '')}>
              <button type="button" className="siq-subsection-head" onClick={() => setOpen(s => ({ ...s, olfato: !s.olfato }))}>
                <span className="siq-subsection-icon">🌫️</span>
                <span className="siq-subsection-num">1.1</span>
                <span className="siq-subsection-name">Olfato · el aroma en sí</span>
                <span className="siq-subsection-chevron">{open.olfato ? '▾' : '▸'}</span>
              </button>
              {open.olfato && (
                <div className="siq-subsection-body">
                  <TipoAField aroma={aroma} fieldId="intensidad_sugerida"   label="Intensidad sugerida (1–5)" shape="numero" placeholder={{min:1,max:5}}
                    onChange={(v) => updateTipoA('intensidad_sugerida', v)} onRestore={() => restoreTipoA('intensidad_sugerida')} />
                  <TipoAField aroma={aroma} fieldId="persistencia"          label="Persistencia"               shape="enum" options={vocab.persistencia}
                    onChange={(v) => updateTipoA('persistencia', v)} onRestore={() => restoreTipoA('persistencia')} />
                  <TipoAField aroma={aroma} fieldId="temperatura_emocional" label="Temperatura emocional"      shape="enum" options={vocab.temperatura_emocional}
                    onChange={(v) => updateTipoA('temperatura_emocional', v)} onRestore={() => restoreTipoA('temperatura_emocional')} />
                  <TipoAField aroma={aroma} fieldId="energia"               label="Energía"                    shape="enum" options={vocab.energia}
                    onChange={(v) => updateTipoA('energia', v)} onRestore={() => restoreTipoA('energia')} />
                </div>
              )}
            </div>

            {/* 1.2 VISTA */}
            <div className={"siq-subsection" + (open.vista ? ' is-open' : '')}>
              <button type="button" className="siq-subsection-head" onClick={() => setOpen(s => ({ ...s, vista: !s.vista }))}>
                <span className="siq-subsection-icon">👁️</span>
                <span className="siq-subsection-num">1.2</span>
                <span className="siq-subsection-name">Vista · qué aroma encaja con el espacio</span>
                <span className="siq-subsection-chevron">{open.vista ? '▾' : '▸'}</span>
              </button>
              {open.vista && (
                <div className="siq-subsection-body">
                  <TipoAField aroma={aroma} fieldId="familia_visual_compatible" label="Familia visual compatible"  shape="enum_multi" options={vocab.familia_visual_compatible}
                    onChange={(v) => updateTipoA('familia_visual_compatible', v)} onRestore={() => restoreTipoA('familia_visual_compatible')} />
                  <TipoAField aroma={aroma} fieldId="paleta_cromatica_sugerida" label="Paleta cromática sugerida"  shape="lista_libre" placeholder="Un color por línea (ej. nogal, beige cálido, dorado mate)"
                    onChange={(v) => updateTipoA('paleta_cromatica_sugerida', v)} onRestore={() => restoreTipoA('paleta_cromatica_sugerida')} />
                  <TipoAField aroma={aroma} fieldId="tipo_luz_compatible"       label="Tipo de luz compatible"     shape="enum_multi" options={vocab.tipo_luz_compatible}
                    onChange={(v) => updateTipoA('tipo_luz_compatible', v)} onRestore={() => restoreTipoA('tipo_luz_compatible')} />
                  <TipoAField aroma={aroma} fieldId="intensidad_luminica"       label="Intensidad lumínica"        shape="enum" options={vocab.intensidad_luminica}
                    onChange={(v) => updateTipoA('intensidad_luminica', v)} onRestore={() => restoreTipoA('intensidad_luminica')} />
                </div>
              )}
            </div>

            {/* 1.3 TACTO */}
            <div className={"siq-subsection" + (open.tacto ? ' is-open' : '')}>
              <button type="button" className="siq-subsection-head" onClick={() => setOpen(s => ({ ...s, tacto: !s.tacto }))}>
                <span className="siq-subsection-icon">✋</span>
                <span className="siq-subsection-num">1.3</span>
                <span className="siq-subsection-name">Tacto · texturas y materiales</span>
                <span className="siq-subsection-chevron">{open.tacto ? '▾' : '▸'}</span>
              </button>
              {open.tacto && (
                <div className="siq-subsection-body">
                  <TipoAField aroma={aroma} fieldId="texturas_compatibles"   label="Texturas compatibles"      shape="enum_multi" options={vocab.texturas_compatibles}
                    onChange={(v) => updateTipoA('texturas_compatibles', v)} onRestore={() => restoreTipoA('texturas_compatibles')} />
                  <TipoAField aroma={aroma} fieldId="peso_visual_mobiliario" label="Peso visual del mobiliario" shape="enum" options={vocab.peso_visual_mobiliario}
                    onChange={(v) => updateTipoA('peso_visual_mobiliario', v)} onRestore={() => restoreTipoA('peso_visual_mobiliario')} />
                  <TipoAField aroma={aroma} fieldId="densidad_textil"        label="Densidad textil"            shape="enum" options={vocab.densidad_textil}
                    onChange={(v) => updateTipoA('densidad_textil', v)} onRestore={() => restoreTipoA('densidad_textil')} />
                </div>
              )}
            </div>

            {/* 1.4 OÍDO */}
            <div className={"siq-subsection" + (open.oido ? ' is-open' : '')}>
              <button type="button" className="siq-subsection-head" onClick={() => setOpen(s => ({ ...s, oido: !s.oido }))}>
                <span className="siq-subsection-icon">🎧</span>
                <span className="siq-subsection-num">1.4</span>
                <span className="siq-subsection-name">Oído · música que armoniza</span>
                <span className="siq-subsection-chevron">{open.oido ? '▾' : '▸'}</span>
              </button>
              {open.oido && (
                <div className="siq-subsection-body">
                  <TipoAField aroma={aroma} fieldId="generos_musicales_compatibles" label="Géneros musicales compatibles" shape="lista_libre" placeholder="Uno por línea (jazz_lounge, bossa, etc.)"
                    onChange={(v) => updateTipoA('generos_musicales_compatibles', v)} onRestore={() => restoreTipoA('generos_musicales_compatibles')} />
                  <NivelVolumenField aroma={aroma}
                    onChange={(v) => updateTipoA('nivel_volumen_exacto', v)} onRestore={() => restoreTipoA('nivel_volumen_exacto')} />
                  <TipoAField aroma={aroma} fieldId="instrumentacion_predominante" label="Instrumentación predominante" shape="enum" options={vocab.instrumentacion_predominante}
                    onChange={(v) => updateTipoA('instrumentacion_predominante', v)} onRestore={() => restoreTipoA('instrumentacion_predominante')} />
                  <TipoAField aroma={aroma} fieldId="ambiente_sonoro"               label="Ambiente sonoro"               shape="enum" options={vocab.ambiente_sonoro}
                    onChange={(v) => updateTipoA('ambiente_sonoro', v)} onRestore={() => restoreTipoA('ambiente_sonoro')} />
                  <PlaylistField aroma={aroma}
                    onChange={(v) => updateTipoA('playlist_sugerida', v)} onRestore={() => restoreTipoA('playlist_sugerida')} />
                </div>
              )}
            </div>

            {/* 1.5 GUSTO (colapsada por default si no gastronómico) */}
            <div className={"siq-subsection" + (open.gusto ? ' is-open' : '') + (gastro ? '' : ' is-gusto-optional')}>
              <button type="button" className="siq-subsection-head" onClick={() => setOpen(s => ({ ...s, gusto: !s.gusto }))}>
                <span className="siq-subsection-icon">👅</span>
                <span className="siq-subsection-num">1.5</span>
                <span className="siq-subsection-name">Gusto · maridaje gastronómico {gastro ? '' : '(opcional · no es gastronómico por default)'}</span>
                <span className="siq-subsection-chevron">{open.gusto ? '▾' : '▸'}</span>
              </button>
              {open.gusto && (
                <div className="siq-subsection-body">
                  <TipoAField aroma={aroma} fieldId="tipos_cocina_compatibles"          label="Tipos de cocina compatibles"        shape="enum_multi" options={vocab.tipos_cocina_compatibles}
                    onChange={(v) => updateTipoA('tipos_cocina_compatibles', v)} onRestore={() => restoreTipoA('tipos_cocina_compatibles')} />
                  <TipoAField aroma={aroma} fieldId="sabores_predominantes_compatibles" label="Sabores predominantes compatibles"  shape="enum_multi" options={vocab.sabores_predominantes_compatibles}
                    onChange={(v) => updateTipoA('sabores_predominantes_compatibles', v)} onRestore={() => restoreTipoA('sabores_predominantes_compatibles')} />
                  <TipoAField aroma={aroma} fieldId="tipos_bebida_compatibles"          label="Tipos de bebida compatibles"        shape="enum_multi" options={vocab.tipos_bebida_compatibles}
                    onChange={(v) => updateTipoA('tipos_bebida_compatibles', v)} onRestore={() => restoreTipoA('tipos_bebida_compatibles')} />
                  <TipoAField aroma={aroma} fieldId="momento_consumo"                   label="Momento de consumo"                  shape="enum" options={vocab.momento_consumo}
                    onChange={(v) => updateTipoA('momento_consumo', v)} onRestore={() => restoreTipoA('momento_consumo')} />
                  <TipoAField aroma={aroma} fieldId="maridaje_conceptual"               label="Maridaje conceptual (texto libre)"   shape="texto" placeholder="ej. La vainilla acoge postres; el cedro funciona en steakhouse"
                    onChange={(v) => updateTipoA('maridaje_conceptual', v)} onRestore={() => restoreTipoA('maridaje_conceptual')} />
                </div>
              )}
            </div>
          </section>

          {/* ============================================
              SECCIÓN 2 · VOZ DE TONY · TIPO B
              =============================================*/}
          <section className="siq-section siq-section-2">
            <h3 className="siq-section-title">2. Voz de Tony · su lectura humana del aroma</h3>
            <p className="siq-section-help">
              Estos campos <strong>solo los puede llenar usted</strong>: la IA no los puede inferir bien.
              Sin sugerencia automática · solo input directo. <strong>Notas internas</strong> es privado y
              nunca se envía al modelo de visión.
            </p>

            <div className="siq-section-grid">
              <label className="siq-field">
                <span className="siq-field-label">A qué huele · descripción sensorial libre</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  placeholder="Descripción subjetiva · lo que realmente percibe usted y sus clientes."
                  value={(aroma.tipo_b && aroma.tipo_b.a_que_huele) || ''}
                  onChange={(e) => updateTipoB('a_que_huele', e.target.value)} />
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Adjetivos vivenciales (separados por comas)</span>
                <input type="text" className="siq-field-input"
                  placeholder="sexy, fresco, te abraza, te despierta…"
                  value={arrayToCsv((aroma.tipo_b && aroma.tipo_b.adjetivos_vivenciales) || [])}
                  onChange={(e) => updateTipoB('adjetivos_vivenciales', csvToArray(e.target.value))} />
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Nivel de agrado real</span>
                <select className="siq-field-input"
                  value={(aroma.tipo_b && aroma.tipo_b.nivel_de_agrado_real) || ''}
                  onChange={(e) => updateTipoB('nivel_de_agrado_real', e.target.value)}>
                  <option value="">— sin definir —</option>
                  <option value="ama_mayoria">Ama mayoría</option>
                  <option value="gusta_mayoria">Gusta mayoría</option>
                  <option value="divide">Divide</option>
                  <option value="nicho">Nicho</option>
                  <option value="rechaza_mayoria">Rechaza mayoría</option>
                </select>
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Intensidad real medida (1–5) · su calibración empírica</span>
                <input type="number" min="1" max="5" step="1" className="siq-field-input"
                  value={(aroma.tipo_b && aroma.tipo_b.intensidad_real_medida != null) ? aroma.tipo_b.intensidad_real_medida : ''}
                  onChange={(e) => updateTipoB('intensidad_real_medida', e.target.value === '' ? null : Number(e.target.value))} />
              </label>

              <div className="siq-field siq-field-full">
                <span className="siq-field-label">¿Le gusta?</span>
                <div className="siq-field-row">
                  <label className="siq-radio">
                    <input type="radio" name="gusta" checked={aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta && aroma.tipo_b.gusta_o_no_gusta.value === true}
                      onChange={() => updateTipoB('gusta_o_no_gusta', { ...((aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta) || {}), value: true })} />
                    <span>Sí</span>
                  </label>
                  <label className="siq-radio">
                    <input type="radio" name="gusta" checked={aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta && aroma.tipo_b.gusta_o_no_gusta.value === false}
                      onChange={() => updateTipoB('gusta_o_no_gusta', { ...((aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta) || {}), value: false })} />
                    <span>No</span>
                  </label>
                  <label className="siq-radio">
                    <input type="radio" name="gusta" checked={!(aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta) || aroma.tipo_b.gusta_o_no_gusta.value === null}
                      onChange={() => updateTipoB('gusta_o_no_gusta', { ...((aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta) || {}), value: null })} />
                    <span>Sin opinión</span>
                  </label>
                </div>
                <textarea className="siq-field-input siq-field-textarea" rows={2}
                  placeholder="Razón breve · qué le funciona o no"
                  value={(aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta && aroma.tipo_b.gusta_o_no_gusta.razon) || ''}
                  onChange={(e) => updateTipoB('gusta_o_no_gusta', { ...((aroma.tipo_b && aroma.tipo_b.gusta_o_no_gusta) || {}), razon: e.target.value })} />
              </div>

              <label className="siq-field siq-field-full">
                <span className="siq-field-label">Anécdotas de uso · dónde lo puso, qué pasó</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  placeholder="Feedback de clientes, situaciones reales que vivió con este aroma."
                  value={(aroma.tipo_b && aroma.tipo_b.anecdotas_de_uso) || ''}
                  onChange={(e) => updateTipoB('anecdotas_de_uso', e.target.value)} />
              </label>

              <label className="siq-field siq-field-full siq-field-privada">
                <span className="siq-field-label">🔒 Notas internas (privado · NO se envía al proxy)</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  placeholder="Bloc de notas privado · este texto nunca sale al modelo de visión."
                  value={(aroma.tipo_b && aroma.tipo_b.notas_internas_tony) || ''}
                  onChange={(e) => updateTipoB('notas_internas_tony', e.target.value)} />
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Aromas que mezclan bien (id o nombre · uno por línea)</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  value={arrayToLines((aroma.tipo_b && aroma.tipo_b.aromas_combos) || [])}
                  onChange={(e) => updateTipoB('aromas_combos', linesToArray(e.target.value))} />
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Aromas rivales · NO mezclar (id o nombre · uno por línea)</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  value={arrayToLines((aroma.tipo_b && aroma.tipo_b.aromas_rivales) || [])}
                  onChange={(e) => updateTipoB('aromas_rivales', linesToArray(e.target.value))} />
              </label>
            </div>
          </section>

          {/* ============================================
              SECCIÓN 3 · OPERACIONAL
              =============================================*/}
          <section className="siq-section siq-section-3">
            <h3 className="siq-section-title">3. Operacional · identidad y comercialización</h3>
            <p className="siq-section-help">Campos base del catálogo · familia, notas, descripción, precio relativo, stock, marca, inspiración, contextos, rating.</p>

            <div className="siq-section-grid">
              <label className="siq-field">
                <span className="siq-field-label">Nombre</span>
                <input type="text" className="siq-field-input"
                  value={aroma.nombre || ''} onChange={(e) => updateOp('nombre', e.target.value)} />
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Familia olfativa</span>
                <input type="text" className="siq-field-input" list="catalog-familia-list"
                  value={aroma.familia_olfativa || aroma.familia || ''}
                  onChange={(e) => { updateOp('familia_olfativa', e.target.value); updateOp('familia', e.target.value); }} />
                <datalist id="catalog-familia-list">
                  <option value="Cítricas" /><option value="Herbales" /><option value="Verdes" />
                  <option value="Florales" /><option value="Frutales" /><option value="Amaderadas" />
                  <option value="Orientales" /><option value="Gourmand" /><option value="Acuáticas" />
                  <option value="Cuero / Tabaco" /><option value="Chipre" /><option value="De ocasión" />
                  <option value="Personalizada" />
                </datalist>
              </label>
              <label className="siq-field siq-field-full">
                <span className="siq-field-label">Subacorde</span>
                <input type="text" className="siq-field-input"
                  placeholder="ej. limón italiano + ámbar"
                  value={aroma.subacorde || ''} onChange={(e) => updateOp('subacorde', e.target.value)} />
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Notas · salida</span>
                <textarea className="siq-field-input siq-field-textarea" rows={2}
                  value={(aroma.notas && aroma.notas.salida) || ''}
                  onChange={(e) => updateOp('notas', { ...(aroma.notas || {}), salida: e.target.value })} />
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Notas · corazón</span>
                <textarea className="siq-field-input siq-field-textarea" rows={2}
                  value={(aroma.notas && aroma.notas.corazon) || ''}
                  onChange={(e) => updateOp('notas', { ...(aroma.notas || {}), corazon: e.target.value })} />
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Notas · fondo</span>
                <textarea className="siq-field-input siq-field-textarea" rows={2}
                  value={(aroma.notas && aroma.notas.fondo) || ''}
                  onChange={(e) => updateOp('notas', { ...(aroma.notas || {}), fondo: e.target.value })} />
              </label>
              <label className="siq-field siq-field-full">
                <span className="siq-field-label">Descripción breve</span>
                <textarea className="siq-field-input siq-field-textarea" rows={3}
                  value={aroma.descripcion || ''} onChange={(e) => updateOp('descripcion', e.target.value)} />
              </label>

              {CATALOG_TEXTAREA_FIELDS.map(f => (
                <label key={f.key} className="siq-field">
                  <span className="siq-field-label">{f.label}</span>
                  <textarea className="siq-field-input siq-field-textarea" rows={4}
                    placeholder={f.hint}
                    value={arrayToLines(aroma[f.key])}
                    onChange={(e) => updateOp(f.key, linesToArray(e.target.value))} />
                </label>
              ))}

              <label className="siq-field siq-field-full">
                <span className="siq-field-label">Tags visuales (separados por comas)</span>
                <textarea className="siq-field-input siq-field-textarea" rows={2}
                  placeholder="maderas oscuras, cuero, metal pulido, paleta sobria"
                  value={arrayToCsv(aroma.tags_visuales)}
                  onChange={(e) => updateOp('tags_visuales', csvToArray(e.target.value))} />
              </label>

              <label className="siq-field">
                <span className="siq-field-label">Precio relativo</span>
                <select className="siq-field-input"
                  value={aroma.precio_relativo || ''}
                  onChange={(e) => updateOp('precio_relativo', e.target.value)}>
                  <option value="">— sin definir —</option>
                  <option value="entry">Entry</option>
                  <option value="mid">Mid</option>
                  <option value="premium">Premium</option>
                  <option value="ultra">Ultra</option>
                </select>
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Stock disponible</span>
                <select className="siq-field-input"
                  value={aroma.stock_disponible === true ? 'true' : aroma.stock_disponible === false ? 'false' : ''}
                  onChange={(e) => updateOp('stock_disponible', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}>
                  <option value="">— sin definir —</option>
                  <option value="true">Disponible</option>
                  <option value="false">Agotado</option>
                </select>
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Marca</span>
                <input type="text" className="siq-field-input"
                  value={aroma.marca || ''} onChange={(e) => updateOp('marca', e.target.value)} />
              </label>
              <label className="siq-field">
                <span className="siq-field-label">Rating interno (1–5)</span>
                <input type="number" min="1" max="5" step="1" className="siq-field-input"
                  value={aroma.rating_interno != null ? aroma.rating_interno : ''}
                  onChange={(e) => updateOp('rating_interno', e.target.value === '' ? null : Number(e.target.value))} />
              </label>
              <label className="siq-field siq-field-full">
                <span className="siq-field-label">Inspiración (referencia, story, perfumista, etc.)</span>
                <input type="text" className="siq-field-input"
                  value={aroma.inspiracion || ''} onChange={(e) => updateOp('inspiracion', e.target.value)} />
              </label>
            </div>
          </section>
        </div>

        <footer className="siq-modal-foot">
          <div className="siq-modal-foot-info">
            Se persiste en <code>localStorage.olfativa.catalogOverrides</code>. Override de Tony siempre gana sobre la sugerencia de foundations.
          </div>
          <div className="siq-modal-foot-actions">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={onSave}>Guardar aroma</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CatalogEditor() {
  const [aromas, setAromas]       = useState(readCatalogFromGlobals);
  const [selectedIdx, setSelected] = useState(-1);
  const [search, setSearch]       = useState('');
  const [filterFamilia, setFilterFamilia] = useState('');
  const [filterTipoB, setFilterTipoB]     = useState(''); // '', 'vacio', 'parcial', 'completo'
  const [savedHint, setSavedHint] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  // Sincronizar con eventos externos (foundations cargadas, catalog-updated, seed)
  useEffect(() => {
    const refresh = () => {
      const fresh = readCatalogFromGlobals();
      setAromas(fresh);
      setSelected(prev => (prev >= 0 && prev < fresh.length) ? prev : -1);
    };
    window.addEventListener('olfativa:catalog-updated', refresh);
    window.addEventListener('olfativa:catalog-seeded', refresh);
    window.addEventListener('olfativa:foundations-loaded', refresh);
    return () => {
      window.removeEventListener('olfativa:catalog-updated', refresh);
      window.removeEventListener('olfativa:catalog-seeded', refresh);
      window.removeEventListener('olfativa:foundations-loaded', refresh);
    };
  }, []);

  // Lista de familias para el dropdown filtro
  const familias = useMemo(() => {
    const s = new Set();
    aromas.forEach(a => { const f = a.familia_olfativa || a.familia; if (f) s.add(f); });
    return Array.from(s).sort();
  }, [aromas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return aromas
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => {
        if (q) {
          const hay = ((a.nombre || '') + ' ' + (a.familia_olfativa || a.familia || '') + ' ' + (a.subacorde || '')).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (filterFamilia && (a.familia_olfativa || a.familia) !== filterFamilia) return false;
        if (filterTipoB && tipoBStatus(a) !== filterTipoB) return false;
        return true;
      });
  }, [aromas, search, filterFamilia, filterTipoB]);

  const current = selectedIdx >= 0 ? aromas[selectedIdx] : null;

  const updateAroma = (idx, updater) => {
    setAromas(prev => {
      const next = prev.slice();
      next[idx] = (typeof updater === 'function') ? updater(next[idx]) : updater;
      return next;
    });
  };

  const persist = (arr) => {
    try {
      window.OLF_IA.setCatalog(arr);
      setSavedHint('✓ Catálogo guardado · disponible en próximo análisis.');
      setTimeout(() => setSavedHint(null), 2400);
    } catch (e) {
      setSavedHint('✗ Error al guardar: ' + (e.message || e));
      setTimeout(() => setSavedHint(null), 3500);
    }
  };

  const saveCurrent = () => persist(aromas);

  const deleteCurrent = () => {
    if (selectedIdx < 0) return;
    if (!confirm(`Eliminar "${current.nombre}" del catálogo?`)) return;
    const next = aromas.slice();
    next.splice(selectedIdx, 1);
    setAromas(next);
    setSelected(-1);
    persist(next);
  };

  const addNew = () => {
    const K = window.OLF_KNOW;
    const id = 'A' + String(aromas.length + 1).padStart(3, '0');
    const newAroma = {
      id,
      key: 'nuevo_' + Date.now(),
      nombre: 'Aroma nuevo',
      familia_olfativa: '',
      familia: '',
      subacorde: '',
      acordes: [],
      notas: { salida: '', corazon: '', fondo: '' },
      descripcion: '',
      contextos_recomendados: [],
      contextos_a_evitar: [],
      tags_visuales: [],
      tipo_a: K && typeof K._buildEmptyTipoA === 'function' ? K._buildEmptyTipoA() : {},
      tipo_b: K && typeof K._buildEmptyTipoB === 'function' ? K._buildEmptyTipoB() : {},
    };
    const next = [newAroma, ...aromas];
    setAromas(next);
    setSelected(0);
    persist(next);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(aromas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogo-olfativa.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const importJson = (file) => {
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) throw new Error('El JSON debe ser un array.');
        if (parsed.length === 0)    throw new Error('El array está vacío.');
        if (!parsed.every(a => a && typeof a.nombre === 'string')) {
          throw new Error('Cada aroma requiere un campo "nombre" string.');
        }
        setAromas(parsed);
        setSelected(-1);
        persist(parsed);
      } catch (err) {
        setImportError('✗ Import falló: ' + (err.message || err) + ' · catálogo previo intacto.');
        setTimeout(() => setImportError(null), 6000);
      }
    };
    reader.onerror = () => {
      setImportError('✗ No se pudo leer el archivo.');
      setTimeout(() => setImportError(null), 4000);
    };
    reader.readAsText(file);
  };

  const resetDefault = () => {
    if (!confirm('Restaurar el catálogo original del bundle? Tus ediciones se perderán.')) return;
    try {
      window.OLF_IA.resetCatalog();
      const fresh = readCatalogFromGlobals();
      setAromas(fresh);
      setSelected(-1);
      setSavedHint('✓ Catálogo restaurado al default del bundle.');
      setTimeout(() => setSavedHint(null), 2400);
    } catch (e) {
      setSavedHint('✗ Reset falló: ' + (e.message || e));
    }
  };

  const reSeedAll = () => {
    if (!confirm('Re-aplicar foundations.json a TODOS los aromas? Los valor_override de Tony se preservan; solo se regeneran los valor_sugerido.')) return;
    try {
      if (window.OLF_KNOW && typeof window.OLF_KNOW.seedFromFoundations === 'function') {
        window.OLF_KNOW.seedFromFoundations({ force: true });
        const fresh = readCatalogFromGlobals();
        setAromas(fresh);
        persist(fresh);
        setSavedHint('✓ Seed aplicado a ' + fresh.length + ' aromas · overrides preservados.');
        setTimeout(() => setSavedHint(null), 3000);
      } else {
        setSavedHint('✗ foundations no cargadas · revise scent-iq-knowledge.js y data/scent-iq-foundations.json');
      }
    } catch (e) {
      setSavedHint('✗ Seed falló: ' + (e.message || e));
    }
  };

  return (
    <div className="catalog-editor">
      <div className="catalog-editor-body">
        <aside className="catalog-list">
          <div className="catalog-list-head">
            <input
              type="text"
              className="catalog-search"
              placeholder="Buscar nombre, familia o acorde…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn-secondary catalog-new-btn" onClick={addNew}>+ Nuevo</button>
          </div>
          <div className="catalog-list-filters">
            <select className="catalog-filter" value={filterFamilia} onChange={(e) => setFilterFamilia(e.target.value)}>
              <option value="">Familia · todas</option>
              {familias.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select className="catalog-filter" value={filterTipoB} onChange={(e) => setFilterTipoB(e.target.value)}>
              <option value="">Voz de Tony · cualquier estado</option>
              <option value="vacio">Sin voz de Tony</option>
              <option value="parcial">Voz parcial</option>
              <option value="completo">Voz completa</option>
            </select>
          </div>
          <div className="catalog-list-scroll">
            {filtered.length === 0 ? (
              <div className="catalog-empty">Sin resultados.</div>
            ) : filtered.map(({ a, i }) => {
              const status = tipoBStatus(a);
              return (
                <button
                  key={a.id || a.key || i}
                  className={"catalog-list-item" + (i === selectedIdx ? ' is-on' : '')}
                  onClick={() => setSelected(i)}>
                  <div className="catalog-list-name">
                    {a.nombre || '(sin nombre)'}
                    <span className={"catalog-list-badge catalog-list-badge-" + status} title={'Voz de Tony · ' + status}>
                      {status === 'completo' ? '●●●' : status === 'parcial' ? '●●○' : '○○○'}
                    </span>
                  </div>
                  <div className="catalog-list-fam">{a.familia_olfativa || a.familia || '—'}</div>
                </button>
              );
            })}
          </div>
          <div className="catalog-list-count">
            {filtered.length} de {aromas.length} aroma{aromas.length === 1 ? '' : 's'}
          </div>
        </aside>

        <section className="catalog-form">
          {!current ? (
            <div className="catalog-empty">
              <div style={{ marginBottom: 12 }}>Selecciona un aroma de la lista para editarlo a fondo.</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                El editor abre como modal con 3 secciones: <strong>perfil sensorial 5 sentidos</strong> (derivado de foundations),
                <strong> voz de Tony</strong> (campos humanos privados/públicos) y <strong>operacional</strong> (catálogo base).
              </div>
            </div>
          ) : (
            <CatalogAromaModal
              aroma={current}
              onChange={(updater) => updateAroma(selectedIdx, updater)}
              onClose={() => setSelected(-1)}
              onSave={() => { saveCurrent(); setSelected(-1); }}
            />
          )}
          {current && (
            <div className="catalog-form-actions" style={{ marginTop: 12 }}>
              <button className="catalog-delete-btn" onClick={deleteCurrent}>Eliminar aroma</button>
            </div>
          )}
        </section>
      </div>

      <div className="catalog-editor-footer">
        <div className="catalog-editor-footer-info">
          {importError ? <span className="catalog-import-error">{importError}</span>
            : savedHint    ? <span className="catalog-saved-hint">{savedHint}</span>
            : <>Cambios persistidos en <code>localStorage.olfativa.catalogOverrides</code>. Foundations: <code>{window.OLF_KNOW && window.OLF_KNOW.foundations && window.OLF_KNOW.foundations.meta && window.OLF_KNOW.foundations.meta.version || 'no cargadas'}</code></>}
        </div>
        <div className="catalog-editor-footer-btns">
          <button className="btn-secondary" onClick={reSeedAll} title="Re-aplica las reglas de foundations.json a todos los aromas (preserva overrides)">↻ Re-seed</button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Importar JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }}
          />
          <button className="btn-secondary" onClick={exportJson}>Exportar JSON</button>
          <button className="btn-secondary catalog-reset-btn" onClick={resetDefault}>Restaurar default</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ customSlides, enabledKinds, selected, onSave, onToggleInDeck, onClose }) {
  const [draft, setDraft] = useState(customSlides);
  const [editing, setEditing] = useState(null);
  const [savedHint, setSavedHint] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef(null);
  // Tabs del panel Admin · slides personalizados (default), catálogo
  // de aromas, integración de visión. Cada pestaña renderiza su
  // sección; el footer cambia según el tab activo.
  const [activeTab, setActiveTab] = useState('slides');

  // Integración de visión · adapter seleccionado + URL del Worker.
  // Persistido en localStorage; el adapter `claude` lee la URL de ahí.
  const [visionAdapter, setVisionAdapter] = useState(() => {
    try { return localStorage.getItem('olfativa.visionAdapter') || 'mock'; }
    catch { return 'mock'; }
  });
  const [visionWorkerUrl, setVisionWorkerUrl] = useState(() => {
    try { return localStorage.getItem('olfativa.visionWorkerUrl') || ''; }
    catch { return ''; }
  });
  const [visionSaved, setVisionSaved] = useState(false);
  const visionUrlEmpty = !visionWorkerUrl.trim();
  const visionWarn = visionAdapter === 'claude' && visionUrlEmpty;
  const saveVision = () => {
    try {
      localStorage.setItem('olfativa.visionAdapter', visionAdapter);
      localStorage.setItem('olfativa.visionWorkerUrl', visionWorkerUrl.trim());
    } catch (_) {}
    // Aplica el adapter al engine en runtime · sin esto analyzeImage
    // seguiría usando el adapter previo hasta el próximo refresh.
    if (window.OLF_IA) {
      window.OLF_IA.visionAdapter = (visionAdapter === 'claude' && !visionUrlEmpty)
        ? 'claude'
        : 'mock';
    }
    setVisionSaved(true);
    setTimeout(() => setVisionSaved(false), 2200);
  };

  const originalIds = useMemo(() => new Set((customSlides || []).map(s => s.id)), [customSlides]);
  const newlyCreated = draft.filter(s => !originalIds.has(s.id));
  const newCount = newlyCreated.length;

  // Cálculo de espacio usado por imágenes en LS (estimado)
  const storageBytes = useMemo(() => {
    return draft.reduce((sum, s) => sum + (s.imageDataUrl ? s.imageDataUrl.length : 0), 0);
  }, [draft]);
  const storageMB = (storageBytes * 0.75 / (1024 * 1024)).toFixed(1);

  // Opciones de posicion: 'start' | 'end' | kind name de un slide del deck
  const positionOptions = useMemo(() => {
    const opts = [
      { value: 'start', label: 'Al inicio (antes de Portada)' }
    ];
    (selected || []).filter(s => s.enabled).forEach(s => {
      if (editing && s.kind === editing.kind) return; // no insertarse después de sí mismo
      opts.push({
        value: s.kind,
        label: 'Después de ' + (SLIDE_LABELS[s.kind] || (customSlides.find(c => c.kind === s.kind)?.title) || s.kind)
      });
    });
    opts.push({ value: 'end', label: 'Al final del deck' });
    return opts;
  }, [selected, customSlides, editing]);

  const startNew = () => setEditing({
    id: 'custom-' + Date.now(),
    kind: 'custom-' + Date.now(),
    mode: 'image',
    title: defaultSlideTitle(),
    imageDataUrl: '',
    segment: 'master',
    insertAfter: 'end',
    enabled: true,
    createdAt: Date.now(),
    isNew: true,
  });
  const startEdit = (s) => setEditing({
    ...s,
    mode: s.mode || (s.imageDataUrl ? 'image' : 'text'),
    segment: s.segment || 'master',
    insertAfter: s.insertAfter || 'end',
    isNew: false
  });

  const handleFile = (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Sube una imagen (PNG, JPG, JPEG, WEBP).'); return; }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 3) {
      const ok = confirm(`La imagen pesa ${sizeMB.toFixed(1)} MB. Recomendado < 2 MB para que el cotizador siga ligero. Continuar?`);
      if (!ok) return;
    }
    const fr = new FileReader();
    fr.onload = (e) => {
      setEditing(prev => prev ? { ...prev, imageDataUrl: e.target.result, mode: 'image' } : prev);
    };
    fr.onerror = () => alert('No se pudo leer la imagen.');
    fr.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  };

  const saveEditing = () => {
    if (!editing) return;
    if (!editing.imageDataUrl && editing.mode === 'image') {
      alert('Sube una imagen primero.');
      return;
    }
    const wasNew = !!editing.isNew;
    const clean = { ...editing };
    delete clean.isNew;
    setDraft(prev => {
      const i = prev.findIndex(x => x.id === clean.id);
      if (i === -1) return [...prev, clean];
      const next = [...prev]; next[i] = clean; return next;
    });
    setEditing(null);
    setSavedHint(wasNew
      ? 'Slide listo · se insertará al deck al hacer Aplicar.'
      : 'Cambios guardados.');
    setTimeout(() => setSavedHint(null), 3500);
  };
  const deleteSlide = (id) => {
    if (!confirm('Eliminar este slide personalizado?')) return;
    setDraft(prev => prev.filter(x => x.id !== id));
    if (editing && editing.id === id) setEditing(null);
  };
  const apply = () => {
    const newlyCreatedKinds = newlyCreated.map(s => s.kind);
    onSave(draft, newlyCreatedKinds);
    onClose();
  };

  const positionLabel = (pos) => {
    if (!pos || pos === 'end') return 'Al final del deck';
    if (pos === 'start') return 'Al inicio';
    const opt = positionOptions.find(o => o.value === pos);
    return opt ? opt.label : 'Posición ' + pos;
  };

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-modal admin-modal" onClick={e => e.stopPropagation()}>
        <div className="picker-header">
          <div>
            <div className="picker-eyebrow">Admin</div>
            <h2 className="picker-title">Panel de administración</h2>
            <div className="picker-sub">Sube slides personalizados, edita el catálogo de aromas y elige el motor de visión del Scent Advisor.</div>
          </div>
          <button className="picker-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="admin-tabs">
          <button
            className={"admin-tab" + (activeTab === 'slides' ? ' is-on' : '')}
            onClick={() => setActiveTab('slides')}>
            Slides personalizados
          </button>
          <button
            className={"admin-tab" + (activeTab === 'catalog' ? ' is-on' : '')}
            onClick={() => setActiveTab('catalog')}>
            Catálogo de aromas
          </button>
          <button
            className={"admin-tab" + (activeTab === 'vision' ? ' is-on' : '')}
            onClick={() => setActiveTab('vision')}>
            Integración de visión
          </button>
        </div>

        {activeTab === 'catalog' && (
          <CatalogEditor onCloseModal={onClose} />
        )}

        {activeTab === 'slides' && (
        <div className="admin-body">
          <div className="admin-list">
            <div className="admin-list-head">
              <span>Slides existentes ({draft.length})</span>
              <button className="btn-primary" onClick={startNew}>+ Subir slide</button>
            </div>
            {draft.length === 0 ? (
              <div className="admin-empty">Aún no tienes slides personalizados. Click en "+ Subir slide" para crear el primero.</div>
            ) : draft.map(s => {
              const isNewSlide = !originalIds.has(s.id);
              const isInDeck = enabledKinds && enabledKinds.has(s.kind);
              const segColor = SEG_COLOR[s.segment || 'master'] || SEG_COLOR.master;
              const segShort = SEG_SHORT[s.segment || 'master'] || 'Master';
              return (
                <div key={s.id} className={"admin-row" + (editing?.id === s.id ? ' is-editing' : '')}>
                  <div className="admin-row-thumb" onClick={() => startEdit(s)}>
                    {s.imageDataUrl
                      ? <img src={s.imageDataUrl} alt={s.title} />
                      : s.imageUrl
                        ? <img src={s.imageUrl} alt={s.title} />
                        : <div className="admin-row-thumb-empty">{(s.title || 'S')[0]}</div>}
                  </div>
                  <div className="admin-row-info" onClick={() => startEdit(s)}>
                    <div className="admin-row-title">
                      {s.title || 'Sin título'}
                      {isNewSlide && <span className="admin-row-newbadge">Nuevo</span>}
                    </div>
                    <div className="admin-row-meta">
                      <span className="admin-row-segdot" style={{ background: segColor }} />
                      {segShort} · {positionLabel(s.insertAfter)} · {isInDeck ? <span className="admin-row-active">activo en deck</span> : 'no incluido'}
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    {!isNewSlide && (
                      <button
                        className={"admin-deck-toggle" + (isInDeck ? ' is-on' : '')}
                        onClick={() => onToggleInDeck && onToggleInDeck(s.kind, !isInDeck)}
                        title={isInDeck ? 'Desactivar en deck' : 'Activar en deck'}
                      >
                        {isInDeck ? '✓ En deck' : 'Activar en deck'}
                      </button>
                    )}
                    <button className="btn-secondary" onClick={() => startEdit(s)}>Editar</button>
                    <button className="admin-row-del" onClick={() => deleteSlide(s.id)} title="Eliminar">×</button>
                  </div>
                </div>
              );
            })}
            {savedHint && <div className="admin-saved-hint">{savedHint}</div>}
          </div>

          {editing && (
            <div className="admin-form">
              <div className="admin-form-head">
                <div className="picker-eyebrow">{editing.isNew ? 'Subir nuevo slide' : 'Editar slide'}</div>
                <h3>{editing.title || '(sin título)'}</h3>
              </div>

              {/* Drop zone + file input */}
              <div className="admin-field">
                <label>Imagen del slide <span className="admin-req">*</span></label>
                <div
                  className={"admin-drop" + (drag ? ' is-drag' : '') + (editing.imageDataUrl ? ' has-image' : '')}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                >
                  {editing.imageDataUrl
                    ? <img src={editing.imageDataUrl} alt="preview" />
                    : (
                      <div className="admin-drop-empty">
                        <div className="admin-drop-icon">⬆</div>
                        <div>Arrastra o haz click para subir<br/><span>PNG · JPG · JPEG · WEBP</span></div>
                      </div>
                    )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
                />
                {editing.imageDataUrl && (
                  <button type="button" className="admin-replace-btn" onClick={() => fileInputRef.current?.click()}>
                    Reemplazar imagen
                  </button>
                )}
              </div>

              <div className="admin-field">
                <label>Nombre interno (solo para identificarlo)</label>
                <input value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} placeholder={defaultSlideTitle()} />
              </div>

              <div className="admin-field">
                <label>Categoría / segmento</label>
                <select value={editing.segment} onChange={e => setEditing({...editing, segment: e.target.value})}>
                  <option value="longtail">Long Tail (1-2 difusores)</option>
                  <option value="core">Core (3-9 difusores)</option>
                  <option value="key">Key (10-49 difusores)</option>
                  <option value="enterprise">Enterprise (50+ difusores)</option>
                  <option value="master">Master</option>
                </select>
              </div>

              <div className="admin-field">
                <label>Posición en el deck</label>
                <select value={editing.insertAfter} onChange={e => setEditing({...editing, insertAfter: e.target.value})}>
                  {positionOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-actions">
                <button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                {!editing.isNew && <button className="admin-row-del-btn" onClick={() => deleteSlide(editing.id)}>Eliminar</button>}
                <button className="btn-primary" onClick={saveEditing}>
                  {editing.isNew ? 'Subir y agregar al deck' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {activeTab === 'vision' && (
        <section className="admin-vision">
          <div className="admin-vision-head">
            <div className="picker-eyebrow">Integración de visión</div>
            <h3 className="admin-vision-title">Cómo lee la foto el Scent Advisor</h3>
            <div className="admin-vision-sub">
              El motor por defecto es un mock determinista. Conecta el Worker de Vercel para que Claude 3.5 Sonnet Vision analice la foto real. La API key vive como secret en Vercel — el front nunca la ve.
            </div>
          </div>

          <div className="admin-vision-grid">
            <div className="admin-vision-field">
              <label className="admin-vision-label">Adapter</label>
              <div className="admin-vision-radio-group">
                <label className={"admin-vision-radio" + (visionAdapter === 'mock' ? ' is-on' : '')}>
                  <input
                    type="radio"
                    name="visionAdapter"
                    value="mock"
                    checked={visionAdapter === 'mock'}
                    onChange={() => setVisionAdapter('mock')}
                  />
                  <div>
                    <div className="admin-vision-radio-title">Mock determinista (default)</div>
                    <div className="admin-vision-radio-desc">Sin red. El giro del Scent Advisor fija el perfil.</div>
                  </div>
                </label>
                <label className={"admin-vision-radio" + (visionAdapter === 'claude' ? ' is-on' : '')}>
                  <input
                    type="radio"
                    name="visionAdapter"
                    value="claude"
                    checked={visionAdapter === 'claude'}
                    onChange={() => setVisionAdapter('claude')}
                  />
                  <div>
                    <div className="admin-vision-radio-title">Claude Vision real</div>
                    <div className="admin-vision-radio-desc">Llama al Worker de Vercel → Anthropic API.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="admin-vision-field">
              <label className="admin-vision-label" htmlFor="admin-vision-url">URL del Worker</label>
              <input
                id="admin-vision-url"
                type="url"
                className="admin-vision-url"
                placeholder="https://olfativa.vercel.app/api/vision-proxy"
                value={visionWorkerUrl}
                onChange={(e) => setVisionWorkerUrl(e.target.value)}
              />
              <div className="admin-vision-hint">
                Pega aquí la URL completa del endpoint <code>/api/vision-proxy</code>. Pasos detallados en <code>docs/integracion-vision-real.md</code>.
              </div>
              {visionWarn && (
                <div className="admin-vision-warn">
                  ⚠ Sin URL no funciona · usaremos mock hasta que pegues la URL del Worker.
                </div>
              )}
            </div>
          </div>

          <div className="admin-vision-actions">
            {visionSaved && <span className="admin-vision-saved">✓ Integración guardada</span>}
            <button className="btn-secondary" onClick={saveVision}>Guardar integración</button>
          </div>
        </section>
        )}

        {activeTab === 'slides' && (
        <div className="picker-footer">
          <span className="picker-footer-info">
            {newCount > 0
              ? <><strong>{newCount}</strong> {newCount === 1 ? 'slide nuevo' : 'slides nuevos'} se agregará{newCount > 1 ? 'n' : ''} al deck al aplicar.</>
              : <>Espacio usado por slides custom: <strong>{storageMB} MB</strong></>}
          </span>
          <div className="picker-footer-btns">
            <button className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn-download" onClick={apply}>
              {newCount > 0
                ? (newCount === 1 ? 'Aplicar (+1 slide al deck)' : `Aplicar (+${newCount} slides al deck)`)
                : 'Aplicar cambios'}
            </button>
          </div>
        </div>
        )}

        {activeTab === 'vision' && (
        <div className="picker-footer">
          <span className="picker-footer-info">
            La selección queda guardada al hacer click en <b>Guardar integración</b>.
          </span>
          <div className="picker-footer-btns">
            <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
        )}
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
                        ? <span className="picker-kind-status on">Activa</span>
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
