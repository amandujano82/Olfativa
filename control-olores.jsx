// ============================================================
// CONTROL DE OLORES · Sistema patentado
// Para casos donde el prospecto pide eliminación de malos olores
// (no aromatización) — baños, mascotas, tabaco, hospitales, etc.
// Datos: olfativa.com/sistema-patente-contra-malos-olores
// ============================================================

function ControlOlores({ idx, total, clientName, applicableSegments }) {
  const PALETTE = window.PALETTE_OLFATIVA;
  const TYPE_SCALE = window.TYPE_SCALE_OLFATIVA;
  const SPACING = window.SPACING_OLFATIVA;
  const SerifH = window.SerifH_OLFATIVA;
  const SansH = window.SansH_OLFATIVA;
  const Body = window.Body_OLFATIVA;
  const Eyebrow = window.Eyebrow_OLFATIVA;
  const HairRule = window.HairRule_OLFATIVA;
  const SegmentMarkers = window.SegmentMarkers_OLFATIVA;

  const SlideFrame = ({ children, bg, style }) => (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Inter Tight', sans-serif",
      ...style,
    }}>{children}</div>
  );

  const useCases = [
    { n: "01", t: "Tabaco", d: "Olores incrustados en textiles, plafones y superficies. Eliminación a nivel molecular, no enmascaramiento." },
    { n: "02", t: "Mascotas", d: "Orina, perro mojado, recintos veterinarios. Neutralización efectiva sin químicos agresivos." },
    { n: "03", t: "Baños y áreas húmedas", d: "Sanitarios públicos, vestidores, cuartos de basura. Operación continua programada." },
    { n: "04", t: "Cocinas y procesos", d: "Olores de preparación, freidoras, residuos orgánicos. Compatible con códigos sanitarios." },
  ];

  const patents = [
    "Patente Europea #0 247 946 B1",
    "Patente Europea #0 401 140 B1",
    "Patente Europea #602 006 0213",
    "Patente Europea #257 6680",
    "Patente Europea #282 4160",
    "Patente Canadiense #279 8239",
    "Patente Estadounidense #8.741.275 B2",
    "Patente Estadounidense #9.200.241 B2",
    "Patente Estadounidense #9.114.180 B2",
  ];

  return (
    <SlideFrame bg={PALETTE.ink}>
      {/* Chrome top */}
      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop - 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Eyebrow color={PALETTE.gold} size={11}>
          Olfativa <span style={{ color: PALETTE.gold, margin: '0 8px' }}>·</span> CONTROL DE OLORES
        </Eyebrow>
        <SegmentMarkers applicable={applicableSegments} dark={true} />
      </div>

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 24,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 36,
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 80,
        alignItems: 'stretch',
      }}>
        {/* LEFT — Headline + intro */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>SISTEMA PATENTADO</Eyebrow>

            <div style={{ lineHeight: 0.96 }}>
              <SerifH size={TYPE_SCALE.title - 4} italic={true} color={PALETTE.bone}>
                No enmascaramos
              </SerifH>
              <br />
              <SansH size={TYPE_SCALE.title - 4} color={PALETTE.gold} weight={300} tracking="-0.04em">
                el mal olor.
              </SansH>
              <br />
              <SansH size={TYPE_SCALE.title - 4} color={PALETTE.bone} weight={300} tracking="-0.04em">
                Lo eliminamos.
              </SansH>
            </div>

            <Body size={TYPE_SCALE.body - 1} color={PALETTE.boneSoft} weight={400} style={{ lineHeight: 1.55, maxWidth: 540 }}>
              Tecnología patentada que neutraliza compuestos olorosos a nivel molecular. No los cubre con un aroma más fuerte — los descompone. Operación continua, integrable a sistemas existentes, certificada por una cartera internacional de patentes.
            </Body>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginTop: 32 }}>
            {[
              { n: "9", l: "PATENTES INTERNACIONALES" },
              { n: "3", l: "REGIONES PROTEGIDAS" },
              { n: "100%", l: "OPERADO POR OLFATIVA" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '22px 18px 0',
                borderTop: `1px solid ${PALETTE.rule}`,
                borderRight: i < 2 ? `1px solid ${PALETTE.rule}` : 'none',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <SerifH size={TYPE_SCALE.title - 36} italic={false} color={PALETTE.gold} lineHeight={1}>
                  {s.n}
                </SerifH>
                <Eyebrow color={PALETTE.boneSoft} size={9}>{s.l}</Eyebrow>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Use cases + patents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, justifyContent: 'space-between' }}>
          {/* Use cases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro} style={{ marginBottom: 16 }}>
              CASOS DE APLICACIÓN
            </Eyebrow>
            <HairRule color={PALETTE.rule} />
            {useCases.map((u, i) => (
              <React.Fragment key={i}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 160px 1fr',
                  gap: 18,
                  padding: '16px 0',
                  alignItems: 'baseline',
                }}>
                  <Eyebrow color={PALETTE.bronze} size={11}>{u.n}</Eyebrow>
                  <Body size={TYPE_SCALE.body - 4} color={PALETTE.bone} weight={500}>{u.t}</Body>
                  <Body size={12} color={PALETTE.boneSoft} weight={400} style={{ lineHeight: 1.4 }}>{u.d}</Body>
                </div>
                <HairRule color={PALETTE.rule} />
              </React.Fragment>
            ))}
          </div>

          {/* Patents wall */}
          <div style={{
            background: 'rgba(199,166,104,0.06)',
            border: `1px solid ${PALETTE.goldSoft}`,
            padding: '20px 24px',
          }}>
            <Eyebrow color={PALETTE.gold} size={10} style={{ marginBottom: 14 }}>
              CARTERA DE PATENTES
            </Eyebrow>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px 18px',
            }}>
              {patents.map((p, i) => (
                <Body key={i} size={9.5} color={PALETTE.boneSoft} weight={400} style={{ letterSpacing: '0.02em', lineHeight: 1.3 }}>
                  {p}
                </Body>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chrome bottom */}
      <div style={{
        position: 'absolute',
        bottom: SPACING.paddingBottom - 20,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Eyebrow color="rgba(243,237,227,0.4)" size={10}>
          AKH SERVICIOS COMERCIALES <span style={{ color: PALETTE.gold, margin: '0 8px' }}>·</span> {clientName}
        </Eyebrow>
        <Eyebrow color="rgba(243,237,227,0.4)" size={11} style={{ letterSpacing: '0.22em' }}>
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Eyebrow>
      </div>
    </SlideFrame>
  );
}

if (typeof window !== 'undefined') {
  window.ControlOlores = ControlOlores;
}
