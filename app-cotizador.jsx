/* global React, ReactDOM */
// app-cotizador.jsx
// Cotizador Olfativa — arma una propuesta seleccionando láminas
// y la fuente de copy (segmento) para cada una.
//
// Reemplaza app-master.jsx: en vez de mostrar un machote fijo,
// permite al ejecutivo de cuenta:
//   1. elegir qué slides incluir
//   2. reordenarlos (drag & drop)
//   3. cambiar de qué segmento toma el copy cada slide
//   4. editar datos de cliente
//   5. ver preview en vivo + imprimir / exportar PDF
//
// Persistencia: localStorage (la cotización en curso sobrevive al refresh).
// Multi-cotización: el usuario puede guardar/cargar configuraciones nombradas.

const { useEffect, useMemo, useState, useRef, useCallback } = React;

const SEGMENTS = window.SEGMENTS;
const PALETTE = window.PALETTE;
const {
  SlideCover, SlidePromise, SlidePillars, SlideMethod, SlideAroma,
  SlideCatalog, SlideQuote, SlideCuradora, SlideCompliance, SlideTrust, SlideClose,
  TweaksPanel, useTweaks, TweakSection, TweakText,
} = window;

const SLIDE_RENDERERS = {
  cover: SlideCover,
  promise: SlidePromise,
  pillars: SlidePillars,
  curadora: SlideCuradora,
  method: SlideMethod,
  aroma: SlideAroma,
  catalog: SlideCatalog,
  quote: SlideQuote,
  compliance: SlideCompliance,
  trust: SlideTrust,
  close: SlideClose,
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

// Qué segmentos contienen cada tipo de slide (para acotar el dropdown)
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
  longtail: "Long Tail",
  core: "Core",
  key: "Key",
  enterprise: "Enterprise",
  master: "Master",
};

const SEG_COLOR = {
  longtail: "#7BA7C9",
  core: "#8FB37E",
  key: "#C7A668",
  enterprise: "#C2776B",
  master: "#9B8AA8",
};

// ── Default cotización: machote MASTER completo ──────────────
function defaultSelected() {
  const seg = "master";
  return SEGMENTS[seg].slides.map((kind, i) => ({
    uid: `s${i}-${kind}-${Date.now()}`,
    kind,
    segment: seg,
    enabled: true,
  }));
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "clientName": "Cliente",
  "propId": "PROP-2026-001",
  "propDate": "01 MAY 2026",
  "account": "Ejecutivo Olfativa",
  "accountEmail": "ventas@olfativa.com"
}/*EDITMODE-END*/;

// ── Persistencia ─────────────────────────────────────────────
const LS_KEY = "olfativa.cotizador.v1";

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

// ── App ──────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Restaurar selected + cliente desde localStorage al montar
  const [selected, setSelected] = useState(() => {
    const persisted = loadState();
    if (persisted && Array.isArray(persisted.selected) && persisted.selected.length) {
      // hidratar tweaks de cliente si hay
      if (persisted.client) {
        Object.entries(persisted.client).forEach(([k, v]) => {
          if (v != null) setTimeout(() => setTweak(k, v), 0);
        });
      }
      return persisted.selected;
    }
    return defaultSelected();
  });

  // Persistir cuando cambia
  useEffect(() => {
    saveState({
      selected,
      client: {
        clientName: tweaks.clientName,
        propId: tweaks.propId,
        propDate: tweaks.propDate,
        account: tweaks.account,
        accountEmail: tweaks.accountEmail,
      },
    });
  }, [selected, tweaks.clientName, tweaks.propId, tweaks.propDate, tweaks.account, tweaks.accountEmail]);

  // Slides activos para el deck (filtrar enabled)
  const activeSlides = useMemo(
    () => selected.filter(s => s.enabled),
    [selected]
  );
  const total = activeSlides.length;

  // Título del documento
  useEffect(() => {
    document.title = `Cotización · ${tweaks.clientName} · ${tweaks.propId}`;
  }, [tweaks.clientName, tweaks.propId]);

  // ── Acciones sobre selected ──────────────────────────────
  const toggle = (uid) => {
    setSelected(prev => prev.map(s => s.uid === uid ? { ...s, enabled: !s.enabled } : s));
  };
  const remove = (uid) => {
    setSelected(prev => prev.filter(s => s.uid !== uid));
  };
  const setSegmentFor = (uid, seg) => {
    setSelected(prev => prev.map(s => s.uid === uid ? { ...s, segment: seg } : s));
  };
  const move = (uid, dir) => {
    setSelected(prev => {
      const i = prev.findIndex(s => s.uid === uid);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item);
      return next;
    });
  };
  const addSlide = (kind, seg) => {
    setSelected(prev => [
      ...prev,
      { uid: `s-${kind}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        kind, segment: seg, enabled: true },
    ]);
  };
  const loadPreset = (presetSeg) => {
    if (!confirm(`Reemplazar la cotización actual con el machote "${SEG_LABEL[presetSeg]}"?`)) return;
    const seg = SEGMENTS[presetSeg];
    setSelected(seg.slides.map((kind, i) => ({
      uid: `s${i}-${kind}-${Date.now()}`,
      kind,
      segment: presetSeg,
      enabled: true,
    })));
  };
  const clearAll = () => {
    if (!confirm("Vaciar la cotización?")) return;
    setSelected([]);
  };
  const reset = () => {
    if (!confirm("Restablecer al machote MASTER completo?")) return;
    setSelected(defaultSelected());
  };

  // ── Drag & drop reorder ──────────────────────────────────
  const dragUid = useRef(null);
  const onDragStart = (uid) => (e) => {
    dragUid.current = uid;
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", uid); } catch {}
  };
  const onDragOver = (uid) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (overUid) => (e) => {
    e.preventDefault();
    const fromUid = dragUid.current;
    dragUid.current = null;
    if (!fromUid || fromUid === overUid) return;
    setSelected(prev => {
      const fromIdx = prev.findIndex(s => s.uid === fromUid);
      const toIdx = prev.findIndex(s => s.uid === overUid);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const next = prev.slice();
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  // ── Imprimir ─────────────────────────────────────────────
  const print = () => window.print();

  // ── Estadísticas para resumen ────────────────────────────
  const enabledCount = activeSlides.length;
  const totalCount = selected.length;
  const segUsed = useMemo(() => {
    const set = new Set(activeSlides.map(s => s.segment));
    return Array.from(set);
  }, [activeSlides]);

  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <deck-stage>
        {activeSlides.map((entry, i) => {
          const Renderer = SLIDE_RENDERERS[entry.kind];
          const segObj = SEGMENTS[entry.segment] || SEGMENTS.master;
          if (!Renderer) return null;
          const segLabel = SLIDE_LABELS[entry.kind] || entry.kind;
          const prefix = entry.segment !== 'master' ? (SEG_LABEL[entry.segment] || '').slice(0,2).toUpperCase() : '';
          const label = prefix
            ? `${String(i+1).padStart(2,'0')} ${prefix}·${segLabel}`
            : `${String(i+1).padStart(2,'0')} ${segLabel}`;
          const commonProps = {
            segment: segObj,
            clientName: tweaks.clientName,
            propId: tweaks.propId,
            propDate: tweaks.propDate,
            account: tweaks.account,
            accountEmail: tweaks.accountEmail,
            fields: segObj.fields,
            totalSlides: total,
            idx: i,
          };
          return (
            <section key={entry.uid} data-screen-label={label} data-om-validate>
              <Renderer {...commonProps} />
            </section>
          );
        })}
        {activeSlides.length === 0 && (
          <section data-screen-label="00 Vacío" style={{ display:'flex', alignItems:'center', justifyContent:'center', background:'#0E0E0E', color:'#F3EDE3', fontFamily:'Inter Tight, sans-serif' }}>
            <div style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:80, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', marginBottom:24, color:'#C7A668' }}>Cotización vacía</div>
              <div style={{ fontSize:24, opacity:0.6, lineHeight:1.4 }}>Agrega láminas desde el panel lateral →</div>
            </div>
          </section>
        )}
      </deck-stage>

      <TweaksPanel title="Cotizador · Olfativa">

        <TweakSection title="Cliente" subtitle="Aparece en chrome de cada slide.">
          <TweakText label="Nombre del cliente" value={tweaks.clientName} onChange={v => setTweak('clientName', v)} />
          <TweakText label="ID propuesta" value={tweaks.propId} onChange={v => setTweak('propId', v)} />
          <TweakText label="Fecha" value={tweaks.propDate} onChange={v => setTweak('propDate', v)} />
        </TweakSection>

        <TweakSection title="Ejecutivo de cuenta">
          <TweakText label="Nombre" value={tweaks.account} onChange={v => setTweak('account', v)} />
          <TweakText label="Correo" value={tweaks.accountEmail} onChange={v => setTweak('accountEmail', v)} />
        </TweakSection>

        <TweakSection title="Cargar machote" subtitle="Reemplaza la lista por el machote elegido.">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {['longtail','core','key','enterprise','master'].map(seg => (
              <button key={seg}
                onClick={() => loadPreset(seg)}
                style={presetBtnStyle(seg)}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:SEG_COLOR[seg], marginRight:8 }} />
                {SEG_LABEL[seg]} <span style={{ opacity:0.5, fontWeight:400 }}>· {SEGMENTS[seg].slides.length} láminas</span>
              </button>
            ))}
          </div>
        </TweakSection>

        <TweakSection
          title={`Láminas · ${enabledCount} activas / ${totalCount}`}
          subtitle="Arrastra para reordenar. ☐ desactiva sin borrar.">
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {selected.map((s, i) => (
              <SlideRow
                key={s.uid}
                idx={i+1}
                slide={s}
                onToggle={() => toggle(s.uid)}
                onRemove={() => remove(s.uid)}
                onSegment={(seg) => setSegmentFor(s.uid, seg)}
                onMoveUp={() => move(s.uid, -1)}
                onMoveDown={() => move(s.uid, +1)}
                onDragStart={onDragStart(s.uid)}
                onDragOver={onDragOver(s.uid)}
                onDrop={onDrop(s.uid)}
                isFirst={i === 0}
                isLast={i === selected.length - 1}
              />
            ))}
            {selected.length === 0 && (
              <div style={{ padding:'12px 8px', fontSize:11, color:'rgba(41,38,27,0.5)', fontStyle:'italic' }}>
                Sin láminas. Carga un machote o agrega una abajo.
              </div>
            )}
          </div>

          <div style={{ marginTop:10 }}>
            <button onClick={() => setAddOpen(o => !o)} style={addBtnStyle}>
              {addOpen ? '× Cerrar' : '+ Agregar lámina'}
            </button>
            {addOpen && (
              <AddSlidePanel onAdd={(kind, seg) => { addSlide(kind, seg); setAddOpen(false); }} />
            )}
          </div>
        </TweakSection>

        <TweakSection title="Acciones">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={print} style={primaryBtnStyle}>
              Imprimir / Guardar PDF
            </button>
            <button onClick={reset} style={secondaryBtnStyle}>
              Restablecer (Master completo)
            </button>
            <button onClick={clearAll} style={dangerBtnStyle}>
              Vaciar cotización
            </button>
          </div>
          <div style={{
            marginTop:10, padding:'8px 10px',
            background:'rgba(199,166,104,0.08)',
            border:'1px solid rgba(199,166,104,0.2)',
            borderRadius:4, fontSize:10.5, color:'#7A6242', lineHeight:1.4,
          }}>
            {enabledCount} láminas · segmentos en uso: {segUsed.map(s => SEG_LABEL[s]).join(', ') || '—'}
          </div>
        </TweakSection>

      </TweaksPanel>
    </>
  );
}

// ── Subcomponente: fila de slide en el panel ─────────────────
function SlideRow({ idx, slide, onToggle, onRemove, onSegment, onMoveUp, onMoveDown,
                   onDragStart, onDragOver, onDrop, isFirst, isLast }) {
  const segs = SLIDE_SEGMENTS[slide.kind] || ['master'];
  const enabled = slide.enabled;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{
        display:'flex', flexDirection:'column', gap:4,
        padding:'7px 8px',
        background: enabled ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
        border:'.5px solid rgba(0,0,0,0.1)',
        borderLeft: `3px solid ${SEG_COLOR[slide.segment] || '#999'}`,
        borderRadius:6,
        opacity: enabled ? 1 : 0.55,
        cursor:'grab',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:18, fontSize:10, fontVariantNumeric:'tabular-nums', color:'rgba(41,38,27,0.5)' }}>
          {String(idx).padStart(2,'0')}
        </span>
        <button onClick={onToggle} title={enabled ? 'Desactivar' : 'Activar'}
                style={{ ...iconBtnStyle, fontSize:12 }}>
          {enabled ? '☑' : '☐'}
        </button>
        <span style={{ flex:1, fontSize:11.5, fontWeight:500, color:'#29261b' }}>
          {SLIDE_LABELS[slide.kind] || slide.kind}
        </span>
        <button onClick={onMoveUp} disabled={isFirst}
                style={{ ...iconBtnStyle, opacity: isFirst ? 0.3 : 0.7 }} title="Subir">▲</button>
        <button onClick={onMoveDown} disabled={isLast}
                style={{ ...iconBtnStyle, opacity: isLast ? 0.3 : 0.7 }} title="Bajar">▼</button>
        <button onClick={onRemove}
                style={{ ...iconBtnStyle, color:'#A33' }} title="Eliminar">×</button>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, paddingLeft:24 }}>
        <span style={{ fontSize:9.5, color:'rgba(41,38,27,0.5)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
          Copy:
        </span>
        <select value={slide.segment} onChange={e => onSegment(e.target.value)}
                style={{
                  flex:1, fontSize:10.5, padding:'2px 4px',
                  border:'.5px solid rgba(0,0,0,0.1)', borderRadius:4,
                  background:'rgba(255,255,255,0.7)', color:'#29261b',
                }}>
          {segs.map(seg => (
            <option key={seg} value={seg}>{SEG_LABEL[seg]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Subcomponente: panel para agregar nueva lámina ───────────
function AddSlidePanel({ onAdd }) {
  const [kind, setKind] = useState('cover');
  const [seg, setSeg] = useState('master');
  const segs = SLIDE_SEGMENTS[kind] || ['master'];
  // Asegurar que seg sea válido para el kind elegido
  useEffect(() => {
    if (!segs.includes(seg)) setSeg(segs[0] || 'master');
  }, [kind]); // eslint-disable-line

  return (
    <div style={{
      marginTop:6, padding:8, background:'rgba(255,255,255,0.5)',
      border:'.5px solid rgba(0,0,0,0.1)', borderRadius:6,
      display:'flex', flexDirection:'column', gap:6,
    }}>
      <label style={{ fontSize:10, color:'rgba(41,38,27,0.6)' }}>
        Tipo de lámina
        <select value={kind} onChange={e => setKind(e.target.value)}
                style={{ width:'100%', marginTop:3, fontSize:11, padding:'3px 5px',
                         border:'.5px solid rgba(0,0,0,0.1)', borderRadius:4,
                         background:'rgba(255,255,255,0.85)' }}>
          {Object.keys(SLIDE_LABELS).map(k => (
            <option key={k} value={k}>{SLIDE_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize:10, color:'rgba(41,38,27,0.6)' }}>
        Copy del segmento
        <select value={seg} onChange={e => setSeg(e.target.value)}
                style={{ width:'100%', marginTop:3, fontSize:11, padding:'3px 5px',
                         border:'.5px solid rgba(0,0,0,0.1)', borderRadius:4,
                         background:'rgba(255,255,255,0.85)' }}>
          {segs.map(s => <option key={s} value={s}>{SEG_LABEL[s]}</option>)}
        </select>
      </label>
      <button onClick={() => onAdd(kind, seg)} style={primaryBtnStyle}>
        Agregar al final
      </button>
    </div>
  );
}

// ── Estilos compartidos ──────────────────────────────────────
const iconBtnStyle = {
  appearance:'none', border:0, background:'transparent',
  width:18, height:18, padding:0, cursor:'pointer',
  fontSize:10, color:'rgba(41,38,27,0.7)', borderRadius:3,
};

const primaryBtnStyle = {
  appearance:'none', border:0, padding:'8px 10px',
  background:'#C7A668', color:'#0E0E0E',
  fontSize:11, fontWeight:600, letterSpacing:'0.02em',
  borderRadius:6, cursor:'pointer',
  fontFamily:'inherit',
};

const secondaryBtnStyle = {
  appearance:'none', border:'.5px solid rgba(0,0,0,0.15)',
  padding:'6px 10px', background:'rgba(255,255,255,0.6)',
  color:'#29261b', fontSize:11, fontWeight:500,
  borderRadius:6, cursor:'pointer', fontFamily:'inherit',
};

const dangerBtnStyle = {
  appearance:'none', border:'.5px solid rgba(160,40,40,0.25)',
  padding:'6px 10px', background:'rgba(255,240,240,0.5)',
  color:'#A33', fontSize:11, fontWeight:500,
  borderRadius:6, cursor:'pointer', fontFamily:'inherit',
};

const addBtnStyle = {
  appearance:'none', border:'.5px dashed rgba(0,0,0,0.2)',
  padding:'6px 10px', background:'transparent',
  color:'rgba(41,38,27,0.7)', fontSize:11, fontWeight:500,
  borderRadius:6, cursor:'pointer', fontFamily:'inherit', width:'100%',
};

function presetBtnStyle(seg) {
  return {
    appearance:'none', textAlign:'left',
    border:'.5px solid rgba(0,0,0,0.1)',
    padding:'7px 9px', background:'rgba(255,255,255,0.5)',
    color:'#29261b', fontSize:11, fontWeight:500,
    borderRadius:6, cursor:'pointer', fontFamily:'inherit',
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
