/* global React, ReactDOM */
const { useEffect, useMemo } = React;

// Pull globals from window — Babel scopes each <script type="text/babel"> separately,
// so SEGMENTS / Slide* / Tweak* must be read off window after slides-master.jsx + slide-views-master.jsx run.
const SEGMENTS = window.SEGMENTS;
const PALETTE = window.PALETTE;
const {
  SlideCover, SlidePromise, SlidePillars, SlideMethod, SlideAroma,
  SlideCatalog, SlideQuote, SlideCuradora, SlideCompliance, SlideTrust, SlideClose,
  SlideScentAdvisor, SlideCotizador,
  TweaksPanel, useTweaks, TweakSection, TweakText,
} = window;

const SLIDE_RENDERERS = {
  cover: SlideCover,
  promise: SlidePromise,
  pillars: SlidePillars,
  curadora: SlideCuradora,
  method: SlideMethod,
  aroma: SlideAroma,
  scentAdvisor: SlideScentAdvisor,
  catalog: SlideCatalog,
  cotizador: SlideCotizador,
  quote: SlideQuote,
  compliance: SlideCompliance,
  trust: SlideTrust,
  close: SlideClose,
};

const SLIDE_LABELS = {
  cover: "Portada",
  promise: "Posicionamiento",
  pillars: "Pilares",
  curadora: "Curaduría",
  method: "Metodología",
  aroma: "Aromas",
  scentAdvisor: "Scent Advisor IA",
  catalog: "Catálogo",
  cotizador: "Cotizador",
  quote: "Cotización",
  compliance: "Cumplimiento",
  trust: "Inversión",
  close: "Cierre",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "segment": "master",
  "clientName": "Cliente",
  "propId": "PROP-2026-001",
  "propDate": "01 MAY 2026",
  "account": "Ejecutivo Olfativa",
  "accountEmail": "ventas@olfativa.com"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const isMaster = tweaks.segment === 'master';
  const segment = SEGMENTS[tweaks.segment] || SEGMENTS.key;

  // For master: concatenate all 4 segments' slides into one mega-deck
  // Each entry = { kind, segmentKey, segmentObj, prefix }
  const slidesList = useMemo(() => {
    if (!isMaster) {
      return segment.slides.map(kind => ({ kind, segmentObj: segment, segmentKey: tweaks.segment, prefix: '' }));
    }
    const order = ['longtail', 'core', 'key', 'enterprise'];
    const PREFIX = { longtail: 'LT', core: 'CR', key: 'KY', enterprise: 'EN' };
    const out = [];
    for (const segKey of order) {
      const seg = SEGMENTS[segKey];
      if (!seg) continue;
      seg.slides.forEach(kind => {
        out.push({ kind, segmentObj: seg, segmentKey: segKey, prefix: PREFIX[segKey] });
      });
    }
    return out;
  }, [isMaster, segment, tweaks.segment]);

  const total = slidesList.length;

  // Expose for screenshots / debugging
  useEffect(() => {
    window.__setSegment = (s) => setTweak('segment', s);
  }, [setTweak]);

  // Update document title
  useEffect(() => {
    document.title = `Olfativa · ${segment.label} · ${tweaks.clientName}`;
  }, [segment.label, tweaks.clientName]);

  const segmentOptions = [
    { v: "longtail", l: "Long Tail · 1–2 difusores" },
    { v: "core", l: "Core · 3–9 difusores" },
    { v: "key", l: "Key · 10–49 difusores" },
    { v: "enterprise", l: "Enterprise · 50+ difusores" },
    { v: "master", l: "Master · TODOS los machotes (4×) en uno" },
  ];

  return (
    <>
      <deck-stage>
        {slidesList.map((entry, i) => {
          const Renderer = SLIDE_RENDERERS[entry.kind];
          const segLabel = SLIDE_LABELS[entry.kind];
          const label = entry.prefix
            ? `${String(i+1).padStart(2,'0')} ${entry.prefix}·${segLabel}`
            : `${String(i+1).padStart(2,'0')} ${segLabel}`;
          const commonProps = {
            segment: entry.segmentObj,
            clientName: tweaks.clientName,
            propId: tweaks.propId,
            propDate: tweaks.propDate,
            account: tweaks.account,
            accountEmail: tweaks.accountEmail,
            fields: entry.segmentObj.fields,
            totalSlides: total,
          };
          return (
            <section key={`${entry.segmentKey}-${entry.kind}-${i}`} data-screen-label={label} data-om-validate>
              <Renderer {...commonProps} idx={i} />
            </section>
          );
        })}
      </deck-stage>

      <TweaksPanel title="Cotización · Tweaks">
        <TweakSection title="Machote" subtitle="Cambia segmento → cambia copy, slides y precios.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {segmentOptions.map(opt => (
              <button
                key={opt.v}
                onClick={() => setTweak('segment', opt.v)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: tweaks.segment === opt.v ? '#C7A668' : 'rgba(255,255,255,0.04)',
                  color: tweaks.segment === opt.v ? '#0E0E0E' : '#F3EDE3',
                  border: tweaks.segment === opt.v ? '1px solid #C7A668' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  fontFamily: 'inherit',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 120ms',
                }}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            background: 'rgba(199,166,104,0.08)',
            border: '1px solid rgba(199,166,104,0.2)',
            borderRadius: 4,
            fontSize: 11,
            color: '#C7A668',
            lineHeight: 1.4,
          }}>
            {isMaster
              ? `${total} slides · 4 machotes concatenados (Long Tail → Core → Key → Enterprise)`
              : `${total} slides · ${segment.aromaTiers.length} ${segment.aromaTiers.length === 1 ? 'tier' : 'tiers'} de aroma · ${segment.fields.priceTotal}`}
          </div>
        </TweakSection>

        <TweakSection title="Cliente">
          <TweakText label="Nombre del cliente" value={tweaks.clientName} onChange={v => setTweak('clientName', v)} />
          <TweakText label="ID propuesta" value={tweaks.propId} onChange={v => setTweak('propId', v)} />
          <TweakText label="Fecha" value={tweaks.propDate} onChange={v => setTweak('propDate', v)} />
        </TweakSection>

        <TweakSection title="Ejecutivo de cuenta">
          <TweakText label="Nombre" value={tweaks.account} onChange={v => setTweak('account', v)} />
          <TweakText label="Correo" value={tweaks.accountEmail} onChange={v => setTweak('accountEmail', v)} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
