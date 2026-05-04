// ============================================================
// CATALOG MINIMALISTA · 6 difusores curados
// Fitz, Moai, Aspen, Empire, Ural, Everest
// Solo foto, nombre, m², precio. Sin tag de marketing.
// ============================================================

function CatalogMin({ idx, total, clientName, applicableSegments }) {
  const PALETTE = window.PALETTE_OLFATIVA;
  const TYPE_SCALE = window.TYPE_SCALE_OLFATIVA;
  const SPACING = window.SPACING_OLFATIVA;
  const SerifH = window.SerifH_OLFATIVA;
  const SansH = window.SansH_OLFATIVA;
  const Body = window.Body_OLFATIVA;
  const Eyebrow = window.Eyebrow_OLFATIVA;
  const HairRule = window.HairRule_OLFATIVA;
  const SegmentMarkers = window.SegmentMarkers_OLFATIVA;
  const D = window.DIFFUSERS;

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

  const ids = ["fitz", "moai", "aspen", "empire", "ural", "everest"];
  const devices = ids.map(id => D[id]);

  return (
    <SlideFrame bg={PALETTE.bone}>
      {/* Chrome top */}
      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop - 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Eyebrow color={PALETTE.bronze} size={14}>
          Olfativa <span style={{ color: PALETTE.gold, margin: '0 8px' }}>·</span> CATÁLOGO
        </Eyebrow>
        <SegmentMarkers applicable={applicableSegments} />
      </div>

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 24,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 36,
        display: 'flex', flexDirection: 'column', gap: 36,
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>SEIS EQUIPOS · UN PORTAFOLIO</Eyebrow>
            <div style={{ lineHeight: 1.0 }}>
              <SansH size={TYPE_SCALE.title - 14} color={PALETTE.ink} weight={300} tracking="-0.04em">
                Seis equipos.{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 14} color={PALETTE.bronze}>
                Toda la cobertura.
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 3} color="rgba(14,14,14,0.65)" weight={400} style={{ textAlign: 'right', lineHeight: 1.5 }}>
            Selección curada del catálogo Olfativa. De 50&nbsp;m² hasta 1,600&nbsp;m². Asignación por sede según diagnóstico técnico.
          </Body>
        </div>

        <HairRule color={PALETTE.ruleInk} />

        {/* 3×2 grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 24,
        }}>
          {devices.map((d, i) => (
            <div key={d.id} style={{
              display: 'flex', flexDirection: 'column',
              background: '#FFFFFF',
              border: `1px solid ${PALETTE.ruleInk}`,
              position: 'relative',
            }}>
              {/* number */}
              <div style={{
                position: 'absolute', top: 12, left: 14,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: 22,
                color: PALETTE.bronze,
                opacity: 0.5,
                zIndex: 2,
              }}>
                {String(i+1).padStart(2,'0')}
              </div>

              {/* photo */}
              <div style={{
                flex: 1,
                background: `linear-gradient(180deg, #f7f1e6 0%, #ede4d2 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: `1px solid ${PALETTE.ruleInk}`,
                minHeight: 0,
                padding: '20px 12px 12px',
              }}>
                <img src={d.photo} alt={d.name} style={{
                  maxWidth: '72%',
                  maxHeight: '92%',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 16px 28px rgba(40,30,15,0.16))',
                }} />
              </div>

              {/* footer */}
              <div style={{
                padding: '18px 22px 20px',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'end',
                gap: 12,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <SerifH size={32} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>
                    {d.name}
                  </SerifH>
                  <Body size={14} color="rgba(14,14,14,0.55)" weight={400}>
                    {d.m2} m² · {d.m3.toLocaleString()} m³
                  </Body>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <SerifH size={26} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>
                    {d.priceMxn}
                  </SerifH>
                  <Body size={9} color="rgba(14,14,14,0.5)" weight={400} style={{ letterSpacing: '0.1em' }}>
                    /MES · MXN
                  </Body>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <Body size={14} color="rgba(14,14,14,0.5)" weight={400}>
            Renta mensual · Instalación, recargas y mantenimiento incluidos · IVA no incluido · Vigentes 2026
          </Body>
          <Body size={14} color={PALETTE.bronze} weight={500} style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Asignación por diagnóstico técnico
          </Body>
        </div>
      </div>

      {/* Chrome bottom slide num */}
      <div style={{
        position: 'absolute',
        bottom: SPACING.paddingBottom - 20,
        right: SPACING.paddingX,
      }}>
        <Eyebrow color="rgba(14,14,14,0.45)" size={14} style={{ letterSpacing: '0.22em' }}>
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Eyebrow>
      </div>
    </SlideFrame>
  );
}

if (typeof window !== 'undefined') {
  window.CatalogMin = CatalogMin;
}
