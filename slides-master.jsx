/* global React */
const { useState, useEffect, useMemo, Fragment } = React;

// ============================================================
// DESIGN TOKENS
// ============================================================
const TYPE_SCALE = {
  hero: 148,
  title: 88,
  display: 64,
  subtitle: 46,
  bodyLg: 36,
  body: 30,
  small: 25,
  micro: 20,
};
const SPACING = {
  paddingTop: 96,
  paddingBottom: 84,
  paddingX: 112,
  titleGap: 48,
  itemGap: 28,
};

const PALETTE = {
  ink: "#0E0E0E",
  inkSoft: "#1A1815",
  bone: "#F3EDE3",
  boneSoft: "#E8DFD0",
  gold: "#C7A668",
  goldSoft: "#A88A4F",
  bronze: "#7A6242",
  rule: "rgba(243, 237, 227, 0.18)",
  ruleInk: "rgba(14, 14, 14, 0.14)",
};

// ============================================================
// SEGMENT PRESETS — 4 machotes con voz calibrada
// ============================================================
const SEGMENTS = {
  // ── 🟦 LONG TAIL ──────────────────────────────────────────
  longtail: {
    label: "LONG TAIL",
    name: "Espacio único · 1–2 difusores",
    descriptor: "Boutique · consultorio · sucursal aislada",
    propTitleParts: ["Aromatización profesional", "para tu espacio."],
    propSubtitle: "Un difusor profesional, listo en 7 días. Tú eliges, nosotros operamos. Si no convence, cambiamos el aroma.",
    eyebrow: "PROPUESTA DE SERVICIO",

    // Slide 2 — Promesa
    promiseEyebrow: "PROMESA",
    promiseLead: "Va a notarse",
    promiseHighlight: "desde el primer día.",
    promiseBody: "El aroma que asignamos a tu espacio ya fue probado en miles de locales como el tuyo. La intensidad, la cobertura y la difusión están calibradas para que tu cliente lo perciba al entrar — sin que tú tengas que ajustar nada.",
    promiseStats: [
      { n: "3,816", l: "ESPACIOS ACTIVOS" },
      { n: "7 DÍAS", l: "DE LA FIRMA A LA INSTALACIÓN" },
    ],

    // Slide 3 — Pilares (3 simples)
    pillarsTitleA: "Tres garantías,",
    pillarsTitleB: "sin letra chica.",
    pillarsEyebrow: "QUÉ INCLUYE",
    valuePillars: [
      { eyebrow: "Aroma", title: "Aroma de catálogo, calidad de marca líder.", body: "Te asignamos un aroma de nuestro catálogo curado. La misma calidad olfativa que utilizan las grandes marcas — sin diseño a medida, sin comités, sin demoras. Eliges entre familias probadas." },
      { eyebrow: "Servicio", title: "Instalación, recargas y mantenimiento.", body: "Nuestros técnicos hacen la instalación. Las recargas llegan a tiempo. Si algo falla, lo resolvemos. Tú no coordinas nada." },
      { eyebrow: "Garantía", title: "Si no convence, cambiamos el aroma.", body: "En el primer mes pruebas el aroma asignado. Si no comunica lo que tu marca necesita, lo cambiamos sin costo. La operación sigue, el aroma se ajusta." },
    ],

    // Slide 4 — Aroma (1 tier)
    aromaTitleA: "Un aroma curado",
    aromaTitleB: "para tu espacio.",
    aromaEyebrow: "RECOMENDACIÓN OLFATIVA",
    aromaIntro: "En la visita técnica te recomendamos un aroma de nuestra biblioteca curada — el que mejor funcione para tu giro, tu público y la arquitectura de tu espacio. Sin catálogos infinitos ni decisiones por comité. Una recomendación profesional, directa.",
    aromaTiers: [
      { name: "Tu aroma recomendado", tag: "Curado · listo para instalar", body: "Aromatización profesional con materias primas grado IFRA. La misma calidad de base que usamos en proyectos de marcas líderes — calibrada al perfil de tu espacio.", bullets: ["Cobertura hasta 100 m³", "Recargas mensuales o bimestrales", "Difusión silenciosa, automática", "Cambio de aroma sin costo si no convence"] },
    ],

    // Slide 5 — Cierre
    closeLead: "Va a notarse.",
    closeHighlight: "Tú no vas a hacer nada.",
    closeSub: "Instalamos, recargamos, mantenemos. Si no convence, cambiamos el aroma. Si quieres otro punto, lo sumamos.",

    // Investment scope
    fields: {
      scope: "Difusor recomendado tras visita técnica",
      unitsLabel: "Renta mensual · todo incluido",
      priceDesign: "Aroma curado · sin costo",
      priceUnits: "Modelos desde $1,620 hasta $4,200 / mes",
      priceOps: "Instalación, recargas y mantenimiento incluidos",
      priceTotal: "Cotización exacta tras visita técnica",
      terms: "Contrato anual · cambio de aroma sin costo el primer mes",
    },

    // Trust line
    trust: { quote: "Buscábamos algo profesional, no perfumar el espacio nosotros mismos. Olfativa instaló y se hace cargo. No nos volvimos a preocupar.", by: "Propietaria", co: "Boutique de moda · CDMX" },

    photos: {
      cover: "photos/127-2.jpg",       // Órgano de aromas — atelier vertical
      promise: "photos/74-2.jpg",      // Frasco hero del órgano
      pillars: "photos/202-2.jpg",     // Técnico recargando difusor (difusor visible)
      aroma: "photos/151-2.jpg",       // Disco fragancia
      catalog: "photos/207-2.jpg",     // Difusor torre vertical
      close: "photos/78-2.jpg",        // Curadora en el órgano (atmosférica, sin marca)
    },

    // Catálogo de equipos (Long Tail) ── 4 modelos accesibles para boutique/consultorio
    catalogEyebrow: "CATÁLOGO DE EQUIPOS",
    catalogTitleA: "Siete equipos,",
    catalogTitleB: "según tu espacio.",
    catalogIntro: "Te recomendamos uno en la visita. Estos son los siete que operamos. Renta mensual con instalación, recargas y mantenimiento incluidos.",
    catalogDeviceIds: ["fitz", "moai", "aspen", "montblanc", "montblancXl", "empire", "ural"],
    catalogFootnote: "Aroma comercial curado · IVA no incluido · Precios vigentes 2026",

    // Slide structure (which slides this segment shows)
    slides: ["cover", "promise", "pillars", "aroma", "catalog", "quote", "close"],
  },

  // ── 🟩 CORE ───────────────────────────────────────────────
  core: {
    label: "CORE",
    name: "Marca en consolidación · 3–10 difusores",
    descriptor: "Varios puntos o varias áreas · necesitan recomendación experta",
    propTitleParts: ["Nosotros decidimos.", "Ustedes confían."],
    propSubtitle: "Visita técnica, recomendación profesional, control de intensidad y ajustes incluidos. Si algo no funciona, lo ajustamos — sin discusión.",
    eyebrow: "PROPUESTA · RECOMENDACIÓN PROFESIONAL",

    promiseEyebrow: "PROMESA",
    promiseLead: "Un aroma elegante,",
    promiseHighlight: "que no va a molestar.",
    promiseBody: "Sabemos que la pregunta real no es qué aroma elegir — es la tranquilidad de que nadie se queje. Calibramos intensidad, regulamos cobertura y respondemos a cualquier ajuste. El aroma se siente, no se impone.",
    promiseStats: [
      { n: "3,816", l: "ESPACIOS OPERADOS" },
      { n: "100%", l: "AJUSTES SIN COSTO" },
    ],

    pillarsTitleA: "Tres compromisos",
    pillarsTitleB: "que eliminan tu riesgo.",
    pillarsEyebrow: "POR QUÉ OLFATIVA",
    valuePillars: [
      { eyebrow: "Recomendación", title: "Nosotros recomendamos. Ustedes deciden.", body: "Visitamos, medimos áreas y proponemos el aroma adecuado para su giro y arquetipo de cliente. No los hacemos elegir entre catálogos infinitos — un experto les dice cuál es el indicado." },
      { eyebrow: "Discreción", title: "El aroma no va a molestar.", body: "Calibramos intensidad y cobertura para que se perciba al entrar — sin saturar, sin provocar dolor de cabeza, sin invadir. Nuestros perfumistas eligen materias primas elegantes y no invasivas." },
      { eyebrow: "Respaldo", title: "Si algo no funciona, lo ajustamos.", body: "Cambio de aroma sin costo. Regulación de intensidad sobre la marcha. Visitas de ajuste incluidas. Olfativa se hace responsable — ustedes no operan nada." },
    ],

    methodTitleA: "Cuatro pasos",
    methodTitleB: "para entrar sin riesgo.",
    methodEyebrow: "CÓMO TRABAJAMOS",
    methodIntro: "Un proceso guiado por nosotros. Sin metros que medir, sin comités, sin decisiones técnicas a su cargo. Ustedes confían — nosotros respondemos.",
    phases: [
      { n: "01", t: "Visita técnica", d: "Vamos a sus puntos, medimos áreas, entendemos el giro y los flujos. Ustedes no necesitan saber metros cuadrados — para eso vamos." },
      { n: "02", t: "Cata comparativa", d: "Llevamos 2 o 3 aromas pre-seleccionados según el diagnóstico. Huelen, comparan y validan. Nosotros recomendamos el que mejor funcione." },
      { n: "03", t: "Instalación calibrada", d: "Instalamos con intensidad ajustada al espacio. La primera semana monitoreamos percepción y afinamos si es necesario." },
      { n: "04", t: "Ajustes incluidos", d: "Recargas mensuales, mantenimiento y cualquier ajuste de intensidad o aroma — incluidos en la operación. Sin costos extra, sin discusión." },
    ],

    aromaTitleA: "Dos niveles,",
    aromaTitleB: "ambos elegantes.",
    aromaEyebrow: "AROMAS RECOMENDADOS",
    aromaIntro: "No eligen entre 200 opciones. Llevamos 2 o 3 aromas pre-seleccionados para su giro y los validan en cata. Las dos líneas son discretas, no invasivas y aprobadas para uso comercial prolongado.",
    aromaTiers: [
      { name: "Comercial", tag: "Discreto · neutro · seguro", body: "Aromas curados que funcionan en cualquier giro comercial. Calibrados para presencia sutil — se perciben sin imponerse, no generan rechazo en ningún arquetipo de cliente.", bullets: ["Familia olfativa neutra", "Calibración baja-media", "Cero historial de quejas en operación"] },
      { name: "Premium", tag: "Distintivo · elegante", body: "Aromas con mayor carácter para marcas que quieren un perfil olfativo reconocible. Misma calibración cuidada — nunca invasivos, siempre memorables.", bullets: ["Notas distintivas", "Materias primas de mayor grado", "Sigue siendo discreto y elegante"] },
    ],

    closeLead: "Ustedes no van a tener",
    closeHighlight: "una sola queja.",
    closeSub: "Si la tienen, la resolvemos. Cambio de aroma incluido, ajuste de intensidad incluido, visitas extra incluidas. Olfativa se hace responsable.",

    fields: {
      scope: "3–10 difusores · aroma recomendado · ajustes incluidos",
      unitsLabel: "Renta mensual · todo incluido",
      priceDesign: "Visita técnica + cata comparativa · sin costo",
      priceUnits: "Desde $4,860 / mes (3 difusores) hasta $16,200 / mes (10)",
      priceOps: "Recargas, mantenimiento y ajustes · incluidos",
      priceTotal: "Cotización exacta tras visita técnica",
      terms: "Contrato anual · cambio de aroma sin costo · ajustes ilimitados",
    },

    trust: { quote: "Lo que más valoramos es que cuando algo no quedó bien al principio, lo ajustaron sin que teníamos que insistir. Nadie se ha quejado del aroma, ni clientes ni equipo.", by: "Dirección de Operaciones", co: "Grupo restaurantero · 5 sucursales" },

    photos: {
      cover: "photos/164-2.jpg",       // Manuela en cata con cliente — recomendación viva
      promise: "photos/74-2.jpg",      // Frasco hero del órgano — elegancia
      pillars: "photos/193-2.jpg",     // Manuela en consultoría 1:1 — respaldo
      method: "photos/170-2.jpg",      // Reunión consultiva — visita y cata
      aroma: "photos/151-2.jpg",       // Disco fragancia — cata comparativa
      catalog: "photos/207-2.jpg",
      close: "photos/202-2.jpg",       // Técnico recargando — ajustes incluidos
    },

    // Catálogo Core (modelos para 3-10 puntos)
    catalogEyebrow: "CATÁLOGO DE EQUIPOS",
    catalogTitleA: "Nosotros recomendamos",
    catalogTitleB: "el equipo por punto.",
    catalogIntro: "Ustedes no eligen modelo. En la visita técnica asignamos el equipo adecuado según área y tráfico de cada punto. Renta mensual con instalación, recargas, mantenimiento y ajustes incluidos.",
    catalogDeviceIds: ["fitz", "moai", "aspen", "montblanc", "montblancXl", "liberty", "empire", "ural", "everest"],
    catalogFootnote: "IVA no incluido · Precios vigentes 2026 · Asignación por punto según diagnóstico técnico",

    slides: ["cover", "promise", "pillars", "method", "aroma", "catalog", "quote", "close"],
  },

  // ── 🟨 KEY ────────────────────────────────────────────────
  key: {
    label: "KEY",
    name: "Cadena consolidada · 10–49 difusores",
    descriptor: "Retail nacional · hospitalidad · grupo en crecimiento",
    propTitleParts: ["Diseñemos juntos", "su identidad olfativa."],
    propSubtitle: "Con metodología, métricas y validación. Tu marca merece un aroma diseñado para ella, no uno elegido de catálogo.",
    eyebrow: "PROPUESTA ESTRATÉGICA",

    promiseEyebrow: "PROMESA",
    promiseLead: "No diseñamos sin entender",
    promiseHighlight: "qué emoción debe evocar tu espacio.",
    promiseBody: "Tu identidad olfativa se desarrolla bajo dirección creativa propia, no se elige de catálogo. Validamos antes de escalar: pilotamos en una sede de referencia, medimos percepción y desempeño, y solo después desplegamos al resto.",
    promiseStats: [
      { n: "30+", l: "AÑOS DE EXPERIENCIA" },
      { n: "100%", l: "DIRECCIÓN CREATIVA PROPIA" },
    ],

    pillarsTitleA: "Cuatro pilares",
    pillarsTitleB: "que diferencian un proyecto Key.",
    pillarsEyebrow: "POR QUÉ OLFATIVA",
    valuePillars: [
      { eyebrow: "CIS", title: "Centro de Inteligencia Sensorial.", body: "Unidad especializada en diseño de odotipos. Investigación, diseño sensorial y validación olfativa antes de cada lanzamiento." },
      { eyebrow: "Arquitectura", title: "Una arquitectura olfativa por espacio.", body: "No eliges un nivel. Eliges qué aroma vive en cada zona: operación, piso de venta, áreas signature. Tres tiers, una sola identidad." },
      { eyebrow: "Equipo", title: "Interlocutor único asignado.", body: "Un ejecutivo de cuenta dedicado conoce tu operación, tus formatos y tu calendario. Una llamada, una respuesta." },
      { eyebrow: "Validación", title: "Piloto antes del despliegue.", body: "Instalamos en una sede de referencia, medimos percepción y desempeño operativo. Los datos informan el despliegue completo." },
    ],

    methodTitleA: "Seis fases,",
    methodTitleB: "ninguna improvisada.",
    methodEyebrow: "METODOLOGÍA · 6 FASES",
    methodIntro: "Diseñadas para eliminar la incertidumbre. Sabes qué esperar, cuándo, y qué métricas validan el avance.",
    phases: [
      { n: "01", t: "Inmersión de marca", d: "Analizamos posicionamiento, arquetipos de cliente y entorno físico. Cada industria tiene un lenguaje olfativo." },
      { n: "02", t: "Desarrollo de odotipo", d: "Nuestros perfumistas traducen el ADN de marca en propuestas con perfil sensorial documentado." },
      { n: "03", t: "Validación técnica", d: "Estabilidad molecular, intensidad y compatibilidad con los equipos. Certificamos antes de escalar." },
      { n: "04", t: "Piloto con métricas", d: "Sede de referencia. Medimos percepción, cobertura y desempeño. Los datos informan el despliegue." },
      { n: "05", t: "Despliegue por cohortes", d: "Implementación coordinada con timeline. Protocolo estandarizado por tipo de espacio e intensidad." },
      { n: "06", t: "Operación y reporte", d: "Monitoreo activo, recargas preventivas, reporte ejecutivo. La identidad olfativa no se entrega: se opera." },
    ],

    aromaTitleA: "Tres tiers,",
    aromaTitleB: "una sola identidad.",
    aromaEyebrow: "ARQUITECTURA OLFATIVA",
    aromaIntro: "No eliges un nivel. Eliges qué aroma vive en cada zona de tu marca. Una sola identidad, modulada por tipo de espacio.",
    aromaTiers: [
      { name: "Comercial", tag: "Áreas operativas", body: "Almacenes, oficinas internas, baños, áreas de servicio. Aroma neutro y limpio.", bullets: ["Familia funcional", "Cobertura amplia", "Recargas mensuales"] },
      { name: "Premium", tag: "Áreas de cliente regular", body: "Piso de venta, lobby, áreas comunes. Aroma que se vuelve memoria de marca.", bullets: ["Identidad olfativa propia", "Calibración por zona", "Recargas mensuales"] },
      { name: "Nicho", tag: "Experiencias signature", body: "Suites presidenciales, flagship, áreas VIP. Composiciones de autor con materias primas raras.", bullets: ["Materias primas exclusivas", "Composición de autor", "Validación CIS por lote"] },
    ],

    closeLead: "Tu marca merece un aroma",
    closeHighlight: "diseñado para ella.",
    closeSub: "No uno elegido de un catálogo.",

    fields: {
      scope: "10–49 difusores · 3 tiers · arquitectura por espacio",
      unitsLabel: "Diseño + implementación + operación",
      priceDesign: "$185,000 (CIS · 6 fases)",
      priceUnits: "$32,000 / mes",
      priceOps: "Equipo asignado · incluido",
      priceTotal: "$185K + $32K/mes",
      terms: "24 meses · revisión semestral",
    },

    trust: { quote: "Buscábamos un aliado capaz de preservar la experiencia aromática que nuestros clientes perciben al ingresar. Encontramos en Olfativa una solución integral que nos permite enfocarnos en el core business.", by: "Gerente Consumos Internos", co: "El Palacio de Hierro" },

    photos: {
      cover: "photos/130-2.jpg",       // Estuche Olfativa sobre madera del órgano (sin gente)
      promise: "photos/193-2.jpg",     // Manuela en consultoría 1:1
      pillars: "photos/74-2.jpg",      // Frasco hero del órgano
      method: "photos/170-2.jpg",      // Reunión 3 personas
      aroma: "photos/127-2.jpg",       // Estantería frascos verdes
      curadora: "photos/89-2.jpg",     // Manuela retrato hero
      trust: "photos/164-2.jpg",       // Manuela en cata con cliente
      close: "photos/202-2.jpg",       // Servicio recarga
    },

    // Catálogo Key (7 modelos · cadena consolidada multi-formato)
    catalogEyebrow: "CATÁLOGO DE EQUIPOS",
    catalogTitleA: "Siete equipos,",
    catalogTitleB: "arquitectura por sede.",
    catalogIntro: "Cada formato necesita un equipo distinto. Asignamos modelo por sede según área, tráfico y arquetipo de espacio. Operación nacional unificada.",
    catalogDeviceIds: ["fitz", "moai", "aspen", "montblanc", "montblancXl", "liberty", "empire", "ural", "everest"],
    catalogFootnote: "IVA no incluido · Precios vigentes 2026 · Asignación por sede según diagnóstico técnico",

    slides: ["cover", "promise", "pillars", "curadora", "method", "aroma", "catalog", "quote", "trust", "close"],
  },

  // ── 🟥 ENTERPRISE ─────────────────────────────────────────
  enterprise: {
    label: "ENTERPRISE",
    name: "Operación nacional · 50+ difusores",
    descriptor: "Multi-sede · multi-formato · gobernanza corporativa",
    propTitleParts: ["La infraestructura olfativa", "de tu organización."],
    propSubtitle: "Diseñada una vez. Operada todos los días. En cada una de sus sedes.",
    eyebrow: "PROPUESTA EJECUTIVA",

    promiseEyebrow: "POSICIONAMIENTO",
    promiseLead: "No somos un proveedor de aromas.",
    promiseHighlight: "Somos infraestructura.",
    promiseBody: "Diseñamos la identidad olfativa de organizaciones que no pueden permitirse inconsistencias. La creamos una vez. La gobernamos en todas sus sedes, todos los días. Eliminamos la variable humana de la ecuación.",
    promiseStats: [
      { n: "3,816", l: "SEDES OPERADAS" },
      { n: "100%", l: "EJECUCIÓN OLFATIVA" },
    ],

    pillarsTitleA: "Cinco pilares",
    pillarsTitleB: "que sostienen una operación nacional.",
    pillarsEyebrow: "INFRAESTRUCTURA",
    valuePillars: [
      { eyebrow: "Identidad", title: "Una sola firma, gobernada en cada sede.", body: "Diseñamos su odotipo bajo dirección creativa propia. Lo replicamos sin desviaciones. Cada visitante percibe exactamente la misma experiencia, sin importar la ciudad." },
      { eyebrow: "Origen", title: "Seed to Scent · trazabilidad documentada.", body: "Materias primas Grand Cru de Grasse, Francia. Ecovadis Platinum. Cumplimiento IFRA con certificados por formulación." },
      { eyebrow: "Gobernanza", title: "Comités trimestrales · reportería ejecutiva.", body: "KPIs operativos formales: uptime, SLA, incidencias resueltas, score de auditoría. Escalamiento de incidencias documentado." },
      { eyebrow: "Estructura", title: "KAM dedicado + soporte por región.", body: "Un interlocutor único para dirección. Equipo técnico distribuido por región para respuesta operativa local." },
      { eyebrow: "Continuidad", title: "Contratos multi-anuales adaptables.", body: "Modelo financiero ajustable por bandas de volumen. NDA y confidencialidad como punto de partida." },
    ],

    methodTitleA: "De la estrategia",
    methodTitleB: "a la operación nacional.",
    methodEyebrow: "METODOLOGÍA · 6 FASES",
    methodIntro: "Seis fases diseñadas para eliminar la incertidumbre en cada etapa. Saber qué esperar, cuándo, y qué métricas validan el avance.",
    phases: [
      { n: "01", t: "Inmersión de marca", d: "Analizamos posicionamiento, arquetipos de cliente y entorno físico. No diseñamos sin entender qué emociones debe evocar cada espacio." },
      { n: "02", t: "Desarrollo de odotipo", d: "Nuestros perfumistas traducen el ADN de marca en propuestas con perfil sensorial documentado y justificación estratégica." },
      { n: "03", t: "Validación técnica y sensorial", d: "Estabilidad molecular, intensidad y compatibilidad con equipos. Certificamos antes de escalar. Sin sorpresas." },
      { n: "04", t: "Piloto con métricas", d: "Sede de referencia. Medimos percepción, cobertura y desempeño operativo. Los datos informan el despliegue completo." },
      { n: "05", t: "Despliegue nacional", d: "Coordinamos por cohortes o simultáneo. Protocolo estandarizado por tipo de espacio, región e intensidad." },
      { n: "06", t: "Gestión operativa continua", d: "Monitoreo activo, recargas preventivas, reporte ejecutivo periódico. Su identidad olfativa no se entrega: se opera." },
    ],

    aromaTitleA: "Arquitectura olfativa",
    aromaTitleB: "corporativa.",
    aromaEyebrow: "PORTAFOLIO SENSORIAL",
    aromaIntro: "La conversación no es qué tier elegir. Es cómo arquitectura su portafolio sensorial entre sus formatos. Tres niveles, una sola identidad corporativa.",
    aromaTiers: [
      { name: "Comercial", tag: "Áreas de servicio · back-of-house", body: "Bodegas, oficinas internas, baños de servicio, áreas operativas. Aroma neutro, funcional, eficiente.", bullets: ["Materias primas grado IFRA", "Cobertura amplia", "Mantenimiento estándar"] },
      { name: "Premium", tag: "Áreas de cliente regular", body: "Tiendas, lobbies, áreas comunes. El aroma que el cliente regular respira. Memoria de marca.", bullets: ["Identidad olfativa propia", "Calibración por formato", "Reportería mensual"] },
      { name: "Nicho", tag: "Flagship · suites · VIP", body: "Áreas signature de máxima exigencia. Composiciones de autor con materias primas raras y validación CIS por lote.", bullets: ["Grand Cru de Grasse", "Composición de autor por sede", "Certificación IFRA por formulación"] },
    ],

    // Compliance / Trust slide (Enterprise-only)
    complianceTitle: "Cumplimiento documentado.",
    complianceEyebrow: "ORIGEN, CIENCIA Y TRAZABILIDAD",
    complianceIntro: "Cada aroma tiene una ruta documentada. Materias primas con origen verificado, procesos certificados, archivo histórico por cliente.",
    complianceCerts: [
      { name: "IFRA", desc: "Cumplimiento internacional con certificado por formulación" },
      { name: "EcoCert", desc: "Cosmos Organic" },
      { name: "ISO", desc: "9235 / 16128 / 9001" },
      { name: "Fairtrade", desc: "Cadena de suministro ética" },
      { name: "Ecovadis", desc: "Platinum" },
      { name: "Grand Cru", desc: "Grasse, Francia · seed-to-scent" },
    ],

    closeLead: "Tu organización no puede permitirse",
    closeHighlight: "que el aroma dependa de la suerte.",
    closeSub: "Nosotros tampoco.",

    fields: {
      scope: "50+ difusores · 3 tiers · multi-sede nacional",
      unitsLabel: "Diseño + despliegue nacional + operación",
      priceDesign: "$320,000 (CIS · odotipo registrado)",
      priceUnits: "$98,000 / mes (operación nacional)",
      priceOps: "KAM + estructura técnica · incluido",
      priceTotal: "$320K + $98K/mes",
      terms: "36 meses · bandas por volumen · NDA",
    },

    trust: { quote: "Buscábamos un aliado capaz de preservar la experiencia aromática que nuestros clientes perciben al ingresar. Encontramos en Olfativa la capacidad de ofrecer un servicio a la altura de El Palacio de Hierro, lo que nos brinda la tranquilidad de contar con un socio que proporciona una solución integral.", by: "Gerente Consumos Internos", co: "El Palacio de Hierro" },

    photos: {
      cover: "photos/74-2.jpg",        // Frasco hero del órgano (sin gente)
      promise: "photos/89-2.jpg",      // Manuela retrato hero
      pillars: "photos/127-2.jpg",     // Estantería frascos
      method: "photos/170-2.jpg",      // Reunión consultiva
      aroma: "photos/127-2.jpg",       // Estantería
      curadora: "photos/89-2.jpg",     // Manuela retrato hero
      compliance: "photos/110-2.jpg",  // Manuela en lab — trabajo técnico
      trust: "photos/164-2.jpg",       // Manuela en cata con cliente
      close: "photos/200-2.jpg",       // Uniforme "Hace toda la diferencia"
    },

    slides: ["cover", "promise", "pillars", "curadora", "method", "aroma", "compliance", "quote", "trust", "close"],
  },

  // ── ⬛ MASTER ─────────────────────────────────────────────
  // Librería completa. El vendedor borra lo que no aplica.
  master: {
    label: "MASTER",
    name: "Machote completo · librería del vendedor",
    descriptor: "Todos los slides disponibles · arma tu propia versión",
    propTitleParts: ["Diseñamos su identidad olfativa.", "La gobernamos en cada sede."],
    propSubtitle: "Esta es la librería completa de Olfativa. El ejecutivo de cuenta selecciona qué slides usar según el cliente, segmento y momento de la conversación.",
    eyebrow: "PROPUESTA COMERCIAL",

    promiseEyebrow: "POSICIONAMIENTO",
    promiseLead: "No somos un proveedor de aromas.",
    promiseHighlight: "Somos la infraestructura olfativa de tu marca.",
    promiseBody: "Diseñamos identidades olfativas con dirección creativa propia. Las operamos en cada sede, todos los días. Eliminamos la variable humana de la ecuación: tú no coordinas recargas, no programas mantenimiento, no resuelves incidencias.",
    promiseStats: [
      { n: "3,816", l: "ESPACIOS ACTIVOS" },
      { n: "6", l: "CIUDADES CON PRESENCIA" },
      { n: "30+", l: "AÑOS DE EXPERIENCIA" },
    ],

    pillarsTitleA: "Cinco pilares",
    pillarsTitleB: "que sostienen cada proyecto.",
    pillarsEyebrow: "POR QUÉ OLFATIVA",
    valuePillars: [
      { eyebrow: "CIS", title: "Centro de Inteligencia Sensorial.", body: "Unidad especializada en diseño de odotipos. Investigación, diseño sensorial y validación olfativa antes de cada lanzamiento." },
      { eyebrow: "Origen", title: "Materias primas Grand Cru de Grasse.", body: "Seed-to-scent documentado. Cumplimiento IFRA con certificado por formulación. Ecovadis Platinum, Cosmos Organic, ISO 9235/16128/9001." },
      { eyebrow: "Operación", title: "Equipo en sede, no subcontratado.", body: "Nuestros técnicos visten Olfativa y operan con protocolo nacional. Instalación, recargas y mantenimiento — sin terceros." },
      { eyebrow: "Equipo", title: "KAM dedicado + soporte por región.", body: "Un interlocutor único conoce tu operación, formatos y calendario. Soporte técnico distribuido por región." },
      { eyebrow: "Continuidad", title: "Contratos adaptables · NDA de inicio.", body: "Modelo financiero ajustable por bandas de volumen. Confidencialidad como punto de partida." },
    ],

    methodTitleA: "Seis fases,",
    methodTitleB: "ninguna improvisada.",
    methodEyebrow: "METODOLOGÍA · 6 FASES",
    methodIntro: "Diseñadas para eliminar la incertidumbre. Sabes qué esperar, cuándo, y qué métricas validan el avance.",
    phases: [
      { n: "01", t: "Inmersión de marca", d: "Analizamos posicionamiento, arquetipos de cliente y entorno físico. Cada industria tiene un lenguaje olfativo." },
      { n: "02", t: "Desarrollo de odotipo", d: "Nuestros perfumistas traducen el ADN de marca en propuestas con perfil sensorial documentado." },
      { n: "03", t: "Validación técnica", d: "Estabilidad molecular, intensidad y compatibilidad con equipos. Certificamos antes de escalar." },
      { n: "04", t: "Piloto con métricas", d: "Sede de referencia. Medimos percepción, cobertura y desempeño. Los datos informan el despliegue." },
      { n: "05", t: "Despliegue por cohortes", d: "Implementación coordinada con timeline. Protocolo estandarizado por tipo de espacio e intensidad." },
      { n: "06", t: "Operación y reporte", d: "Monitoreo activo, recargas preventivas, reporte ejecutivo. La identidad olfativa no se entrega: se opera." },
    ],

    aromaTitleA: "Tres tiers,",
    aromaTitleB: "una sola identidad.",
    aromaEyebrow: "ARQUITECTURA OLFATIVA",
    aromaIntro: "No eliges un nivel. Eliges qué aroma vive en cada zona. Una sola identidad, modulada por tipo de espacio.",
    aromaTiers: [
      { name: "Comercial", tag: "Áreas operativas", body: "Almacenes, oficinas internas, baños, áreas de servicio. Aroma neutro y limpio.", bullets: ["Familia funcional", "Cobertura amplia", "Recargas mensuales"] },
      { name: "Premium", tag: "Áreas de cliente regular", body: "Piso de venta, lobby, áreas comunes. Aroma que se vuelve memoria de marca.", bullets: ["Identidad olfativa propia", "Calibración por zona", "Recargas mensuales"] },
      { name: "Nicho", tag: "Experiencias signature", body: "Suites presidenciales, flagship, áreas VIP. Composiciones de autor con materias primas raras.", bullets: ["Materias primas exclusivas", "Composición de autor", "Validación CIS por lote"] },
    ],

    // Catálogo completo (Enterprise · 9 modelos · cobertura nacional)
    catalogEyebrow: "CATÁLOGO COMPLETO",
    catalogTitleA: "Nueve equipos,",
    catalogTitleB: "una sola operación.",
    catalogIntro: "Catálogo completo de difusores Olfativa. Asignamos modelo según área, formato y nivel de tráfico de cada sede. Renta mensual con operación, mantenimiento e insumos incluidos.",
    catalogDeviceIds: ["fitz", "moai", "aspen", "montblanc", "montblancXl", "liberty", "empire", "ural", "everest"],
    catalogFootnote: "IVA no incluido · Precios vigentes 2026 · Asignación por sede según diagnóstico técnico",

    // Compliance
    complianceTitle: "Cumplimiento documentado.",
    complianceEyebrow: "ORIGEN, CIENCIA Y TRAZABILIDAD",
    complianceIntro: "Cada aroma tiene una ruta documentada. Materias primas con origen verificado, procesos certificados, archivo histórico por cliente.",
    complianceCerts: [
      { name: "IFRA", desc: "Cumplimiento internacional con certificado por formulación" },
      { name: "EcoCert", desc: "Cosmos Organic" },
      { name: "ISO", desc: "9235 / 16128 / 9001" },
      { name: "Fairtrade", desc: "Cadena de suministro ética" },
      { name: "Ecovadis", desc: "Platinum" },
      { name: "Grand Cru", desc: "Grasse, Francia · seed-to-scent" },
    ],

    closeLead: "Diseñamos su identidad olfativa.",
    closeHighlight: "La gobernamos en cada sede.",
    closeSub: "Todos los días.",

    fields: {
      scope: "Configurable según segmento del cliente",
      unitsLabel: "Diseño + implementación + operación",
      priceDesign: "Según alcance · CIS opcional",
      priceUnits: "Desde $1,102 / mes por difusor",
      priceOps: "Equipo Olfativa · sin subcontratación",
      priceTotal: "Cotización a la medida",
      terms: "Mes a mes (Long Tail) · 12-36 meses (Core/Key/Enterprise)",
    },

    trust: { quote: "Buscábamos un aliado capaz de preservar la experiencia aromática que nuestros clientes perciben al ingresar. Encontramos en Olfativa una solución integral que nos permite enfocarnos en el core business.", by: "Gerente Consumos Internos", co: "El Palacio de Hierro" },

    photos: {
      cover: "photos/130-2.jpg",       // Estuche Olfativa sobre madera del órgano (sin gente)
      promise: "photos/74-2.jpg",      // Frasco hero del órgano
      pillars: "photos/127-2.jpg",     // Estantería frascos
      method: "photos/170-2.jpg",      // Reunión consultiva
      aroma: "photos/151-2.jpg",       // Disco fragancia
      curadora: "photos/89-2.jpg",     // Manuela retrato hero
      catalog: "photos/207-2.jpg",     // Difusor torre
      compliance: "photos/110-2.jpg",  // Manuela en lab
      trust: "photos/164-2.jpg",       // Manuela en cata con cliente
      close: "photos/200-2.jpg",       // Uniforme
    },

    // Librería COMPLETA — el vendedor borra lo que no aplica
    slides: ["cover", "promise", "pillars", "curadora", "method", "aroma", "catalog", "compliance", "quote", "trust", "close"],
  },
};

// ============================================================
// CATÁLOGO COMPLETO DE DIFUSORES (data real Olfativa 2026)
// Cada machote filtra el subset apropiado por id
// ============================================================
const DIFFUSERS = {
  fitz:        { id: "fitz",        name: "Fitz",         photo: "photos/difusor-fitz.png",         m2: 50,    m3: 150,   tier: "Manual",   priceMxn: "$1,620", suited: "Boutique · oficina pequeña · sala de espera"           ,            tag: "ENTRADA" },
  moai:        { id: "moai",        name: "Moai",         photo: "photos/difusor-moai.png",         m2: 80,    m3: 250,   tier: "Manual",   priceMxn: "$1,800", suited: "Oficina · lobby · recepción comercial"              ,                  tag: "EQUILIBRIO" },
  aspen:       { id: "aspen",       name: "Aspen",        photo: "photos/difusor-aspen.png",        m2: 160,   m3: 400,   tier: "Premium · App", priceMxn: "$2,000", suited: "Boutique premium · café · estudio diseño"          ,               tag: "PREMIUM" },
  montblanc:   { id: "montblanc",   name: "Montblanc",    photo: "photos/difusor-montblanc.png",    m2: 120,   m3: 450,   tier: "Premium · App", priceMxn: "$2,000", suited: "Retail mediano · agencia · clínica privada"        ,            tag: "VERSÁTIL" },
  montblancXl: { id: "montblancXl", name: "Montblanc XL", photo: "photos/difusor-montblanc-xl.png", m2: 500,   m3: 1500,  tier: "Premium · App", priceMxn: "$4,500", suited: "Spa · hotel boutique · showroom silencioso"     ,   tag: "STATEMENT" },
  liberty:     { id: "liberty",     name: "Liberty",      photo: "photos/difusor-liberty.png",      m2: 660,   m3: 2000,  tier: "Profesional", priceMxn: "$4,500", suited: "Retail · agencia · evento · lobby corporativo"    ,                   tag: "ALTO TRÁFICO" },
  ural:        { id: "ural",        name: "Ural",         photo: "photos/difusor-ural.png",         m2: 1000,  m3: 3000,  tier: "Industrial", priceMxn: "$7,200", suited: "Comercial amplio · gimnasio · centro de eventos",        tag: "VOLUMEN" },
  empire:      { id: "empire",      name: "Empire",       photo: "photos/difusor-empire.png",       m2: 900,   m3: 2700,  tier: "Premium · App", priceMxn: "$4,500", suited: "Retail premium · lobby hotel · showroom automotriz", tag: "STATUS" },
  everest:     { id: "everest",     name: "Everest",      photo: "photos/difusor-everest.png",      m2: 1600,  m3: 5000,  tier: "HVAC central", priceMxn: "$9,000", suited: "Centro comercial · hotel grande · aeropuerto · arena", tag: "MÁXIMA ESCALA" },
};

// ============================================================
// CURADORA · Manuela P. Fleischhacker (shared by Core+Key+Enterprise)
// ============================================================
const CURADORA = {
  eyebrow: "PERFUMISTA · NUESTRA CURADORA",
  preTitle: "Diseño olfativo",
  nameA: "Manuela P.",
  nameB: "Fleischhacker.",
  lead: "30+ años diseñando fragancias",
  leadHighlight: "para las marcas más exigentes del mundo.",
  body: "Manuela es Desarrolladora de Fragancias en Olfativa, con más de 30 años de experiencia internacional en el mundo de la perfumería. Su carrera la ha llevado por las casas más rigurosas de Europa y Asia — diseñando fragancias únicas con la precisión de combinar ingredientes pensando siempre en crear momentos memorables.",
  cities: [
    { c: "Grasse", co: "Francia" },
    { c: "Zurich", co: "Suiza" },
    { c: "München", co: "Alemania" },
    { c: "Hong Kong", co: "China" },
    { c: "Shanghái", co: "China" },
    { c: "Bruselas", co: "Bélgica" },
    { c: "Ciudad de México", co: "México" },
  ],
  pullquote: "Cada aroma que sale de aquí lleva 30 años de oficio detrás. No se elige de catálogo — se diseña.",
  stats: [
    { n: "30+", l: "AÑOS DE OFICIO" },
    { n: "7", l: "PAÍSES DE TRAYECTORIA" },
    { n: "100%", l: "DIRECCIÓN CREATIVA PROPIA" },
  ],
};

// ============================================================
// HELPERS
// ============================================================
const SerifH = ({ children, size = TYPE_SCALE.title, italic = true, weight = 400, color = PALETTE.bone, lineHeight = 1.02, style }) => (
  <span style={{
    fontFamily: "'Cormorant Garamond', 'Cormorant', 'EB Garamond', Georgia, serif",
    fontSize: size,
    fontWeight: weight,
    fontStyle: italic ? 'italic' : 'normal',
    letterSpacing: '-0.02em',
    lineHeight,
    color,
    ...style,
  }}>{children}</span>
);

const SansH = ({ children, size = TYPE_SCALE.title, weight = 500, color = PALETTE.bone, tracking = '-0.025em', lineHeight = 1.02, style }) => (
  <span style={{
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
    fontSize: size,
    fontWeight: weight,
    letterSpacing: tracking,
    lineHeight,
    color,
    ...style,
  }}>{children}</span>
);

const Eyebrow = ({ children, color = PALETTE.gold, size = TYPE_SCALE.micro, style }) => (
  <span style={{
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
    fontSize: size,
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color,
    ...style,
  }}>{children}</span>
);

const Body = ({ children, color = PALETTE.boneSoft, size = TYPE_SCALE.body, weight = 400, style }) => (
  <div style={{
    fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
    fontSize: size,
    fontWeight: weight,
    lineHeight: 1.45,
    color,
    letterSpacing: '-0.005em',
    textWrap: 'pretty',
    ...style,
  }}>{children}</div>
);

const HairRule = ({ color = PALETTE.rule, vertical = false, length = '100%', thickness = 1, style }) => (
  <div style={{
    background: color,
    width: vertical ? thickness : length,
    height: vertical ? length : thickness,
    flexShrink: 0,
    ...style,
  }} />
);

const OlfativaMark = ({ color = PALETTE.bone, height = 28, style }) => (
  <svg viewBox="0 0 280 56" style={{ height, width: 'auto', display: 'block', ...style }} aria-label="Olfativa">
    <text x="0" y="42" fill={color} style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontStyle: 'italic',
      fontSize: 48,
      fontWeight: 500,
      letterSpacing: '0.01em',
    }}>Olfativa</text>
    <text x="216" y="20" fill={color} style={{
      fontFamily: "'Inter Tight', sans-serif",
      fontSize: 14,
      fontWeight: 400,
    }}>®</text>
  </svg>
);

const SlideChrome = ({ index, total, segment, clientName, dark = true, eyebrow, propId, propDate }) => {
  const fg = dark ? PALETTE.bone : PALETTE.ink;
  const dim = dark ? 'rgba(243,237,227,0.55)' : 'rgba(14,14,14,0.55)';
  const rule = dark ? PALETTE.rule : PALETTE.ruleInk;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        top: 44, left: SPACING.paddingX, right: SPACING.paddingX,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <OlfativaMark color={fg} height={22} />
          {clientName && (
            <>
              <HairRule color={rule} vertical length={20} />
              <Eyebrow color={dim} size={13} style={{ letterSpacing: '0.22em' }}>
                Propuesta · {clientName || '—'}
              </Eyebrow>
            </>
          )}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 44, left: SPACING.paddingX, right: SPACING.paddingX,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Eyebrow color={dim} size={13} style={{ letterSpacing: '0.22em' }}>
          OLFATIVA · CASA OLFATIVA
        </Eyebrow>
        <Eyebrow color={dim} size={13} style={{ letterSpacing: '0.22em' }}>
          {String(index).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </Eyebrow>
      </div>
    </div>
  );
};

const SlideFrame = ({ children, bg = PALETTE.ink, style }) => (
  <div style={{
    width: '100%', height: '100%',
    background: bg,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Inter Tight', sans-serif",
    ...style,
  }}>{children}</div>
);

// ============================================================
// SegmentMarkers — chrome con marcadores numéricos por sección
// Renderiza 5 grupos (Promesa · Método · Catálogo · Trust · Cierre)
// con un dot lleno marcando la sección actual.
// ============================================================
const SegmentMarkers = ({ current = 0, segments, dark = true, style }) => {
  const fg = dark ? PALETTE.bone : PALETTE.ink;
  const dim = dark ? 'rgba(243,237,227,0.32)' : 'rgba(14,14,14,0.32)';
  const groups = segments || [
    { label: 'Promesa', n: 'I' },
    { label: 'Método',  n: 'II' },
    { label: 'Catálogo', n: 'III' },
    { label: 'Confianza', n: 'IV' },
    { label: 'Cierre',   n: 'V' },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 28,
      fontFamily: "'Inter Tight', 'Inter', system-ui, sans-serif",
      ...style,
    }}>
      {groups.map((g, i) => {
        const active = i === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: active ? PALETTE.gold : (active ? fg : 'transparent'),
              border: `1px solid ${active ? PALETTE.gold : dim}`,
              display: 'inline-block',
            }} />
            <span style={{
              fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: active ? fg : dim, fontWeight: active ? 500 : 400,
            }}>
              {g.n}. {g.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Export shared tokens, helpers and components to window so
// every <script type="text/babel"> file can use the same system.
// (Babel scopes per script block — without this, slide files
// would each redefine PALETTE/SerifH/etc and drift.)
// ============================================================
if (typeof window !== 'undefined') {
  Object.assign(window, {
    // Tokens
    TYPE_SCALE, SPACING, PALETTE, SEGMENTS,
    // Catalogs
    DIFFUSERS, CURADORA,
    // Components
    SerifH, SansH, Eyebrow, Body, HairRule, OlfativaMark,
    SlideChrome, SlideFrame, SegmentMarkers,
  });
}
