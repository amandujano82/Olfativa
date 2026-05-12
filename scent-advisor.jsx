/* global React, ReactDOM */
// scent-advisor.jsx
// Triage de entrada del ejecutivo Olfativa.
// Flujo:
//   1) ¿Licitación o Funnel normal?
//   2a) Licitación  → formulario de bases, hand-off a equipo de licitaciones
//   2b) Funnel      → ¿Cliente nuevo o recurrente?
//   3)  Segmento    → Long Tail / Core / Key / Enterprise
//   4)  Datos       → Nombre del cliente · Fecha · Ejecutivo
//   5)  Done        → escribe en localStorage y abre cotizador.html
//
// Hand-off al cotizador interactivo:
//   localStorage["olfativa.cotizador.v2"] = {
//     selected: [{uid, kind, segment, enabled}],
//     client:   {clientName, propId, propDate, account, accountEmail},
//     prices:   {...defaults},
//     meta:     {lead, stage}
//   }

const { useState, useMemo, useEffect } = React;

// ── Catálogo de segmentos (mirroring SEGMENTS de slides-master.jsx) ──
// Mantengo aquí las slides por segmento para que la app de triage no dependa
// de cargar todo el deck. Si cambia en slides-master.jsx, actualizar aquí.
const SEGMENT_SLIDES = {
  longtail:   ["cover", "promise", "pillars", "scentAdvisor", "catalog", "cotizador", "close"],
  core:       ["cover", "promise", "pillars", "method", "close"],
  key:        ["cover", "promise", "pillars", "curadora", "method", "close"],
  enterprise: ["cover", "promise", "pillars", "curadora", "method", "aroma", "compliance", "close"],
};

const SEGMENTS_META = [
  { id: "longtail",   name: "Long Tail",  range: "1 — 2 difusores",   sub: "Local único · espacios pequeños",        n: "01" },
  { id: "core",       name: "Core",       range: "3 — 9 difusores",   sub: "PYME · cadenas en crecimiento",          n: "02" },
  { id: "key",        name: "Key",        range: "10 — 49 difusores", sub: "Cuentas clave · regional",               n: "03" },
  { id: "enterprise", name: "Enterprise", range: "50+ difusores",     sub: "Corporativo · nacional · multimarca",    n: "04" },
];

const LS_KEY = "olfativa.cotizador.v2";
const TRIAGE_LS = "olfativa.scentadvisor.v1";

// ── Defaults que espera app-cotizador.jsx ──
const PRICES_DEFAULTS = {
  lines: [{ id: 1, difusor: 'aspen', cant: 1, descuento: 0 }],
  descuentoMode: 'global',
  descuento: 0,
  pagoAnual: false,
  fp: { iva: true, contrato: true, vigencia: true, incluye: true },
  fpNotas: '',
  nextId: 2,
};

function todayMx() {
  const d = new Date();
  const months = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function genPropId(clientName) {
  const slug = (clientName || "CLI").toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || "CLI";
  const d = new Date();
  const seq = `${d.getMonth()+1}${d.getDate()}${String(d.getHours()).padStart(2,'0')}`;
  return `OLF-${slug}-${d.getFullYear()}-${seq}`;
}

function selectedForSegment(segment) {
  const slides = SEGMENT_SLIDES[segment] || SEGMENT_SLIDES.longtail;
  return slides.map((kind, i) => ({
    uid: `s${i}-${kind}`,
    kind,
    segment,
    enabled: true,
  }));
}

// ============================================================
// Shared chrome
// ============================================================
function StageHead({ stepLabel, onBack }) {
  return (
    <div className="stage-head">
      <div className="logo-mark">olfativa<span> · advisor</span></div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {onBack && (
          <button className="btn-link" onClick={onBack}>← Atrás</button>
        )}
        <div className="step-meta">{stepLabel}</div>
      </div>
    </div>
  );
}

function Trail({ items }) {
  if (!items.length) return null;
  return (
    <div className="trail">
      {items.map((c, i) => (
        <React.Fragment key={i}>
          <span className="crumb">{c}</span>
          {i < items.length - 1 && <span className="sep">›</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// STEP 1 · Lead type
// ============================================================
function StepLead({ onPick }) {
  return (
    <>
      <StageHead stepLabel="Paso 1 de 4" />
      <div className="stage-body">
        <div className="eyebrow">Nueva propuesta</div>
        <h1 className="question">¿Qué <em>tipo de oportunidad</em> estás atendiendo?</h1>
        <p className="sub">El flujo cambia si vas a responder a una licitación formal o si estás armando una propuesta del funnel comercial.</p>
        <div className="choices two">
          <button className="choice" onClick={() => onPick('funnel')}>
            <div className="choice-num">01</div>
            <div className="choice-title">Funnel comercial</div>
            <div className="choice-sub">Prospecto del pipeline · cliente nuevo o recurrente · armas propuesta con Scent Advisor + cotizador interactivo.</div>
          </button>
          <button className="choice" onClick={() => onPick('licitacion')}>
            <div className="choice-num">02</div>
            <div className="choice-title">Licitación</div>
            <div className="choice-sub">Convocatoria pública o privada con bases formales. Capturas datos y entregamos al equipo de licitaciones.</div>
            <span className="choice-tag">Flujo aparte</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// STEP 2 · Funnel · Nuevo o Recurrente
// ============================================================
function StepStage({ onPick, onBack }) {
  return (
    <>
      <StageHead stepLabel="Paso 2 de 4" onBack={onBack} />
      <div className="stage-body">
        <div className="eyebrow">Funnel · cliente</div>
        <h1 className="question">¿Es un cliente <em>nuevo</em> o <em>recurrente</em>?</h1>
        <p className="sub">Ambos pasan por el mismo flujo de armado — la diferencia es solo de reporting y mensajes.</p>
        <Trail items={['Funnel comercial']} />
        <div style={{ height: 24 }} />
        <div className="choices two">
          <button className="choice" onClick={() => onPick('nuevo')}>
            <div className="choice-num">01</div>
            <div className="choice-title">Cliente nuevo</div>
            <div className="choice-sub">Primera propuesta. Pasa por Scent Advisor y todo el deck del segmento.</div>
          </button>
          <button className="choice" onClick={() => onPick('recurrente')}>
            <div className="choice-num">02</div>
            <div className="choice-title">Cliente recurrente</div>
            <div className="choice-sub">Ya operamos con él. Mismo flujo, queda etiquetado para reporting.</div>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// STEP 3 · Segmento
// ============================================================
function StepSegment({ onPick, onBack, trail }) {
  return (
    <>
      <StageHead stepLabel="Paso 3 de 4" onBack={onBack} />
      <div className="stage-body">
        <div className="eyebrow">Tamaño de cuenta</div>
        <h1 className="question">¿Qué <em>segmento</em> describe a este cliente?</h1>
        <p className="sub">Define el deck y la arquitectura olfativa que vamos a proponer. Si dudas, elige por número de difusores estimados.</p>
        <Trail items={trail} />
        <div style={{ height: 24 }} />
        <div className="choices four">
          {SEGMENTS_META.map(seg => (
            <button key={seg.id} className="choice" onClick={() => onPick(seg.id)}>
              <div className="choice-num">{seg.n}</div>
              <div className="choice-title">{seg.name}</div>
              <div style={{ fontSize: 13, color: 'var(--bone-soft)', marginTop: 4 }}>{seg.range}</div>
              <div className="choice-sub">{seg.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ============================================================
// STEP 4 · Datos del cliente
// ============================================================
function StepData({ initial, onSubmit, onBack, trail }) {
  const [clientName, setClientName] = useState(initial.clientName || "");
  const [propDate, setPropDate] = useState(initial.propDate || todayMx());
  const [account, setAccount] = useState(initial.account || "Ejecutivo Olfativa");

  const canSubmit = clientName.trim().length >= 2;

  return (
    <>
      <StageHead stepLabel="Paso 4 de 4" onBack={onBack} />
      <div className="stage-body">
        <div className="eyebrow">Datos de la propuesta</div>
        <h1 className="question">¿Para <em>quién</em> es la propuesta?</h1>
        <p className="sub">El nombre del cliente y la fecha aparecen en la portada y en cada lámina del deck. Lo puedes corregir después en el cotizador.</p>
        <Trail items={trail} />
        <div style={{ height: 28 }} />
        <form className="form" onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit({ clientName: clientName.trim(), propDate, account }); }}>
          <div className="field">
            <label htmlFor="clientName">Nombre del cliente</label>
            <input id="clientName" autoFocus value={clientName} onChange={e => setClientName(e.target.value)} placeholder="p. ej. Cinépolis · Galerías Toluca" />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="propDate">Fecha de la propuesta</label>
              <input id="propDate" value={propDate} onChange={e => setPropDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="account">Ejecutivo Olfativa</label>
              <input id="account" value={account} onChange={e => setAccount(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <span style={{ fontSize: 12, color: 'var(--bone-mute)', letterSpacing: '0.02em' }}>
              Siguiente: elegir láminas y precios.
            </span>
            <button className="btn-primary" type="submit" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.4 }}>
              Armar propuesta →
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ============================================================
// LICITACIÓN · formulario aparte
// ============================================================
function StepLicitacion({ onBack, onDone }) {
  const [data, setData] = useState({
    entidad: '', numero: '', fechaFallo: '', contacto: '', email: '', telefono: '', notas: '',
  });
  const upd = (k, v) => setData(d => ({ ...d, [k]: v }));
  const canSubmit = data.entidad.trim() && data.numero.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const all = JSON.parse(localStorage.getItem(TRIAGE_LS) || '{"licitaciones":[]}');
      all.licitaciones = all.licitaciones || [];
      all.licitaciones.push({ ...data, capturedAt: new Date().toISOString() });
      localStorage.setItem(TRIAGE_LS, JSON.stringify(all));
    } catch {}
    onDone(data);
  };

  return (
    <>
      <StageHead stepLabel="Flujo: Licitación" onBack={onBack} />
      <div className="stage-body" style={{ alignItems: 'center' }}>
        <span className="pill">Flujo aparte</span>
        <div style={{ height: 18 }} />
        <h1 className="question" style={{ fontSize: 44 }}>Captura las <em>bases</em> y la entregamos al equipo de licitaciones.</h1>
        <p className="sub">Este flujo no genera deck. Guardamos los datos básicos y el equipo de licitaciones arma la propuesta formal con anexos.</p>
        <form className="form" onSubmit={submit} style={{ maxWidth: 640 }}>
          <div className="field">
            <label>Entidad convocante</label>
            <input value={data.entidad} onChange={e => upd('entidad', e.target.value)} placeholder="p. ej. ISSSTE · IMSS · Gobierno CDMX" autoFocus />
          </div>
          <div className="field-row">
            <div className="field">
              <label>No. de licitación</label>
              <input value={data.numero} onChange={e => upd('numero', e.target.value)} placeholder="LP-2026-0042" />
            </div>
            <div className="field">
              <label>Fecha de fallo</label>
              <input value={data.fechaFallo} onChange={e => upd('fechaFallo', e.target.value)} placeholder="DD MMM AAAA" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Contacto</label>
              <input value={data.contacto} onChange={e => upd('contacto', e.target.value)} placeholder="Nombre · cargo" />
            </div>
            <div className="field">
              <label>Email</label>
              <input value={data.email} onChange={e => upd('email', e.target.value)} placeholder="correo@entidad.gob.mx" />
            </div>
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea rows={3} value={data.notas} onChange={e => upd('notas', e.target.value)} placeholder="Partidas, garantías, link a las bases…" />
          </div>
          <div className="actions">
            <span style={{ fontSize: 12, color: 'var(--bone-mute)' }}>Se guarda local y se notifica al equipo.</span>
            <button className="btn-primary" type="submit" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.4 }}>
              Enviar a licitaciones →
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function StepLicitacionDone({ onRestart }) {
  return (
    <>
      <StageHead stepLabel="Licitación · enviada" />
      <div className="stage-body">
        <span className="pill">Recibida</span>
        <div style={{ height: 22 }} />
        <h1 className="question">Bases capturadas. <em>El equipo de licitaciones</em> retoma desde aquí.</h1>
        <p className="sub">Guardamos los datos en este navegador (sessionStorage local). Cuando exista el backend, se enviará automáticamente al área correspondiente.</p>
        <button className="btn-primary" onClick={onRestart} style={{ marginTop: 12 }}>Nueva propuesta</button>
      </div>
    </>
  );
}

// ============================================================
// STEP 5 · Pasos del proceso (resumen previo al cotizador)
// ============================================================
function StepSummary({ payload, segment, onBack, onContinue }) {
  const STEPS = [
    { n: '01', t: 'Diagnóstico',   d: 'Respondiste el triage de tu espacio.' },
    { n: '02', t: 'Recomendación', d: 'El sistema eligió tu segmento ideal.' },
    { n: '03', t: 'Selección',     d: 'El ejecutivo armará el deck de láminas.' },
    { n: '04', t: 'Propuesta',     d: 'Recibirás tu cotización personalizada.' },
  ];
  const segMeta = SEGMENTS_META.find(s => s.id === segment);
  return (
    <>
      <StageHead stepLabel="Pasos del proceso" onBack={onBack} />
      <div className="stage-body">
        <div className="eyebrow">Listo · resumen del flujo</div>
        <h1 className="question">
          Tu propuesta <em>está lista para armarse</em>.
        </h1>
        <p className="sub">
          {payload.clientName ? <><strong style={{ color: 'var(--bone)' }}>{payload.clientName}</strong> · </> : null}
          Segmento <strong style={{ color: 'var(--bone)' }}>{segMeta?.name || segment}</strong>
          {payload.propDate ? <> · {payload.propDate}</> : null}
        </p>

        <div className="step-grid">
          {STEPS.map(s => (
            <div key={s.n} className="step-card">
              <span className="step-card-dot" />
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.t}</div>
              <div className="step-desc">{s.d}</div>
            </div>
          ))}
        </div>

        <div className="actions" style={{ width: '100%', maxWidth: 1120 }}>
          <button className="btn-link" onClick={onBack}>← Corregir datos</button>
          <button className="btn-primary" onClick={onContinue}>
            Ver mi propuesta →
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// HAND-OFF · escribe LS y abre cotizador
// ============================================================
function handoffToCotizador({ segment, clientName, propDate, account, lead, stage }) {
  const propId = genPropId(clientName);
  const payload = {
    selected: selectedForSegment(segment),
    client: {
      clientName,
      propId,
      propDate,
      account,
      accountEmail: 'ventas@olfativa.com',
    },
    prices: PRICES_DEFAULTS,
    meta: { lead, stage, segment, createdAt: new Date().toISOString() },
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
  window.location.href = `cotizador.html?from=advisor&seg=${encodeURIComponent(segment)}`;
}

// ============================================================
// Root state machine
// ============================================================
function App() {
  // step: lead | stage | segment | data | licitacion | licDone
  const [step, setStep] = useState('lead');
  const [lead, setLead] = useState(null);
  const [stage, setStage] = useState(null);
  const [segment, setSegment] = useState(null);
  // Datos capturados en el step de "data" para usar en el "summary"
  const [dataPayload, setDataPayload] = useState(null);

  const trail = useMemo(() => {
    const t = [];
    if (lead === 'funnel') t.push('Funnel comercial');
    if (lead === 'licitacion') t.push('Licitación');
    if (stage) t.push(stage === 'nuevo' ? 'Cliente nuevo' : 'Cliente recurrente');
    if (segment) t.push(SEGMENTS_META.find(s => s.id === segment)?.name || segment);
    return t;
  }, [lead, stage, segment]);

  const reset = () => {
    setStep('lead'); setLead(null); setStage(null); setSegment(null); setDataPayload(null);
  };

  if (step === 'lead') {
    return (
      <div className="stage">
        <StepLead onPick={(l) => {
          setLead(l);
          setStep(l === 'licitacion' ? 'licitacion' : 'stage');
        }} />
      </div>
    );
  }

  if (step === 'licitacion') {
    return (
      <div className="stage">
        <StepLicitacion onBack={() => setStep('lead')} onDone={() => setStep('licDone')} />
      </div>
    );
  }

  if (step === 'licDone') {
    return (
      <div className="stage">
        <StepLicitacionDone onRestart={reset} />
      </div>
    );
  }

  if (step === 'stage') {
    return (
      <div className="stage">
        <StepStage
          onPick={(s) => { setStage(s); setStep('segment'); }}
          onBack={() => { setLead(null); setStep('lead'); }}
        />
      </div>
    );
  }

  if (step === 'segment') {
    return (
      <div className="stage">
        <StepSegment
          trail={trail.slice(0, -1).length ? trail.slice(0, -1) : ['Funnel comercial']}
          onPick={(seg) => { setSegment(seg); setStep('data'); }}
          onBack={() => { setStage(null); setStep('stage'); }}
        />
      </div>
    );
  }

  if (step === 'data') {
    return (
      <div className="stage">
        <StepData
          initial={dataPayload || {}}
          trail={trail}
          onBack={() => { setSegment(null); setStep('segment'); }}
          onSubmit={(payload) => {
            setDataPayload(payload);
            setStep('summary');
          }}
        />
      </div>
    );
  }

  if (step === 'summary') {
    return (
      <div className="stage">
        <StepSummary
          payload={dataPayload || {}}
          segment={segment}
          onBack={() => setStep('data')}
          onContinue={() => {
            const { clientName, propDate, account } = dataPayload || {};
            handoffToCotizador({ segment, clientName, propDate, account, lead, stage });
          }}
        />
      </div>
    );
  }

  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
