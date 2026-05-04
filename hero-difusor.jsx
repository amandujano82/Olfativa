// ============================================================
// HERO DIFUSOR · una slide por modelo
// Foto enorme izquierda + specs técnicas derecha
// Para cuando el prospecto quiere cotizar UN difusor específico
// ============================================================

function HeroDifusor({ device, idx, total, segments = [1, 2, 3, 4], clientName, applicableSegments }) {
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

  const specs = [
    { k: "Cobertura", v: `${device.m2} m² · ${device.m3.toLocaleString()} m³` },
    { k: "Categoría", v: device.tier },
    { k: "Tráfico ideal", v: device.suited },
    { k: "Tag", v: device.tag },
  ];

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
          Olfativa <span style={{ color: PALETTE.gold, margin: '0 8px' }}>·</span> CATÁLOGO INDIVIDUAL
        </Eyebrow>
        <SegmentMarkers applicable={applicableSegments} />
      </div>

      {/* Main split */}
      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 24,
        left: 0, right: 0,
        bottom: SPACING.paddingBottom + 36,
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        alignItems: 'stretch',
      }}>
        {/* LEFT — Hero photo on warm bone */}
        <div style={{
          position: 'relative',
          background: `linear-gradient(135deg, #f4ede0 0%, #ede4d2 60%, #e3d6bd 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: `0 0 0 ${SPACING.paddingX}px`,
          borderRight: `1px solid ${PALETTE.ruleInk}`,
        }}>
          <img src={device.photo} alt={device.name} style={{
            maxWidth: '78%',
            maxHeight: '82%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 30px 50px rgba(40,30,15,0.20))',
            mixBlendMode: 'multiply',
          }} />

          {/* Big number */}
          <div style={{
            position: 'absolute',
            top: 24, left: 24,
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic',
            fontSize: 96,
            color: 'rgba(124,99,55,0.18)',
            lineHeight: 1,
          }}>
            {String(idx + 1).padStart(2, '0')}
          </div>

          {/* Tier tag bottom-left */}
          <div style={{
            position: 'absolute',
            bottom: 24, left: 24,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Eyebrow color={PALETTE.bronze} size={16}>{device.tag}</Eyebrow>
            <Body size={15} color={PALETTE.ink} weight={500}>{device.tier}</Body>
          </div>
        </div>

        {/* RIGHT — Specs + price */}
        <div style={{
          padding: `8px ${SPACING.paddingX}px 0 64px`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Top: name + tagline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>
              DIFUSOR · {String(idx + 1).padStart(2, '0')} DE 09
            </Eyebrow>
            <div style={{ lineHeight: 0.95 }}>
              <SansH size={108} color={PALETTE.ink} weight={300} tracking="-0.04em">
                {device.name.split(' ')[0]}
              </SansH>
              {device.name.includes(' ') && (
                <div style={{ marginTop: -8 }}>
                  <SerifH size={72} color={PALETTE.bronze} italic={true}>
                    {device.name.split(' ').slice(1).join(' ')}
                  </SerifH>
                </div>
              )}
            </div>
            <Body size={TYPE_SCALE.body - 1} color="rgba(14,14,14,0.7)" weight={400} style={{ lineHeight: 1.45, maxWidth: 480 }}>
              {device.heroIntro || `${device.tier}. ${device.suited}.`}
            </Body>
          </div>

          {/* Specs grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '32px 0' }}>
            <HairRule color={PALETTE.ruleInk} />
            {[
              { k: "COBERTURA", v: `${device.m2} m²`, sub: `${device.m3.toLocaleString()} m³` },
              { k: "CATEGORÍA", v: device.tier, sub: null },
              { k: "TRÁFICO IDEAL", v: device.suited, sub: null },
            ].map((s, i) => (
              <React.Fragment key={i}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  alignItems: 'center',
                  padding: '14px 0',
                  gap: 24,
                }}>
                  <Eyebrow color={PALETTE.bronze} size={16}>{s.k}</Eyebrow>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Body size={TYPE_SCALE.body - 2} color={PALETTE.ink} weight={500}>{s.v}</Body>
                    {s.sub && <Body size={14} color="rgba(14,14,14,0.55)" weight={400}>{s.sub}</Body>}
                  </div>
                </div>
                <HairRule color={PALETTE.ruleInk} />
              </React.Fragment>
            ))}
          </div>

          {/* Price block */}
          <div style={{
            background: PALETTE.ink,
            padding: '28px 32px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 20,
            alignItems: 'end',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Eyebrow color={PALETTE.gold} size={14}>RENTA MENSUAL · TODO INCLUIDO</Eyebrow>
              <Body size={15} color={PALETTE.boneSoft} weight={400}>
                Instalación · recargas · mantenimiento
              </Body>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <SerifH size={72} color={PALETTE.gold} italic={false} weight={500} lineHeight={1}>
                {device.priceMxn}
              </SerifH>
              <Body size={16} color={PALETTE.boneSoft} weight={400}>/ mes · MXN</Body>
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
        <Eyebrow color="rgba(14,14,14,0.45)" size={16}>
          AKH SERVICIOS COMERCIALES <span style={{ color: PALETTE.gold, margin: '0 8px' }}>·</span> {clientName}
        </Eyebrow>
        <Eyebrow color="rgba(14,14,14,0.45)" size={14} style={{ letterSpacing: '0.22em' }}>
          {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Eyebrow>
      </div>
    </SlideFrame>
  );
}

// hero copy enriquecido por difusor
const HERO_INTROS = {
  fitz:        "Modelo de entrada. Diseño discreto y silencioso. Ideal para consultorios, habitaciones y espacios de bajo tráfico donde la presencia debe pasar desapercibida.",
  moai:        "El equilibrio del catálogo. Diseño visible y elegante, cobertura media, control manual con timer. La elección más versátil para oficinas, lobbies pequeños y espacios de transición.",
  aspen:       "Premium con control fino vía app Bluetooth. Para espacios donde la programación de horarios e intensidad importa: residencias premium, oficinas ejecutivas, suites.",
  montblanc:   "Versátil entre lo residencial y lo comercial. Control por app, presencia clásica moderna. Buena relación cobertura-precio para áreas amplias bien comunicadas.",
  montblancXl: "Statement piece. Cobertura amplia con operación silenciosa, control programable por zonas. Para spas, hoteles boutique y espacios donde el silencio es parte del lujo.",
  liberty:     "Profesional para alto tráfico. Manual con timer programable, cinco niveles de intensidad. Retail mediano, eventos, agencias automotrices y lobbies con flujo continuo.",
  ural:        "Industrial discreto. Se integra al sistema HVAC o se instala en techo. Prioridad en función sobre estética: gimnasios, mall, hospitales, centros de eventos.",
  empire:      "El más premium del catálogo con control total por app y estadísticas de uso. Para showrooms automotrices, hoteles de lujo y retail de alto valor con clientela exigente.",
  everest:     "Máxima escala. Integración obligatoria a HVAC con control centralizado BAS/BMS. Para proyectos institucionales: aeropuertos, arenas, centros comerciales y hoteles de gran formato.",
};

if (typeof window !== 'undefined') {
  window.HeroDifusor = HeroDifusor;
  window.HERO_INTROS = HERO_INTROS;
}
