/* global React */
const { Fragment: F } = React;

// Pull tokens + shared components from window (Babel scopes each <script> separately)
const SEGMENTS = window.SEGMENTS;
const CURADORA = window.CURADORA;
const PALETTE = window.PALETTE;
const TYPE_SCALE = window.TYPE_SCALE;
const SPACING = window.SPACING;
const SerifH = window.SerifH;
const SansH = window.SansH;
const Eyebrow = window.Eyebrow;
const Body = window.Body;
const HairRule = window.HairRule;
const OlfativaMark = window.OlfativaMark;
const SlideChrome = window.SlideChrome;
const SlideFrame = window.SlideFrame;

// ============================================================
// SLIDE 1 · COVER
// ============================================================
function SlideCover({ segment, clientName, propId, propDate, totalSlides, idx }) {
  const [t1, t2] = segment.propTitleParts;
  const photo = segment.photos?.cover;
  return (
    <SlideFrame bg={PALETTE.ink}>
      {/* Full-bleed photo · capa base */}
      {photo && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
      )}
      {/* Overlay editorial: gradiente vertical para legibilidad */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(14,14,14,0.78) 0%, rgba(14,14,14,0.18) 28%, rgba(14,14,14,0.18) 52%, rgba(14,14,14,0.88) 100%)`,
      }} />
      {/* Viñeta lateral suave hacia el folio para reforzar la columna izquierda */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(90deg, rgba(14,14,14,0.55) 0%, rgba(14,14,14,0.10) 32%, rgba(14,14,14,0) 55%)`,
      }} />

      {/* TOP STRIP — wordmark izquierda, meta derecha */}
      <div style={{
        position: 'absolute',
        top: 64, left: SPACING.paddingX, right: SPACING.paddingX,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        zIndex: 2,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontWeight: 500,
            fontSize: 44, lineHeight: 1, color: PALETTE.bone,
            letterSpacing: '0.005em',
          }}>
            Olfativa<span style={{ fontSize: 18, color: PALETTE.gold, verticalAlign: 'super', marginLeft: 2 }}>®</span>
          </span>
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 11, fontWeight: 500,
            color: 'rgba(243,237,227,0.55)',
            letterSpacing: '0.34em', textTransform: 'uppercase',
          }}>
            Casa Olfativa · México
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', textAlign: 'right' }}>
          <span style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 10.5, fontWeight: 600,
            color: PALETTE.gold,
            letterSpacing: '0.36em', textTransform: 'uppercase',
          }}>
            Propuesta · Vol. {String(idx + 1).padStart(2,'0')}
          </span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontWeight: 400,
            fontSize: 32, lineHeight: 1, color: PALETTE.bone,
            letterSpacing: '0.005em',
          }}>
            {clientName || '—'}
          </span>
        </div>
      </div>

      {/* TÍTULO PRINCIPAL — esquina inferior izquierda, escala editorial */}
      <div style={{
        position: 'absolute',
        left: SPACING.paddingX, right: SPACING.paddingX,
        bottom: 280,
        zIndex: 2,
        maxWidth: 1320,
      }}>
        <div style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 11.5, fontWeight: 600,
          color: PALETTE.gold,
          letterSpacing: '0.34em', textTransform: 'uppercase',
          marginBottom: 36,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{ width: 52, height: 1, background: PALETTE.gold, opacity: 0.7 }} />
          Propuesta de aromatización profesional
        </div>
        <div style={{ lineHeight: 0.95 }}>
          <div style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 144, fontWeight: 300,
            color: PALETTE.bone,
            letterSpacing: '-0.042em',
          }}>
            {t1}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: 'italic', fontWeight: 400,
            fontSize: 152,
            color: PALETTE.gold,
            letterSpacing: '-0.028em',
            marginTop: -10,
          }}>
            {t2}
          </div>
        </div>
        <div style={{ marginTop: 28, maxWidth: 760 }}>
          <Body size={TYPE_SCALE.body - 2} color={PALETTE.boneSoft} weight={300}>
            {segment.propSubtitle}
          </Body>
        </div>
      </div>

      {/* BOTTOM STRIP — hairline + meta */}
      <div style={{
        position: 'absolute',
        bottom: 84, left: SPACING.paddingX, right: SPACING.paddingX,
        zIndex: 2,
      }}>
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, rgba(199,166,104,0.65) 0%, rgba(199,166,104,0.2) 100%)',
          marginBottom: 24,
        }} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 36,
        }}>
          <CoverMeta label="Folio"    value={propId || '—'} />
          <CoverMeta label="Fecha"    value={propDate || '—'} />
          <CoverMeta label="Vigencia" value="30 días naturales" />
          <CoverMeta label="Cliente"  value={clientName || '—'} />
        </div>
      </div>
    </SlideFrame>
  );
}

function CoverMeta({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 10.5, fontWeight: 600,
        color: 'rgba(199,166,104,0.85)',
        letterSpacing: '0.34em', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'normal', fontWeight: 500,
        fontSize: 24, lineHeight: 1.15,
        color: PALETTE.bone,
        letterSpacing: '-0.005em',
      }}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// SLIDE · PROMISE (positioning)
// ============================================================
function SlidePromise({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const photo = segment.photos?.promise;
  return (
    <SlideFrame bg={PALETTE.ink}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="POSICIONAMIENTO" propId={propId} propDate={propDate} />

      {/* Left photo half */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: '42%',
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to left, ${PALETTE.ink} 0%, rgba(14,14,14,0.5) 12%, rgba(14,14,14,0) 35%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 60,
        bottom: SPACING.paddingBottom + 80,
        left: photo ? '46%' : SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 36,
      }}>
        <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>{segment.promiseEyebrow}</Eyebrow>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.04 }}>
          <SansH size={TYPE_SCALE.display + 4} color={PALETTE.bone} weight={400} tracking="-0.03em">
            {segment.promiseLead}
          </SansH>
          <SerifH size={TYPE_SCALE.display + 4} color={PALETTE.gold}>
            {segment.promiseHighlight}
          </SerifH>
        </div>

        <HairRule color={PALETTE.rule} length="80px" thickness={1} style={{ marginTop: 8, marginBottom: 8 }} />

        <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={400} style={{ maxWidth: 640 }}>
          {segment.promiseBody}
        </Body>

        <div style={{ display: 'flex', gap: 56, marginTop: 12 }}>
          {segment.promiseStats.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <SerifH size={TYPE_SCALE.title - 8} color={PALETTE.gold} italic={false} weight={500}>
                {s.n}
              </SerifH>
              <Eyebrow color={PALETTE.boneSoft} size={15}>{s.l}</Eyebrow>
            </div>
          ))}
        </div>

        {/* Rail de marcas representativas */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow color="rgba(243,237,227,0.5)" size={16} style={{ letterSpacing: '0.24em' }}>
            ALGUNAS DE LAS MARCAS QUE YA OPERAN CON OLFATIVA
          </Eyebrow>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0 28px',
            rowGap: 12,
            opacity: 0.82,
          }}>
            {[
              { n: "MICROSOFT",          f: "'Inter Tight', sans-serif", w: 600, italic: false, size: 16, ls: '0.04em' },
              { n: "EL PALACIO DE HIERRO", f: "'Inter Tight', sans-serif", w: 600, italic: false, size: 13, ls: '0.18em' },
              { n: "HYATT",              f: "'Inter Tight', sans-serif",  w: 700, italic: false, size: 18, ls: '0.42em' },
              { n: "AMERICAN EXPRESS",   f: "'Inter Tight', sans-serif",  w: 700, italic: false, size: 13, ls: '0.16em' },
              { n: "VOLVO",              f: "'Inter Tight', sans-serif",  w: 500, italic: false, size: 19, ls: '0.46em' },
              { n: "THE NORTH FACE",     f: "'Inter Tight', sans-serif",  w: 800, italic: false, size: 12, ls: '0.10em' },
            ].map((b, i) => (
              <span key={i} style={{
                fontFamily: b.f,
                fontWeight: b.w,
                fontStyle: b.italic ? 'italic' : 'normal',
                fontSize: b.size,
                letterSpacing: b.ls,
                color: PALETTE.bone,
                whiteSpace: 'nowrap',
                textTransform: b.italic ? 'none' : undefined,
              }}>
                {b.n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · PILLARS (3, 4 or 5 pillars)
// ============================================================
function SlidePillars({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const pillars = segment.valuePillars;
  const cols = pillars.length >= 4 ? Math.min(pillars.length, 5) : 3;
  const photo = segment.photos?.pillars;

  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="MÉTODO" propId={propId} propDate={propDate} />

      {/* Top-right photo strip — above pillars */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '38%', height: 280,
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to bottom, rgba(14,14,14,0.15) 0%, rgba(243,237,227,0.4) 70%, ${PALETTE.bone} 100%)`,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to left, rgba(14,14,14,0.0) 0%, rgba(243,237,227,0.35) 80%, ${PALETTE.bone} 100%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 24,
        bottom: SPACING.paddingBottom + 32,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 48,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.pillarsEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.0 }}>
              <SansH size={TYPE_SCALE.title} color={PALETTE.ink} weight={400} tracking="-0.03em">
                {segment.pillarsTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title} color={PALETTE.bronze}>
                {segment.pillarsTitleB}
              </SerifH>
            </div>
          </div>
          {segment.pillarsIntro && (
            <Body size={TYPE_SCALE.body - 2} color="rgba(14,14,14,0.7)" weight={400} style={{ lineHeight: 1.45, paddingBottom: 6 }}>
              {segment.pillarsIntro}
            </Body>
          )}
        </div>

        <HairRule color={PALETTE.ruleInk} thickness={1} />

        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 56,
          alignContent: 'center',
        }}>
          {pillars.map((p, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 20,
              borderLeft: i > 0 ? `1px solid ${PALETTE.ruleInk}` : 'none',
              paddingLeft: i > 0 ? 28 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                <SerifH size={TYPE_SCALE.subtitle + 4} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>
                  {String(i+1).padStart(2,'0')}
                </SerifH>
                <Eyebrow color={PALETTE.goldSoft} size={16}>{p.eyebrow.toUpperCase()}</Eyebrow>
              </div>
              <SerifH size={TYPE_SCALE.subtitle - 6} color={PALETTE.ink} italic={false} weight={500} lineHeight={1.15}>
                {p.title}
              </SerifH>
              <Body size={TYPE_SCALE.small} color="rgba(14,14,14,0.65)" weight={400} style={{ lineHeight: 1.5 }}>
                {p.body}
              </Body>
            </div>
          ))}
        </div>

        <HairRule color={PALETTE.ruleInk} thickness={1} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 32 }}>
          <Body size={TYPE_SCALE.small - 2} color="rgba(14,14,14,0.5)" weight={400}>
            {segment.pillarsFootnote || "Cada pilar es un compromiso operativo, no una promesa de marketing."}
          </Body>
          <Eyebrow color={PALETTE.bronze} size={14} style={{ letterSpacing: '0.22em' }}>
            {segment.pillarsTagline || "ESTÁNDAR OLFATIVA"}
          </Eyebrow>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · METHOD (3 or 6 phases)
// ============================================================
function SlideMethod({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const phases = segment.phases;
  const cols = phases.length >= 6 ? 3 : phases.length;
  const rows = phases.length >= 6 ? 2 : 1;
  const photo = segment.photos?.method;

  return (
    <SlideFrame bg={PALETTE.ink}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="IMPLEMENTACIÓN" propId={propId} propDate={propDate} />

      {/* Atmospheric photo strip on right */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: '32%',
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.5,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, ${PALETTE.ink} 0%, rgba(14,14,14,0.7) 25%, rgba(14,14,14,0.4) 100%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'flex', flexDirection: 'column', gap: 44,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 80, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>{segment.methodEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.02 }}>
              <SansH size={TYPE_SCALE.title - 12} color={PALETTE.bone} weight={400} tracking="-0.03em">
                {segment.methodTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 12} color={PALETTE.gold}>
                {segment.methodTitleB}
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 2} color={PALETTE.boneSoft} weight={400} style={{ textAlign: 'right' }}>
            {segment.methodIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.rule} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: rows === 2 ? '52px 56px' : '0 56px',
        }}>
          {phases.map((p, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eyebrow color={PALETTE.gold} size={16}>FASE</Eyebrow>
                <Eyebrow color={PALETTE.boneSoft} size={16}>{p.n}</Eyebrow>
                <HairRule color={PALETTE.rule} length={32} />
              </div>
              <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={500} style={{ lineHeight: 1.2 }}>
                {p.t}
              </Body>
              <Body size={TYPE_SCALE.small - 1} color="rgba(243,237,227,0.65)" weight={400}>
                {p.d}
              </Body>
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · AROMA (1, 2 or 3 tiers)
// ============================================================
function SlideAroma({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const tiers = segment.aromaTiers;
  const cols = tiers.length;

  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="AROMA" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'flex', flexDirection: 'column', gap: 44,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.aromaEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.02 }}>
              <SansH size={TYPE_SCALE.title - 12} color={PALETTE.ink} weight={400} tracking="-0.03em">
                {segment.aromaTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 12} color={PALETTE.bronze}>
                {segment.aromaTitleB}
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 2} color="rgba(14,14,14,0.7)" weight={400} style={{ textAlign: 'right' }}>
            {segment.aromaIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.ruleInk} />

        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: cols === 1 ? '1.4fr 1fr' : `repeat(${cols}, 1fr)`,
          gap: 40,
        }}>
          {tiers.map((t, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 18,
              padding: cols === 1 ? '32px 40px' : '28px 28px',
              background: i === tiers.length - 1 && cols > 1 ? 'rgba(199,166,104,0.10)' : 'rgba(14,14,14,0.04)',
              border: `1px solid ${i === tiers.length - 1 && cols > 1 ? 'rgba(199,166,104,0.35)' : 'rgba(14,14,14,0.10)'}`,
              borderRadius: 2,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Eyebrow color={PALETTE.goldSoft} size={16}>NIVEL {String(i+1).padStart(2,'0')}</Eyebrow>
                <SerifH size={TYPE_SCALE.subtitle + 4} color={PALETTE.ink} italic={false} weight={500} lineHeight={1.05}>
                  {t.name}
                </SerifH>
                <Body size={TYPE_SCALE.small - 2} color={PALETTE.goldSoft} weight={500} style={{ fontStyle: 'italic' }}>
                  {t.tag}
                </Body>
              </div>
              <HairRule color="rgba(14,14,14,0.10)" />
              <Body size={TYPE_SCALE.small - 1} color="rgba(14,14,14,0.7)" weight={400}>
                {t.body}
              </Body>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 'auto' }}>
                {t.bullets.map((b, j) => (
                  <div key={j} style={{ display: 'grid', gridTemplateColumns: '14px 1fr', alignItems: 'start', gap: 10 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: PALETTE.bronze, marginTop: 9, justifySelf: 'start' }} />
                    <div style={{
                      fontFamily: "'Inter Tight', sans-serif",
                      fontSize: TYPE_SCALE.small - 3,
                      fontWeight: 500,
                      color: PALETTE.ink,
                      lineHeight: 1.4,
                      letterSpacing: '-0.005em',
                    }}>{b}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · COMPLIANCE (Enterprise only)
// ============================================================
function SlideCompliance({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const photo = segment.photos?.compliance;
  return (
    <SlideFrame bg={PALETTE.inkSoft}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="CUMPLIMIENTO" propId={propId} propDate={propDate} />

      {/* Atmospheric lab photo top-right */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '40%', height: '100%',
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.45,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to left, rgba(14,14,14,0.3) 0%, rgba(26,24,21,0.85) 70%, ${PALETTE.inkSoft} 100%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'flex', flexDirection: 'column', gap: 56,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 80, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>{segment.complianceEyebrow}</Eyebrow>
            <SerifH size={TYPE_SCALE.title - 12} color={PALETTE.bone} italic={false} weight={400}>
              {segment.complianceTitle}
            </SerifH>
          </div>
          <Body size={TYPE_SCALE.body - 2} color={PALETTE.boneSoft} weight={400} style={{ textAlign: 'right' }}>
            {segment.complianceIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.rule} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px 64px',
        }}>
          {segment.complianceCerts.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SerifH size={TYPE_SCALE.subtitle - 2} color={PALETTE.gold} italic={false} weight={500}>
                {c.name}
              </SerifH>
              <HairRule color={PALETTE.rule} length={48} />
              <Body size={TYPE_SCALE.small - 1} color={PALETTE.boneSoft} weight={400}>
                {c.desc}
              </Body>
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · TRUST (testimonial + investment)
// ============================================================
function SlideTrust({ segment, clientName, idx, totalSlides, fields, propId, propDate }) {
  const photo = segment.photos?.trust;
  return (
    <SlideFrame bg={PALETTE.ink}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="ALCANCE E INVERSIÓN" propId={propId} propDate={propDate} />

      {/* Atmospheric portrait at far left edge */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, bottom: 0,
          width: '30%',
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: '60% 28%',
          opacity: 0.92,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, rgba(14,14,14,0.15) 0%, rgba(14,14,14,0.55) 75%, ${PALETTE.ink} 100%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: photo ? SPACING.paddingX + 140 : SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 80,
        alignItems: 'stretch',
      }}>
        {/* Left: scope + testimonial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>ALCANCE</Eyebrow>
            <SerifH size={TYPE_SCALE.subtitle + 4} color={PALETTE.bone} italic={false} weight={400} lineHeight={1.1}>
              {fields.scope}
            </SerifH>
          </div>

          <div style={{
            background: 'rgba(243,237,227,0.04)',
            border: `1px solid ${PALETTE.rule}`,
            padding: '36px 40px',
            display: 'flex', flexDirection: 'column', gap: 20,
            borderRadius: 2,
          }}>
            <SerifH size={56} color={PALETTE.gold} italic lineHeight={0.6} style={{ display: 'block' }}>"</SerifH>
            <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={400} style={{ fontStyle: 'italic', lineHeight: 1.4 }}>
              {segment.trust.quote}
            </Body>
            <HairRule color={PALETTE.rule} length={48} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Body size={TYPE_SCALE.small - 2} color={PALETTE.bone} weight={500}>{segment.trust.by}</Body>
              <Body size={TYPE_SCALE.small - 3} color="rgba(243,237,227,0.55)" weight={400}>{segment.trust.co}</Body>
            </div>
          </div>
        </div>

        {/* Right: investment */}
        <div style={{
          background: PALETTE.inkSoft,
          border: `1px solid ${PALETTE.rule}`,
          padding: '40px 44px',
          display: 'flex', flexDirection: 'column', gap: 28,
          borderRadius: 2,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>INVERSIÓN</Eyebrow>
            <Body size={TYPE_SCALE.small} color={PALETTE.boneSoft} weight={400}>
              {fields.unitsLabel}
            </Body>
          </div>

          <HairRule color={PALETTE.rule} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {[
              { l: 'Diseño / curaduría', v: fields.priceDesign },
              { l: 'Operación', v: fields.priceUnits },
              { l: 'Servicio asignado', v: fields.priceOps },
            ].map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 16, alignItems: 'baseline' }}>
                <div style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: TYPE_SCALE.small - 2,
                  fontWeight: 400,
                  color: PALETTE.boneSoft,
                  lineHeight: 1.35,
                }}>{row.l}</div>
                <div style={{
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: TYPE_SCALE.small - 2,
                  fontWeight: 500,
                  color: PALETTE.bone,
                  lineHeight: 1.35,
                  textAlign: 'right',
                }}>{row.v}</div>
              </div>
            ))}
          </div>

          <HairRule color={PALETTE.rule} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Eyebrow color={PALETTE.boneSoft} size={16}>TOTAL · MXN</Eyebrow>
              <Eyebrow color="rgba(243,237,227,0.55)" size={16}>IVA INCLUIDO</Eyebrow>
            </div>
            <SerifH size={TYPE_SCALE.display + 8} color={PALETTE.bone} italic={false} weight={400} lineHeight={1.0}>
              {fields.priceTotal}
            </SerifH>
            <Body size={TYPE_SCALE.small - 2} color={PALETTE.boneSoft} weight={400}>
              {fields.terms}
            </Body>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · CLOSE
// ============================================================
function SlideClose({ segment, clientName, idx, totalSlides, account, accountEmail, propDate, propId }) {
  const photo = segment.photos?.close;
  return (
    <SlideFrame bg={PALETTE.ink}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="PRÓXIMO PASO" propId={propId} propDate={propDate} />

      {/* Atmospheric photo BG — far right */}
      {photo && (
        <div style={{
          position: 'absolute',
          top: 0, right: 0, bottom: 0,
          width: '42%',
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.55,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(to right, ${PALETTE.ink} 0%, rgba(14,14,14,0.7) 35%, rgba(14,14,14,0.3) 100%)`,
          }} />
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 64,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>OLFATIVA × {clientName.toUpperCase()}</Eyebrow>
          <div style={{ lineHeight: 1.02, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1500 }}>
            <SansH size={TYPE_SCALE.hero - 32} color={PALETTE.bone} weight={400} tracking="-0.03em">
              {segment.closeLead}
            </SansH>
            <SerifH size={TYPE_SCALE.hero - 32} color={PALETTE.gold} lineHeight={1.0}>
              {segment.closeHighlight}
            </SerifH>
            <Body size={TYPE_SCALE.bodyLg - 2} color={PALETTE.boneSoft} weight={300} style={{ marginTop: 16, maxWidth: 980 }}>
              {segment.closeSub}
            </Body>
          </div>
        </div>

        <div>
          <HairRule color={PALETTE.rule} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 80, marginTop: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Eyebrow color="rgba(243,237,227,0.5)" size={16}>EJECUTIVO DE CUENTA</Eyebrow>
              <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={500}>{account}</Body>
              <Body size={TYPE_SCALE.small - 2} color={PALETTE.boneSoft} weight={400}>{accountEmail}</Body>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Eyebrow color="rgba(243,237,227,0.5)" size={16}>VIGENCIA</Eyebrow>
              <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={500}>30 días desde {propDate}</Body>
              <Body size={TYPE_SCALE.small - 2} color={PALETTE.boneSoft} weight={400}>{propId}</Body>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Eyebrow color="rgba(243,237,227,0.5)" size={16}>SIGUIENTE PASO</Eyebrow>
              <Body size={TYPE_SCALE.body - 2} color={PALETTE.bone} weight={500}>Visita técnica</Body>
              <Body size={TYPE_SCALE.small - 2} color={PALETTE.boneSoft} weight={400}>Agendamos diagnóstico</Body>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · CATALOG (Catálogo de equipos — adaptive grid by count)
// Layouts: 4→2×2, 5→2+3, 7→4+3, 9→3×3
// ============================================================
// ── Catálogo · fila tipo ficha (layout A) ──────────────────
function CatalogRow({ d, dense = false }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '64px 0.95fr 1.5fr 0.7fr 0.6fr',
      alignItems: 'center',
      gap: 14,
      padding: dense ? '10px 8px' : '14px 8px',
      borderBottom: `1px solid ${PALETTE.ruleInk}`,
    }}>
      {/* Photo */}
      <div style={{
        width: 64, height: 64,
        background: 'linear-gradient(180deg, #f4ede0 0%, #ede4d2 100%)',
        border: `1px solid ${PALETTE.ruleInk}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 1,
      }}>
        <img src={d.photo} alt={d.name} style={{
          maxWidth: '78%', maxHeight: '78%',
          objectFit: 'contain', mixBlendMode: 'multiply',
        }} />
      </div>

      {/* Name + tag */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SerifH size={26} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>
          {d.name}
        </SerifH>
        <span style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 14, fontWeight: 600, letterSpacing: '0.18em',
          color: PALETTE.bronze, textTransform: 'uppercase',
        }}>
          {d.tag}
        </span>
      </div>

      {/* Suited */}
      <Body size={16} color="rgba(14,14,14,0.7)" weight={400} style={{ lineHeight: 1.35 }}>
        {d.suited}
      </Body>

      {/* Coverage */}
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontStyle: 'italic',
        fontSize: 16,
        color: PALETTE.ink,
        lineHeight: 1.1,
      }}>
        {d.m2} m²<br/>
        <span style={{ fontSize: 15, color: 'rgba(14,14,14,0.5)' }}>
          {d.m3.toLocaleString()} m³
        </span>
      </div>

      {/* Price */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <SerifH size={28} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>
          {d.priceMxn}
        </SerifH>
        <Body size={16} color="rgba(14,14,14,0.5)" weight={400}>
          / mes · MXN
        </Body>
      </div>
    </div>
  );
}

// ── Catálogo · header de columnas para layout tabla ────────
function CatalogTableHeader() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '64px 0.95fr 1.5fr 0.7fr 0.6fr',
      alignItems: 'center',
      gap: 14,
      padding: '0 8px 10px',
      borderBottom: `1px solid ${PALETTE.ruleInk}`,
    }}>
      <div></div>
      {['Equipo', 'Espacios indicados', 'Cobertura', 'Renta mensual'].map((h, i) => (
        <span key={i} style={{
          fontFamily: "'Inter Tight', sans-serif",
          fontSize: 16, fontWeight: 600, letterSpacing: '0.20em',
          color: 'rgba(14,14,14,0.45)', textTransform: 'uppercase',
          textAlign: i === 3 ? 'right' : 'left',
        }}>
          {h}
        </span>
      ))}
    </div>
  );
}

function SlideCatalog({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const DIFFUSERS = (typeof window !== 'undefined' && window.DIFFUSERS) || {};
  const ids = segment.catalogDeviceIds || [];
  const devices = ids.map(id => DIFFUSERS[id]).filter(Boolean);
  const n = devices.length;
  const layout = segment.catalogLayout || 'table'; // 'table' | 'split'

  // ─── LAYOUT A: TABLE (lista tipo ficha, 1 fila × difusor) ───
  if (layout === 'table') {
    const dense = n >= 8;
    return (
      <SlideFrame bg={PALETTE.bone}>
        <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="CATÁLOGO DE EQUIPOS" propId={propId} propDate={propDate} />
        <div style={{
          position: 'absolute',
          top: SPACING.paddingTop + 8,
          left: SPACING.paddingX,
          right: SPACING.paddingX,
          bottom: SPACING.paddingBottom + 88,
          display: 'flex', flexDirection: 'column', gap: 28,
        }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 72, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.catalogEyebrow}</Eyebrow>
              <div style={{ lineHeight: 1.02 }}>
                <SansH size={TYPE_SCALE.title - 16} color={PALETTE.ink} weight={400} tracking="-0.03em">
                  {segment.catalogTitleA}{' '}
                </SansH>
                <SerifH size={TYPE_SCALE.title - 16} color={PALETTE.bronze}>
                  {segment.catalogTitleB}
                </SerifH>
              </div>
            </div>
            <Body size={TYPE_SCALE.body - 4} color="rgba(14,14,14,0.7)" weight={400} style={{ textAlign: 'right', lineHeight: 1.5 }}>
              {segment.catalogIntro}
            </Body>
          </div>

          {/* Table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <CatalogTableHeader />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {devices.map(d => (
                <CatalogRow key={d.id} d={d} dense={dense} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 4,
          }}>
            <Body size={TYPE_SCALE.small - 2} color="rgba(14,14,14,0.55)" weight={400}>
              {segment.catalogFootnote}
            </Body>
            <div style={{
              padding: '7px 13px',
              background: 'rgba(199,166,104,0.12)',
              border: `1px solid ${PALETTE.goldSoft}`,
              borderRadius: 2,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.14em',
              color: PALETTE.bronze,
            }}>
              INSTALACIÓN · RECARGAS · MANTENIMIENTO INCLUIDOS
            </div>
          </div>
        </div>
      </SlideFrame>
    );
  }

  // ─── LAYOUT C: SPLIT (compactos + alto volumen) ───
  if (layout === 'split') {
    const COMPACT_IDS = ['fitz', 'moai', 'aspen', 'montblanc'];
    const VOLUME_IDS  = ['montblancXl', 'liberty', 'ural', 'empire', 'everest'];
    const compactDevices = devices.filter(d => COMPACT_IDS.includes(d.id));
    const volumeDevices  = devices.filter(d => VOLUME_IDS.includes(d.id));

    const renderColumn = (title, sub, list) => (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Eyebrow color={PALETTE.goldSoft} size={14}>{title}</Eyebrow>
          <SerifH size={32} color={PALETTE.ink} italic={true} weight={400} lineHeight={1}>
            {sub}
          </SerifH>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {list.map(d => <CatalogRow key={d.id} d={d} dense />)}
        </div>
      </div>
    );

    return (
      <SlideFrame bg={PALETTE.bone}>
        <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="CATÁLOGO DE EQUIPOS" propId={propId} propDate={propDate} />
        <div style={{
          position: 'absolute',
          top: SPACING.paddingTop + 8,
          left: SPACING.paddingX,
          right: SPACING.paddingX,
          bottom: SPACING.paddingBottom + 32,
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 72, alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.catalogEyebrow}</Eyebrow>
              <div style={{ lineHeight: 1.02 }}>
                <SansH size={TYPE_SCALE.title - 16} color={PALETTE.ink} weight={400} tracking="-0.03em">
                  {segment.catalogTitleA}{' '}
                </SansH>
                <SerifH size={TYPE_SCALE.title - 16} color={PALETTE.bronze}>
                  {segment.catalogTitleB}
                </SerifH>
              </div>
            </div>
            <Body size={TYPE_SCALE.body - 4} color="rgba(14,14,14,0.7)" weight={400} style={{ textAlign: 'right', lineHeight: 1.5 }}>
              {segment.catalogIntro}
            </Body>
          </div>

          <HairRule color={PALETTE.ruleInk} />

          {/* Two columns */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>
            {renderColumn('SERIE COMPACTA', 'Boutique a retail.', compactDevices)}
            <div style={{ width: 1, background: PALETTE.ruleInk, alignSelf: 'stretch' }} />
            {renderColumn('SERIE ALTO VOLUMEN', 'Cadena a infraestructura.', volumeDevices)}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Body size={TYPE_SCALE.small - 2} color="rgba(14,14,14,0.55)" weight={400}>
              {segment.catalogFootnote}
            </Body>
            <div style={{
              padding: '7px 13px',
              background: 'rgba(199,166,104,0.12)',
              border: `1px solid ${PALETTE.goldSoft}`,
              borderRadius: 2,
              fontFamily: "'Inter Tight', sans-serif",
              fontSize: 14, fontWeight: 600,
              letterSpacing: '0.14em',
              color: PALETTE.bronze,
            }}>
              INSTALACIÓN · RECARGAS · MANTENIMIENTO INCLUIDOS
            </div>
          </div>
        </div>
      </SlideFrame>
    );
  }

  // ─── LAYOUT GRID (legacy fallback) ───
  let cols, rows, mode;
  if (n <= 4)      { cols = n === 4 ? 2 : n; rows = n === 4 ? 2 : 1; mode = 'roomy'; }
  else if (n <= 6) { cols = 3; rows = Math.ceil(n / 3); mode = 'roomy'; }
  else if (n <= 9) { cols = 3; rows = 3; mode = 'compact'; }
  else             { cols = 4; rows = Math.ceil(n / 4); mode = 'compact'; }

  const compact = mode === 'compact';
  const photoH = compact ? 138 : 200;
  const cardPad = compact ? '14px 16px 16px' : '20px 22px 22px';
  const cardGap = compact ? 18 : 28;

  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="CATÁLOGO DE EQUIPOS" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 8,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 32,
        display: 'flex', flexDirection: 'column', gap: compact ? 22 : 32,
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 72, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.catalogEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.02 }}>
              <SansH size={TYPE_SCALE.title - 16} color={PALETTE.ink} weight={400} tracking="-0.03em">
                {segment.catalogTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 16} color={PALETTE.bronze}>
                {segment.catalogTitleB}
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 4} color="rgba(14,14,14,0.7)" weight={400} style={{ textAlign: 'right', lineHeight: 1.5 }}>
            {segment.catalogIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.ruleInk} />

        {/* Device grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: cardGap,
        }}>
          {devices.map((d, i) => (
            <div key={d.id} style={{
              display: 'flex', flexDirection: 'column',
              background: '#FFFFFF',
              border: `1px solid ${PALETTE.ruleInk}`,
              borderRadius: 2,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Device photo — bone bg, fit contain */}
              <div style={{
                height: photoH,
                background: `linear-gradient(180deg, #f4ede0 0%, #ede4d2 100%)`,
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderBottom: `1px solid ${PALETTE.ruleInk}`,
              }}>
                <img src={d.photo} alt={d.name} style={{
                  maxWidth: '78%',
                  maxHeight: '90%',
                  objectFit: 'contain',
                  mixBlendMode: 'multiply',
                }} />
                {/* Tag pill top-left */}
                <div style={{
                  position: 'absolute',
                  top: 10, left: 10,
                  fontFamily: "'Inter Tight', sans-serif",
                  fontSize: compact ? 9 : 10,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  color: PALETTE.bronze,
                  background: 'rgba(244,237,224,0.85)',
                  padding: compact ? '3px 8px' : '4px 10px',
                  border: `1px solid ${PALETTE.goldSoft}`,
                  borderRadius: 1,
                }}>
                  {d.tag}
                </div>
                {/* Coverage badge top-right */}
                <div style={{
                  position: 'absolute',
                  top: 10, right: 10,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontSize: compact ? 13 : 15,
                  color: PALETTE.ink,
                  background: 'rgba(255,255,255,0.92)',
                  padding: compact ? '2px 8px' : '3px 10px',
                  borderRadius: 1,
                }}>
                  {d.m2} m² · {d.m3.toLocaleString()} m³
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: cardPad, display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <SerifH size={compact ? TYPE_SCALE.subtitle - 4 : TYPE_SCALE.subtitle} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>
                    {d.name}
                  </SerifH>
                  <Body size={compact ? 9 : 10} color={PALETTE.bronze} weight={600} style={{ letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                    {d.tier}
                  </Body>
                </div>
                <Body size={compact ? 11 : TYPE_SCALE.small - 2} color="rgba(14,14,14,0.65)" weight={400} style={{ lineHeight: 1.35 }}>
                  {d.suited}
                </Body>

                <div style={{ flex: 1 }} />

                <HairRule color={PALETTE.ruleInk} />

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <SerifH size={compact ? TYPE_SCALE.subtitle - 2 : TYPE_SCALE.subtitle + 2} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>
                    {d.priceMxn}
                  </SerifH>
                  <Body size={compact ? 10 : 11} color="rgba(14,14,14,0.55)" weight={400}>
                    / mes · MXN
                  </Body>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 4,
        }}>
          <Body size={TYPE_SCALE.small - 2} color="rgba(14,14,14,0.55)" weight={400}>
            {segment.catalogFootnote}
          </Body>
          <div style={{
            padding: '7px 13px',
            background: 'rgba(199,166,104,0.12)',
            border: `1px solid ${PALETTE.goldSoft}`,
            borderRadius: 2,
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 14, fontWeight: 600,
            letterSpacing: '0.14em',
            color: PALETTE.bronze,
          }}>
            INSTALACIÓN · RECARGAS · MANTENIMIENTO INCLUIDOS
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · CURADORA (Manuela P. Fleischhacker · slide humano)
// ============================================================
function SlideCuradora({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const photo = segment.photos?.curadora || "photos/89-2.jpg";
  const C = (typeof CURADORA !== 'undefined') ? CURADORA : window.CURADORA;
  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="CURADURÍA" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr',
        gap: 72,
        alignItems: 'stretch',
      }}>
        {/* LEFT — Portrait */}
        <div style={{
          backgroundImage: `url(${photo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 2,
          position: 'relative',
        }}>
          {/* Bottom name plaque */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            padding: '32px 36px',
            background: `linear-gradient(to bottom, rgba(14,14,14,0) 0%, rgba(14,14,14,0.85) 60%, rgba(14,14,14,0.92) 100%)`,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <Eyebrow color={PALETTE.gold} size={14}>{C.eyebrow}</Eyebrow>
            <Body size={TYPE_SCALE.small - 2} color="rgba(243,237,227,0.7)" weight={400} style={{ fontStyle: 'italic' }}>
              {C.preTitle}
            </Body>
          </div>
        </div>

        {/* RIGHT — Bio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 8 }}>
          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 0.98 }}>
            <SansH size={TYPE_SCALE.title - 4} color={PALETTE.ink} weight={400} tracking="-0.03em">
              {C.nameA}
            </SansH>
            <SerifH size={TYPE_SCALE.title - 4} color={PALETTE.bronze} lineHeight={0.98}>
              {C.nameB}
            </SerifH>
          </div>

          <HairRule color={PALETTE.ruleInk} length={120} />

          {/* Lead */}
          <div style={{ lineHeight: 1.15 }}>
            <Body size={TYPE_SCALE.bodyLg - 4} color={PALETTE.ink} weight={500} style={{ display: 'block', marginBottom: 4 }}>
              {C.lead}
            </Body>
            <Body size={TYPE_SCALE.bodyLg - 4} color={PALETTE.bronze} weight={400} style={{ fontStyle: 'italic', display: 'block' }}>
              {C.leadHighlight}
            </Body>
          </div>

          {/* Body */}
          <Body size={TYPE_SCALE.small - 1} color="rgba(14,14,14,0.72)" weight={400} style={{ lineHeight: 1.5, maxWidth: 720 }}>
            {C.body}
          </Body>

          {/* Cities — mini grid */}
          <div>
            <Eyebrow color={PALETTE.goldSoft} size={14} style={{ marginBottom: 14 }}>TRAYECTORIA INTERNACIONAL</Eyebrow>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '14px 24px',
            }}>
              {C.cities.map((city, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Body size={TYPE_SCALE.small - 4} color={PALETTE.ink} weight={500} style={{ lineHeight: 1.1 }}>
                    {city.c}
                  </Body>
                  <Body size={14} color="rgba(14,14,14,0.5)" weight={400} style={{ letterSpacing: '0.04em' }}>
                    {city.co}
                  </Body>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Pullquote */}
          <div style={{
            padding: '20px 24px',
            background: 'rgba(122, 98, 66, 0.06)',
            borderLeft: `2px solid ${PALETTE.bronze}`,
          }}>
            <SerifH size={TYPE_SCALE.body - 2} color={PALETTE.ink} italic={true} weight={400} lineHeight={1.35}>
              "{C.pullquote}"
            </SerifH>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · QUOTE (cotización · 4 niveles de descuento)
// Placeholder izq para Copilot + tabla de inversión derecha.
// ============================================================
function SlideQuote({ segment, clientName, idx, totalSlides, propId, propDate, fields }) {
  // Parse base price (mensual sin descuento). Si no llega del segmento,
  // intentamos extraer del primer difusor del catálogo.
  const DIFFUSERS = (typeof window !== 'undefined' && window.DIFFUSERS) || {};
  const ids = segment.catalogDeviceIds || [];
  const sampleDevice = ids.length === 1 ? DIFFUSERS[ids[0]] : null;

  // Default base de Long Tail: si tiene 1 difusor en catálogo, usa su precio,
  // si no, deja $0 para que Copilot sustituya.
  const parsePrice = (str) => {
    if (!str) return 0;
    const m = String(str).match(/[\d,]+/);
    return m ? parseInt(m[0].replace(/,/g, ''), 10) : 0;
  };

  const monthly = parsePrice(segment.quoteMonthlyMxn) || (sampleDevice ? parsePrice(sampleDevice.priceMxn) : 0);
  const fmt = (n) => n > 0 ? `$${n.toLocaleString('es-MX')}` : '$  —';

  const tiers = [
    { label: 'Mensual',     sub: 'Sin compromiso',         discount: 0,    months: 1  },
    { label: 'Semestral',   sub: 'Pago anticipado · 6 m',  discount: 0.20, months: 6  },
    { label: 'Anual',       sub: 'Pago anticipado · 12 m', discount: 0.30, months: 12 },
  ];

  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="COTIZACIÓN" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        bottom: SPACING.paddingBottom + 24,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr',
        gap: 80,
      }}>
        {/* LEFT — placeholder de asignación (Copilot rellenará) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>ALCANCE E INVERSIÓN</Eyebrow>
            <div style={{ lineHeight: 1.0 }}>
              <SansH size={TYPE_SCALE.title - 4} color={PALETTE.ink} weight={400} tracking="-0.03em">
                Tu cotización,{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 4} color={PALETTE.bronze}>
                a la medida de tu espacio.
              </SerifH>
            </div>
          </div>

          {/* Placeholder card — instrucciones para Copilot */}
          <div style={{
            background: 'rgba(199,166,104,0.06)',
            border: `1px dashed ${PALETTE.goldSoft}`,
            borderRadius: 4,
            padding: '24px 26px',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <Eyebrow color={PALETTE.bronze} size={14} style={{ letterSpacing: '0.22em' }}>
              EQUIPO ASIGNADO · A COMPLETAR EN VISITA TÉCNICA
            </Eyebrow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, rowGap: 18 }}>
              {[
                { k: "DIFUSOR",        v: "{{ MODELO_DIFUSOR }}" },
                { k: "AROMA",          v: "{{ AROMA_RECOMENDADO }}" },
                { k: "ÁREA A CUBRIR",  v: "{{ M² · M³ }}" },
                { k: "COBERTURA",      v: "{{ REGULAR · MEDIUM · FULL }}" },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Eyebrow color="rgba(14,14,14,0.45)" size={16} style={{ letterSpacing: '0.20em' }}>
                    {f.k}
                  </Eyebrow>
                  <span style={{
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    fontSize: 16,
                    fontWeight: 500,
                    color: PALETTE.bronze,
                    letterSpacing: '0.02em',
                  }}>
                    {f.v}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: PALETTE.ruleInk, opacity: 0.5 }} />

            <Body size={15} color="rgba(14,14,14,0.6)" weight={400} style={{ lineHeight: 1.5 }}>
              La asignación final del modelo y aroma se confirma en la visita técnica sin costo. La presente cotización aplica al precio de renta mensual del equipo asignado.
            </Body>
          </div>

          {/* Inclusiones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Eyebrow color={PALETTE.goldSoft} size={14} style={{ letterSpacing: '0.22em' }}>
              INCLUIDO EN LA RENTA
            </Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                "Instalación profesional",
                "Recargas mensuales",
                "Mantenimiento preventivo",
                "Soporte técnico",
                "Cambio de aroma s/c",
                "Atención personalizada",
              ].map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: PALETTE.bronze, fontSize: 11 }}>—</span>
                  <Body size={16} color={PALETTE.ink} weight={400}>
                    {x}
                  </Body>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — tabla de 4 niveles de descuento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Header alineado con "Tu cotización" — dos líneas para igualar altura */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>ESQUEMAS DE PAGO</Eyebrow>
            <div style={{ lineHeight: 1.0 }}>
              <SansH size={TYPE_SCALE.title - 4} color={PALETTE.ink} weight={400} tracking="-0.03em">
                Descuento{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 4} color={PALETTE.bronze}>
                por pronto pago.
              </SerifH>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', marginTop: -8 }}>
            <Eyebrow color="rgba(14,14,14,0.45)" size={16}>
              MXN · IVA NO INCLUIDO
            </Eyebrow>
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column',
            background: '#FFFFFF',
            border: `1px solid ${PALETTE.ruleInk}`,
            borderRadius: 2,
          }}>
            {tiers.map((t, i) => {
              const monthlyEffective = monthly > 0 ? Math.round(monthly * (1 - t.discount)) : 0;
              const totalUpfront = monthly > 0 ? monthlyEffective * t.months : 0;
              const isRecommended = i === tiers.length - 1;

              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 0.6fr 1fr 1fr',
                  alignItems: 'center',
                  gap: 18,
                  padding: '20px 22px',
                  borderBottom: i < tiers.length - 1 ? `1px solid ${PALETTE.ruleInk}` : 'none',
                  background: isRecommended ? 'rgba(199,166,104,0.07)' : 'transparent',
                  position: 'relative',
                }}>
                  {/* Etiqueta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <SerifH size={22} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>
                        {t.label}
                      </SerifH>
                      {isRecommended && (
                        <span style={{
                          fontFamily: "'Inter Tight', sans-serif",
                          fontSize: 14, fontWeight: 600,
                          letterSpacing: '0.18em',
                          color: PALETTE.bronze,
                          background: 'rgba(199,166,104,0.18)',
                          padding: '2px 7px',
                          border: `1px solid ${PALETTE.goldSoft}`,
                          borderRadius: 1,
                        }}>
                          RECOMENDADO
                        </span>
                      )}
                    </div>
                    <Body size={14} color="rgba(14,14,14,0.55)" weight={400}>
                      {t.sub}
                    </Body>
                  </div>

                  {/* Descuento */}
                  <div style={{ textAlign: 'left' }}>
                    {t.discount > 0 ? (
                      <SerifH size={20} color={PALETTE.bronze} italic={true} weight={500} lineHeight={1}>
                        −{Math.round(t.discount * 100)}%
                      </SerifH>
                    ) : (
                      <span style={{ color: 'rgba(14,14,14,0.3)', fontSize: 14, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>—</span>
                    )}
                  </div>

                  {/* Mensual efectivo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <SerifH size={26} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>
                      {fmt(monthlyEffective)}
                    </SerifH>
                    <Body size={16} color="rgba(14,14,14,0.5)" weight={400}>
                      / mes equivalente
                    </Body>
                  </div>

                  {/* Total a pagar */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <SerifH size={26} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>
                      {fmt(totalUpfront)}
                    </SerifH>
                    <Body size={16} color="rgba(14,14,14,0.5)" weight={400}>
                      {t.months === 1 ? 'pago mensual' : `pago único · ${t.months} meses`}
                    </Body>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer condiciones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <Body size={14} color="rgba(14,14,14,0.55)" weight={400} style={{ lineHeight: 1.55 }}>
              Todos los esquemas operan bajo contrato de servicio a 12 meses con cambio de aroma sin costo en cualquier momento. Vigencia de la cotización: 30 días naturales a partir de la fecha de emisión. Los precios pueden variar según el modelo de difusor finalmente asignado en la visita técnica. Insumos (frasco de aroma) incluidos en la renta. IVA no incluido en los precios mostrados.
            </Body>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
              <Eyebrow color={PALETTE.bronze} size={14} style={{ letterSpacing: '0.22em' }}>
                FIRMA EN VISITA TÉCNICA · INSTALACIÓN EN 7 DÍAS HÁBILES
              </Eyebrow>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SlideScentAnalysis — lectura sensorial del Scent Advisor IA
// ============================================================
function SlideScentAnalysis({ segment, clientName, idx, totalSlides, propId, propDate, scentData }) {
  // Placeholder elegante si no hay analisis cargado
  if (!scentData || !scentData.output) {
    return (
      <SlideFrame>
        <SlideChrome
          index={idx} total={totalSlides} segment={segment}
          clientName={clientName} propId={propId} propDate={propDate}
          eyebrow="Scent Advisor · Lectura sensorial"
        />
        <div style={{
          position: 'absolute', inset: 0,
          padding: `${SPACING.paddingTop + 80}px ${SPACING.paddingX}px ${SPACING.paddingBottom}px`,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start'
        }}>
          <Eyebrow color={PALETTE.gold}>Aún sin análisis cargado</Eyebrow>
          <div style={{ height: 24 }} />
          <SerifH size={TYPE_SCALE.title} italic>Sube una foto del espacio</SerifH>
          <div style={{ height: 18 }} />
          <Body color={PALETTE.boneSoft} style={{ maxWidth: 980 }}>
            Cuando el cliente comparta una imagen de su local, esta lámina se llenará con la lectura visual y la recomendación olfativa generadas por Scent Advisor.
          </Body>
        </div>
      </SlideFrame>
    );
  }

  const o = scentData.output;
  const av = o.analisis_visual || {};
  const est = o.estrategia_olfativa || {};
  const dif = o.difusion || {};
  const vc = o.variables_canonicas || {};
  const meta = o._meta || {};
  const overrides = meta.manual_overrides || {};
  const aromaFull = meta.aroma_principal_full || {};
  const difFull = meta.difusor_full || {};
  // Datos extendidos del aroma (vienen del catalogo, override o auto)
  const aromaFamiliaName = aromaFull.familia || est.familia_olfativa || '';
  const aromaDesc        = est.descripcion_principal || aromaFull.descripcion || '';
  const aromaSubacorde   = est.subacorde_olfativo || vc.subacorde_olfativo
    || ((aromaFull.acordes || []).filter(Boolean).join(' + ')) || '';
  const aromaNotas       = est.notas_principal || aromaFull.notas || {};
  const manualBadge = (
    <span style={{
      display: 'inline-block', marginLeft: 12, padding: '4px 12px',
      fontFamily: 'Inter, sans-serif', fontSize: 11, letterSpacing: '0.18em',
      textTransform: 'uppercase', fontWeight: 600,
      background: 'rgba(199, 166, 104, 0.18)',
      color: PALETTE.gold,
      border: `1px solid ${PALETTE.goldSoft}`,
      borderRadius: 999,
      verticalAlign: 'middle'
    }}>Selección manual</span>
  );
  const fvName = (window.OLF_KNOW?.familiasVisuales?.find(f => f.id === av.familia_visual) || {}).nombre
    || vc.familia_visual || av.familia_visual || '—';
  const aroma = est.aroma_principal || '—';
  const difusor = dif.difusor_recomendado || '—';
  const cant = dif.cantidad || 1;
  const cobertura = meta.difusor_full
    ? `${meta.difusor_full.cobertura_min_m2}–${meta.difusor_full.cobertura_max_m2} m²`
    : '';

  const rows = [
    ['Tipo de luz',       vc.tipo_de_luz || av.tipo_de_luz],
    ['Materialidad',      vc.materialidad || av.materialidad],
    ['Formas',            vc.formas || av.formas],
    ['Densidad',          vc.densidad || av.densidad],
    ['Familia visual',    fvName],
    ['Familia olfativa',  vc.familia_olfativa || est.familia_olfativa],
    ['Subacorde',         vc.subacorde_olfativo || est.subacorde_olfativo],
    ['Aroma',             aroma]
  ];

  return (
    <SlideFrame>
      <SlideChrome
        index={idx} total={totalSlides} segment={segment}
        clientName={clientName} propId={propId} propDate={propDate}
        eyebrow={`Scent Advisor · Lectura sensorial de ${clientName || 'el espacio'}`}
      />
      <div style={{
        position: 'absolute', inset: 0,
        padding: `${SPACING.paddingTop + 56}px ${SPACING.paddingX}px ${SPACING.paddingBottom}px`,
        display: 'grid', gridTemplateColumns: '1.25fr 1fr', columnGap: 72, alignItems: 'start'
      }}>
        {/* Columna izquierda: foto + carácter visual */}
        <div>
          <div style={{
            position: 'relative',
            borderRadius: 6,
            overflow: 'hidden',
            border: `1px solid ${PALETTE.rule}`,
            background: PALETTE.inkSoft,
            aspectRatio: '4 / 3',
            boxShadow: '0 28px 80px rgba(0,0,0,0.55)'
          }}>
            {scentData.previewURL ? (
              <img
                src={scentData.previewURL}
                alt="Espacio analizado"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: PALETTE.boneSoft, fontFamily: 'Cormorant Garamond, serif',
                fontStyle: 'italic', fontSize: 32, opacity: 0.55
              }}>
                Análisis demo · sin imagen de origen
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 22, right: 22, opacity: 0.85 }}>
              <OlfativaMark color={PALETTE.bone} height={28} />
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Eyebrow color={PALETTE.gold}>Carácter visual</Eyebrow>
            <SerifH size={TYPE_SCALE.display} italic color={PALETTE.bone}>{fvName}</SerifH>
            {av.emocion_deseada && (
              <Body color={PALETTE.boneSoft} size={TYPE_SCALE.body} style={{ marginTop: 4 }}>
                {av.emocion_deseada}
              </Body>
            )}
          </div>
        </div>

        {/* Columna derecha: 8 variables + recomendación */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div>
            <Eyebrow color={PALETTE.gold}>Lectura del espacio</Eyebrow>
            <HairRule color={PALETTE.rule} style={{ marginTop: 14, marginBottom: 20 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 36, rowGap: 22 }}>
              {rows.map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: PALETTE.goldSoft,
                    fontWeight: 500
                  }}>{k}</div>
                  <div style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: 26, fontStyle: 'italic',
                    color: PALETTE.bone, lineHeight: 1.2
                  }}>{v || '—'}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow color={PALETTE.gold}>Recomendación olfativa</Eyebrow>
            <HairRule color={PALETTE.rule} style={{ marginTop: 14, marginBottom: 20 }} />

            {/* Nombre + familia + subacorde + badge manual */}
            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
              <SerifH size={TYPE_SCALE.display} italic color={PALETTE.bone}>{aroma}</SerifH>
              {overrides.aroma && manualBadge}
            </div>
            {aromaFamiliaName && (
              <div style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontStyle: 'italic', fontSize: 28,
                color: PALETTE.boneSoft, marginTop: 4
              }}>{aromaFamiliaName}</div>
            )}
            {aromaSubacorde && (
              <div style={{
                marginTop: 10,
                fontFamily: 'Inter, sans-serif', fontSize: 13,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: PALETTE.gold, fontWeight: 600
              }}>{aromaSubacorde}</div>
            )}

            {/* Descripcion del aroma del catalogo */}
            {aromaDesc && (
              <Body color={PALETTE.boneSoft} style={{ marginTop: 18, fontSize: 22, lineHeight: 1.45, fontStyle: 'italic', opacity: 0.92 }}>
                {aromaDesc}
              </Body>
            )}

            {/* Notas: 3 mini-bloques Salida / Corazon / Fondo */}
            {(aromaNotas && (aromaNotas.salida || aromaNotas.corazon || aromaNotas.fondo)) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 22 }}>
                {[
                  ['Salida',  aromaNotas.salida],
                  ['Corazón', aromaNotas.corazon],
                  ['Fondo',   aromaNotas.fondo]
                ].filter(([, v]) => v).map(([k, v], i) => (
                  <div key={i}>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 11, letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: PALETTE.goldSoft, fontWeight: 600,
                      marginBottom: 6
                    }}>{k}</div>
                    <div style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: 15, color: PALETTE.boneSoft,
                      lineHeight: 1.4
                    }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Difusor info */}
            <Body color={PALETTE.boneSoft} style={{ marginTop: 22 }}>
              Difundido con <span style={{ color: PALETTE.gold }}>{difusor}</span>{overrides.difusor && manualBadge} · {cant} unidad{cant > 1 ? 'es' : ''}{cobertura ? ` · cobertura ${cobertura}` : ''}{dif.intensidad ? ` · intensidad ${dif.intensidad}` : ''}.
            </Body>

            {o.resumen_comercial && (
              <Body color={PALETTE.boneSoft} size={TYPE_SCALE.small} style={{ marginTop: 16, fontStyle: 'italic', opacity: 0.88 }}>
                {o.resumen_comercial}
              </Body>
            )}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// expose to global
Object.assign(window, { SlideCover, SlidePromise, SlidePillars, SlideMethod, SlideAroma, SlideCatalog, SlideCuradora, SlideCompliance, SlideTrust, SlideClose, SlideQuote, SlideScentAdvisor, SlideCotizador, SlideScentAnalysis });


// ============================================================
// SLIDE · SCENT ADVISOR (Long Tail · IA: foto → aroma recomendado)
// ============================================================
function SlideScentAdvisor({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const steps = segment.scentAdvisorSteps || [];
  const photo = segment.photos?.scentAdvisor;
  return (
    <SlideFrame bg={PALETTE.ink}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} eyebrow="SCENT ADVISOR · IA" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 16,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 40,
        display: 'flex', flexDirection: 'column', gap: 32,
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 72, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.gold} size={TYPE_SCALE.micro}>{segment.scentAdvisorEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.02 }}>
              <SansH size={TYPE_SCALE.title - 14} color={PALETTE.bone} weight={400} tracking="-0.03em">
                {segment.scentAdvisorTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 14} color={PALETTE.gold}>
                {segment.scentAdvisorTitleB}
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 4} color={PALETTE.boneSoft} weight={400} style={{ textAlign: 'right', lineHeight: 1.55 }}>
            {segment.scentAdvisorIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.rule} />

        {/* Body: 3 steps left | output card right */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 56 }}>
          {/* 3 steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, justifyContent: 'center' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 22, alignItems: 'start' }}>
                <div style={{
                  width: 56, height: 56,
                  border: `1px solid ${PALETTE.goldSoft}`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(199,166,104,0.08)',
                }}>
                  <SerifH size={22} color={PALETTE.gold} italic={true} weight={500} lineHeight={1}>
                    {s.n}
                  </SerifH>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                  <SerifH size={TYPE_SCALE.subtitle - 4} color={PALETTE.bone} italic={false} weight={500} lineHeight={1.1}>
                    {s.t}
                  </SerifH>
                  <Body size={TYPE_SCALE.small - 1} color={PALETTE.boneSoft} weight={400} style={{ lineHeight: 1.5, maxWidth: 540 }}>
                    {s.d}
                  </Body>
                </div>
              </div>
            ))}
          </div>

          {/* Output card — mock recommendation */}
          <div style={{
            background: PALETTE.inkSoft,
            border: `1px solid ${PALETTE.goldSoft}`,
            borderRadius: 2,
            padding: '32px 36px',
            display: 'flex', flexDirection: 'column', gap: 20,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -10, left: 28,
              background: PALETTE.gold, color: PALETTE.ink,
              fontFamily: "'Inter Tight', sans-serif", fontSize: 11, fontWeight: 700,
              letterSpacing: '0.22em', padding: '4px 10px', borderRadius: 1,
            }}>
              TU RESULTADO
            </div>

            {/* Faux photo placeholder + tag */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 72, height: 72,
                backgroundImage: photo ? `url(${photo})` : 'linear-gradient(135deg, #2a2622, #1a1816)',
                backgroundSize: 'cover', backgroundPosition: 'center',
                border: `1px solid ${PALETTE.rule}`, borderRadius: 1,
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Eyebrow color="rgba(243,237,227,0.45)" size={13}>ESPACIO ANALIZADO</Eyebrow>
                <Body size={TYPE_SCALE.small - 2} color={PALETTE.bone} weight={500}>tu-local · interior</Body>
                <Body size={TYPE_SCALE.small - 4} color="rgba(243,237,227,0.5)" weight={400}>Procesado por Olfativa AI</Body>
              </div>
            </div>

            <HairRule color={PALETTE.rule} />

            {/* Recommendation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow color={PALETTE.gold} size={13}>AROMA RECOMENDADO</Eyebrow>
              <SerifH size={TYPE_SCALE.subtitle + 4} color={PALETTE.bone} italic={false} weight={500} lineHeight={1.05}>
                {segment.scentAdvisorOutputName}
              </SerifH>
              <Body size={TYPE_SCALE.small - 2} color={PALETTE.gold} weight={600} style={{ letterSpacing: '0.18em' }}>
                {segment.scentAdvisorOutputFamily}
              </Body>
            </div>

            <Body size={TYPE_SCALE.small - 2} color={PALETTE.boneSoft} weight={400} style={{ lineHeight: 1.55, fontStyle: 'italic' }}>
              {segment.scentAdvisorOutputReason}
            </Body>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Eyebrow color="rgba(243,237,227,0.5)" size={13}>NOTAS CLAVE</Eyebrow>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(segment.scentAdvisorOutputNotes || []).map((note, i) => (
                  <span key={i} style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: PALETTE.bone,
                    padding: '4px 12px',
                    border: `1px solid ${PALETTE.rule}`,
                    borderRadius: 999,
                    background: 'rgba(243,237,227,0.04)',
                  }}>
                    {note}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}

// ============================================================
// SLIDE · COTIZADOR (Long Tail · 1–2 difusores con precio dinámico)
// Static representation: cards de difusores + tabla de paquetes con precio mensual
// ============================================================
function SlideCotizador({ segment, clientName, idx, totalSlides, propId, propDate }) {
  const DIFFUSERS = (typeof window !== 'undefined' && window.DIFFUSERS) || {};
  const ids = segment.cotizadorDeviceIds || [];
  const devices = ids.map(id => DIFFUSERS[id]).filter(Boolean);
  const bundles = segment.cotizadorBundles || [];

  const fmt = (n) => '$' + Math.round(n).toLocaleString('es-MX');
  const parseMxn = (s) => parseFloat(String(s || '').replace(/[^0-9.]/g, '')) || 0;

  return (
    <SlideFrame bg={PALETTE.bone}>
      <SlideChrome index={idx + 1} total={totalSlides} segment={segment} clientName={clientName} dark={false} eyebrow="COTIZADOR" propId={propId} propDate={propDate} />

      <div style={{
        position: 'absolute',
        top: SPACING.paddingTop + 8,
        left: SPACING.paddingX,
        right: SPACING.paddingX,
        bottom: SPACING.paddingBottom + 32,
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 72, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Eyebrow color={PALETTE.goldSoft} size={TYPE_SCALE.micro}>{segment.cotizadorEyebrow}</Eyebrow>
            <div style={{ lineHeight: 1.02 }}>
              <SansH size={TYPE_SCALE.title - 16} color={PALETTE.ink} weight={400} tracking="-0.03em">
                {segment.cotizadorTitleA}{' '}
              </SansH>
              <SerifH size={TYPE_SCALE.title - 16} color={PALETTE.bronze}>
                {segment.cotizadorTitleB}
              </SerifH>
            </div>
          </div>
          <Body size={TYPE_SCALE.body - 4} color="rgba(14,14,14,0.7)" weight={400} style={{ textAlign: 'right', lineHeight: 1.55 }}>
            {segment.cotizadorIntro}
          </Body>
        </div>

        <HairRule color={PALETTE.ruleInk} />

        {/* Body: device cards (left, 4 wide) + bundle table (right) */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
          {/* Device cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.bronze} size={14}>1. ELIGE TU DIFUSOR</Eyebrow>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              flex: 1,
            }}>
              {devices.map((d, i) => {
                const monthly = parseMxn(d.priceMxn);
                const isRec = i === 1; // segundo difusor recomendado
                return (
                  <div key={d.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '72px 1fr',
                    gap: 14,
                    padding: '14px 16px',
                    background: isRec ? 'rgba(199,166,104,0.08)' : '#FFFFFF',
                    border: `1px solid ${isRec ? PALETTE.goldSoft : PALETTE.ruleInk}`,
                    borderRadius: 2,
                    alignItems: 'center',
                    position: 'relative',
                  }}>
                    {isRec && (
                      <span style={{
                        position: 'absolute', top: -8, right: 10,
                        fontFamily: "'Inter Tight', sans-serif", fontSize: 9, fontWeight: 700,
                        letterSpacing: '0.18em', color: PALETTE.ink,
                        background: PALETTE.gold, padding: '2px 7px', borderRadius: 1,
                      }}>
                        RECOMENDADO
                      </span>
                    )}
                    <div style={{
                      width: 72, height: 72,
                      background: 'linear-gradient(180deg, #f4ede0 0%, #ede4d2 100%)',
                      border: `1px solid ${PALETTE.ruleInk}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 1,
                    }}>
                      <img src={d.photo} alt={d.name} style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain', mixBlendMode: 'multiply' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <SerifH size={20} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>{d.name}</SerifH>
                      <Body size={13} color="rgba(14,14,14,0.6)" weight={400} style={{ lineHeight: 1.3 }}>
                        {d.m2} m² · {d.suited?.split('.')[0]}
                      </Body>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                        <SerifH size={18} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>{fmt(monthly)}</SerifH>
                        <Body size={12} color="rgba(14,14,14,0.5)" weight={400}>/mes</Body>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bundle table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Eyebrow color={PALETTE.bronze} size={14}>2. ¿UNO O DOS DIFUSORES?</Eyebrow>
            <div style={{
              flex: 1,
              background: '#FFFFFF',
              border: `1px solid ${PALETTE.ruleInk}`,
              borderRadius: 2,
              padding: '20px 22px',
              display: 'flex', flexDirection: 'column', gap: 18,
            }}>
              {bundles.map((b, i) => {
                // ejemplo con difusor moai (recomendado)
                const refDevice = devices[1] || devices[0];
                const baseMonthly = parseMxn(refDevice?.priceMxn || 0);
                const totalMonthly = Math.round(baseMonthly * b.multiplier * (1 - b.discount));
                const isHighlighted = i === bundles.length - 1;
                return (
                  <div key={b.id} style={{
                    padding: '16px 18px',
                    background: isHighlighted ? 'rgba(199,166,104,0.10)' : 'rgba(14,14,14,0.03)',
                    border: `1px solid ${isHighlighted ? PALETTE.goldSoft : PALETTE.ruleInk}`,
                    borderRadius: 2,
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <SerifH size={22} color={PALETTE.ink} italic={false} weight={500} lineHeight={1}>{b.label}</SerifH>
                      {b.discount > 0 && (
                        <span style={{
                          fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                          fontSize: 16, color: PALETTE.bronze,
                        }}>
                          −{Math.round(b.discount * 100)}%
                        </span>
                      )}
                    </div>
                    <Body size={12} color="rgba(14,14,14,0.55)" weight={400}>{b.sub}</Body>
                    <HairRule color="rgba(14,14,14,0.10)" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Body size={12} color="rgba(14,14,14,0.55)" weight={400}>Renta mensual · ejemplo {refDevice?.name}</Body>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <SerifH size={26} color={PALETTE.bronze} italic={false} weight={500} lineHeight={1}>{fmt(totalMonthly)}</SerifH>
                        <Body size={13} color="rgba(14,14,14,0.5)" weight={400}>/mes</Body>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ flex: 1 }} />
              <div style={{
                padding: '10px 12px',
                background: 'rgba(199,166,104,0.10)',
                border: `1px dashed ${PALETTE.goldSoft}`,
                borderRadius: 2,
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.14em',
                color: PALETTE.bronze,
                textAlign: 'center',
              }}>
                INSTALACIÓN · RECARGAS · MANTENIMIENTO INCLUIDOS
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Body size={12} color="rgba(14,14,14,0.55)" weight={400} style={{ lineHeight: 1.5 }}>
          {segment.cotizadorFootnote}
        </Body>
      </div>
    </SlideFrame>
  );
}

