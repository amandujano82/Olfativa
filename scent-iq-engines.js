// scent-iq-engines.js
// Motores de decisión olfativa de Olfativa Scent Advisor.
// Carga las globales window.OLF_KNOW (knowledge) y expone window.OLF_IA (engines).
//
// Reglas anti-alucinación:
//  - Sólo aromas en window.OLF_KNOW.aromas (104).
//  - Sólo difusores en window.OLF_KNOW.difusores (15).
//  - Si dato falta -> marca "estimado" o "requiere validación".
//  - El aroma alternativo siempre se etiqueta con la función que cumple.
//
// Adapter de visión: por default "mock" (determinista, no inventa fuera de catálogo).
// Para conectar OpenAI / Claude Vision: implementar window.OLF_IA.visionAdapters.openai
// con la misma firma async (file) -> analisis_visual.

(function (W) {
  const K = W.OLF_KNOW;
  if (!K) {
    console.error('[scent-iq] OLF_KNOW no disponible. Carga scent-iq-knowledge.js antes.');
    return;
  }

  // ---------- utils ----------
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const contains = (hay, needle) => norm(hay).includes(norm(needle));
  const uniq = (a) => Array.from(new Set(a));

  // ---------- mock vision adapter ----------
  // Determinista a partir de un seed (hash del nombre+tamaño del archivo).
  // 5 perfiles de espacio cubren el espectro de las 8 familias.
  const MOCK_PROFILES = [
    {
      // 0 — wellness spa
      familia_visual: "organico_biophilic",
      familia_visual_secundaria: "minimalista_calmo",
      objetivo_comercial: "bienestar",
      tipo_de_luz: "luz cálida difusa",
      temperatura_visual: "cálida",
      paleta_dominante: "verdes suaves, arena, blancos rotos",
      saturacion: "baja",
      contraste: "bajo",
      materialidad: "madera natural y piedra",
      materiales_principales: ["madera clara", "piedra", "lino", "vegetación"],
      formas: "curvas suaves",
      geometria: "curvas",
      densidad: "densidad baja",
      nivel_premium: "medio-alto",
      presencia_naturaleza: "alta",
      tipo_de_espacio: "spa · wellness retreat",
      emocion_actual: "calma incipiente, restauración",
      emocion_deseada: "respiración profunda, pausa restauradora",
      m2_estimados: 60,
      altura_estimada_m: 3.0,
      espacio_cerrado: true,
      ventilacion: "media",
      flujo_personas: "bajo",
      tiempo_permanencia: "largo"
    },
    {
      // 1 — quiet luxury / lobby hotel
      familia_visual: "contemporaneo_calido",
      familia_visual_secundaria: "clasico_transicional",
      objetivo_comercial: "premium",
      tipo_de_luz: "warm pendant + indirect cove",
      temperatura_visual: "cálida",
      paleta_dominante: "neutros cálidos, marrones, topo",
      saturacion: "baja-media",
      contraste: "medio",
      materialidad: "madera oscura, piedra cálida, plaster",
      materiales_principales: ["madera oscura", "piedra", "textil rico"],
      formas: "líneas suaves",
      geometria: "ortogonal con piezas curvas",
      densidad: "media-baja",
      nivel_premium: "alto",
      presencia_naturaleza: "baja-media",
      tipo_de_espacio: "lobby hotel · sala premium",
      emocion_actual: "sofisticación contenida",
      emocion_deseada: "permanencia, valor alto sin espectáculo",
      m2_estimados: 120,
      altura_estimada_m: 4.0,
      espacio_cerrado: true,
      ventilacion: "media",
      flujo_personas: "medio",
      tiempo_permanencia: "medio"
    },
    {
      // 2 — costero / boutique
      familia_visual: "costero_tropical",
      familia_visual_secundaria: "minimalista_calmo",
      objetivo_comercial: "energia",
      tipo_de_luz: "luz natural luminosa",
      temperatura_visual: "fría-neutra",
      paleta_dominante: "blancos rotos, beige, azul agua",
      saturacion: "baja",
      contraste: "medio",
      materialidad: "rattan, lino, madera lavada",
      materiales_principales: ["rattan", "lino", "madera clara", "cuerda"],
      formas: "ligereza, líneas abiertas",
      geometria: "abierta",
      densidad: "baja",
      nivel_premium: "medio",
      presencia_naturaleza: "media-alta",
      tipo_de_espacio: "boutique costera · lobby resort",
      emocion_actual: "luminosidad, frescura activa",
      emocion_deseada: "bienvenida fresca, optimismo",
      m2_estimados: 90,
      altura_estimada_m: 3.5,
      espacio_cerrado: false,
      ventilacion: "alta",
      flujo_personas: "medio-alto",
      tiempo_permanencia: "corto-medio"
    },
    {
      // 3 — industrial loft / bar
      familia_visual: "industrial_urbano",
      familia_visual_secundaria: "glam_nocturno",
      objetivo_comercial: "social",
      tipo_de_luz: "puntual, dramática, ambiente bajo",
      temperatura_visual: "cálida-fría mezclada",
      paleta_dominante: "concreto, acero, cuero, negros",
      saturacion: "baja con acentos saturados",
      contraste: "alto",
      materialidad: "concreto, acero negro, ladrillo, cuero",
      materiales_principales: ["concreto", "acero negro", "ladrillo", "cuero"],
      formas: "líneas duras",
      geometria: "angular",
      densidad: "media",
      nivel_premium: "medio-alto",
      presencia_naturaleza: "baja",
      tipo_de_espacio: "bar · lounge urbano",
      emocion_actual: "edge creativo, nightlife contenida",
      emocion_deseada: "memorabilidad, exclusividad performativa",
      m2_estimados: 150,
      altura_estimada_m: 4.5,
      espacio_cerrado: true,
      ventilacion: "media-baja",
      flujo_personas: "alto",
      tiempo_permanencia: "medio"
    },
    {
      // 4 — bohemio mexicano contemporáneo
      familia_visual: "bohemio_artesanal",
      familia_visual_secundaria: "contemporaneo_calido",
      objetivo_comercial: "identidad",
      tipo_de_luz: "cálida, capas de luz",
      temperatura_visual: "cálida",
      paleta_dominante: "terracota, verde botánico, ocre",
      saturacion: "media",
      contraste: "medio",
      materialidad: "barro, fibras tejidas, madera",
      materiales_principales: ["barro", "fibras", "madera", "textil artesanal"],
      formas: "curvas orgánicas",
      geometria: "mixta",
      densidad: "alta",
      nivel_premium: "medio",
      presencia_naturaleza: "media-alta",
      tipo_de_espacio: "hospitality boutique · retail con identidad local",
      emocion_actual: "pertenencia, calor humano",
      emocion_deseada: "arraigo, autenticidad, recuerdo del lugar",
      m2_estimados: 80,
      altura_estimada_m: 3.2,
      espacio_cerrado: true,
      ventilacion: "media",
      flujo_personas: "medio",
      tiempo_permanencia: "medio"
    }
  ];

  // hash super simple para escoger perfil de forma determinista
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  async function mockVision(file, opts = {}) {
    // si pidieron un perfil explícito (demo) lo usamos
    if (opts.profileIndex != null) {
      return { ..._withMockMeta(MOCK_PROFILES[opts.profileIndex % MOCK_PROFILES.length]) };
    }
    if (!file) {
      // sin archivo y sin perfil: devuelve perfil 1 (premium) con flag de estimado total
      return { ..._withMockMeta(MOCK_PROFILES[1]), _estimadoTotal: true };
    }
    const seed = hashStr(file.name + ':' + file.size);
    const idx = seed % MOCK_PROFILES.length;
    return { ..._withMockMeta(MOCK_PROFILES[idx]), _fileMeta: { name: file.name, size: file.size } };
  }

  function _withMockMeta(p) {
    return { ...p, _source: 'mock', _warning: 'Análisis generado por adapter mock — requiere validación cuando se conecte vision API real.' };
  }

  // ---------- recomendación de aromas ----------
  // 1. Toma combo (visual × objetivo) de la matriz.
  // 2. Trae aromas del catálogo que coincidan en familia y objetivos.
  // 3. Primero busca por nombre exacto en los ejemplos de la guía.
  // 4. Aroma alternativo: variante con función etiquetada.
  // ---------------------------------------------

  // Map de palabras del "atajo" a familias del catálogo
  const ATAJO_FAMILIA = [
    { match: /t[ée]\b|tea|té\s+blanco|té\s+verde|té\s+negro/i, familia: 'Herbales' },
    { match: /c[íi]trico|toronja|bergamota|lima|naranja|lim[óo]n|neroli|azahar/i, familia: 'Cítricas' },
    { match: /madera|s[áa]ndalo|cedro|wood|cedar|oud/i, familia: 'Amaderadas' },
    { match: /floral|rosa|orqu[íi]dea|jazm[íi]n|gardenia|champagne|musk/i, familia: 'Florales' },
    { match: /frutal|guayaba|manzana|melocot[óo]n|frutas/i, familia: 'Frutales' },
    { match: /aloe|eucalipto|lemongrass|lavanda|herbal|tomillo|salvia|romero/i, familia: 'Herbales' },
    { match: /verde|green|musgo|hierba/i, familia: 'Verdes' },
    { match: /incienso|cuero|leather|amber|res[íi]na|incense/i, familia: 'De ocasión' }
  ];

  function familiasFromAtajo(atajo) {
    const fams = [];
    for (const r of ATAJO_FAMILIA) if (r.match.test(atajo)) fams.push(r.familia);
    return uniq(fams);
  }

  function getCombo(visualId, objetivoId) {
    const direct = K.matriz.combos.find(c => c.visual === visualId && c.objetivo === objetivoId);
    if (direct) return direct;
    // fallback: cualquiera de la familia visual
    const sameVisual = K.matriz.combos.find(c => c.visual === visualId);
    return sameVisual || null;
  }

  function findExactByName(name) {
    return K.findAromaByName(name);
  }

  function recommendAromas(analisis) {
    const visualId = analisis.familia_visual;
    const objetivoId = analisis.objetivo_comercial || K.matriz.default_objetivo[visualId];
    const combo = getCombo(visualId, objetivoId);

    let principal = null;
    let alternativo = null;
    const used = new Set();
    const justifs = [];

    // 1. Intentar nombres exactos de ejemplos de la guía
    if (combo) {
      for (const name of combo.ejemplos) {
        const found = findExactByName(name);
        if (found && !used.has(found.id)) {
          if (!principal) { principal = found; justifs.push(`Match directo con la guía: ${found.nombre} aparece en la matriz ${visualId} × ${objetivoId}.`); used.add(found.id); }
          else if (!alternativo) { alternativo = found; used.add(found.id); break; }
        }
      }
    }

    // 2. Si falta principal: filtra catálogo por familia del atajo + objetivos del objetivo comercial
    const objetivo = K.objetivos.find(o => o.id === objetivoId);
    const objetivoPalancas = (objetivo?.palancas || []).map(norm);
    const objetivoEjemplos = (objetivo?.ejemplos || []);
    const atajoText = combo?.atajo || '';
    const familiasObjetivo = familiasFromAtajo(atajoText);

    function scoreAroma(a) {
      let s = 0;
      if (familiasObjetivo.includes(a.familia)) s += 5;
      // intersección con palancas
      const aroma_text = norm([a.nombre, ...(a.acordes||[]), a.notas.salida, a.notas.corazon, a.notas.fondo, a.descripcion, ...(a.objetivos||[])].join(' '));
      for (const p of objetivoPalancas) if (aroma_text.includes(p.replace(/[áéíóú]/g,c=>({'á':'a','é':'e','í':'i','ó':'o','ú':'u'}[c])))) s += 2;
      // bonus si aparece en ejemplos del objetivo
      if (objetivoEjemplos.some(e => e.toLowerCase() === a.nombre.toLowerCase())) s += 3;
      // penalización por flags peligrosos cuando objetivo es bienestar/limpieza
      if (['bienestar','limpieza','foco'].includes(objetivoId) && a.flags.ocasion) s -= 2;
      return s;
    }

    if (!principal) {
      const ranked = K.aromas
        .map(a => ({ a, s: scoreAroma(a) }))
        .filter(x => x.s > 0)
        .sort((x, y) => y.s - x.s);
      if (ranked[0]) { principal = ranked[0].a; used.add(principal.id); justifs.push(`Selección por congruencia: ${principal.nombre} cumple familia "${principal.familia}" y objetivo "${objetivo?.nombre || objetivoId}".`); }
    }

    // 3. Alternativo: variante con función etiquetada
    let funcionAlt = '';
    if (!alternativo && principal) {
      const candidates = K.aromas
        .filter(a => a.id !== principal.id)
        .map(a => ({ a, s: scoreAroma(a) }))
        .sort((x, y) => y.s - x.s)
        .slice(0, 12)
        .map(x => x.a);

      // Heurísticas de función:
      // - "más premium": tiene es_nicho o sublinea === 'Nicho'
      // - "más distintivo": flags.ocasion === true
      // - "más fresco": familia Cítricas o Verdes
      // - "menos polarizante": catalog familia Florales con sublinea Regular
      // - "más seguro": familia Cítricas con objetivos {Frescura, Felicidad, Vitalidad}
      const altPremium = candidates.find(a => a.flags.nicho || a.sublinea === 'Nicho');
      const altDistintivo = candidates.find(a => a.flags.ocasion);
      const altFresco = candidates.find(a => ['Cítricas','Verdes'].includes(a.familia));
      const altSeguro = candidates.find(a => a.familia === 'Cítricas' && a.objetivos.some(o => /Frescura|Felicidad|Vitalidad|Energ/i.test(o)));

      // Objetivo conduce la función
      const orderByObjetivo = {
        premium:   ['más premium','más distintivo','menos polarizante','más seguro'],
        social:    ['más distintivo','más premium','menos polarizante','más seguro'],
        bienestar: ['menos polarizante','más seguro','más fresco'],
        limpieza:  ['más seguro','más fresco','menos polarizante'],
        foco:      ['más fresco','más seguro','menos polarizante'],
        energia:   ['más fresco','más seguro','más distintivo'],
        calidez:   ['menos polarizante','más premium','más distintivo'],
        identidad: ['más distintivo','más premium','menos polarizante']
      }[objetivoId] || ['más seguro','más premium','más distintivo','más fresco'];

      const byFn = {
        'más premium': altPremium,
        'más distintivo': altDistintivo,
        'más fresco': altFresco,
        'más seguro': altSeguro,
        'menos polarizante': candidates.find(a => a.familia === 'Florales' && a.sublinea === 'Regular')
      };

      for (const fn of orderByObjetivo) {
        if (byFn[fn]) { alternativo = byFn[fn]; funcionAlt = fn; break; }
      }
      if (!alternativo) { alternativo = candidates[0] || null; funcionAlt = 'segunda mejor congruencia'; }
      if (alternativo) justifs.push(`Alternativo (${funcionAlt}): ${alternativo.nombre} para dar al cliente una segunda opción con perfil distinto.`);
    }

    // 4. Si no hay objetivo definido y no llegamos a nada, usar puente
    let usedPuente = null;
    if (!principal) {
      usedPuente = K.fallbacksPuente[0];
      const found = findExactByName(usedPuente.ejemplos[0]);
      if (found) { principal = found; justifs.push(`Fallback puente (espacio ambiguo): ${found.nombre}.`); }
    }

    // Nivel de riesgo: bajo si principal está en ejemplos de la guía; medio si calculado; alto si fallback puente
    let nivelRiesgo = 'medio';
    if (combo && combo.ejemplos.some(n => principal && n.toLowerCase() === principal.nombre.toLowerCase())) nivelRiesgo = 'bajo';
    if (usedPuente) nivelRiesgo = 'alto';
    if (analisis._estimadoTotal) nivelRiesgo = 'alto';

    return {
      familia_olfativa: combo?.atajo || (usedPuente ? usedPuente.atajo : 'requiere validación'),
      subacorde_olfativo: principal ? `${principal.acordes[0]} + ${principal.acordes[1]}`.replace(/\+\s*$/, '').trim() : 'requiere validación',
      aroma_principal: principal ? { id: principal.id, key: principal.key, nombre: principal.nombre, familia: principal.familia, descripcion: principal.descripcion } : null,
      aroma_alternativo: alternativo ? { id: alternativo.id, key: alternativo.key, nombre: alternativo.nombre, familia: alternativo.familia, funcion: funcionAlt, descripcion: alternativo.descripcion } : null,
      nivel_riesgo: nivelRiesgo,
      justificacion: justifs.join(' ')
    };
  }

  // ---------- recomendación de difusor ----------
  function recommendDifusor(analisis) {
    const m2 = Number(analisis.m2_estimados) || null;
    const altura = Number(analisis.altura_estimada_m) || null;
    const flujo = String(analisis.flujo_personas || '').toLowerCase();
    const cerrado = analisis.espacio_cerrado;
    const visualId = analisis.familia_visual;
    const familiaVisual = K.familiasVisuales.find(f => f.id === visualId);
    const familiaNombre = familiaVisual?.nombre || '';

    // Score: m² dentro de cobertura > estilo compatible > flujo apropiado
    function scoreDifusor(d) {
      let s = 0;
      if (m2 != null && d.cobertura_min_m2 != null && d.cobertura_max_m2 != null) {
        if (m2 >= d.cobertura_min_m2 && m2 <= d.cobertura_max_m2 * 1.2) s += 10;
        else if (m2 >= d.cobertura_min_m2 * 0.8 && m2 <= d.cobertura_max_m2 * 1.5) s += 4;
      } else {
        s += 1;
      }
      // estilo compatible: revisa estilos_compat
      const styles = (d.estilos_compat || []).map(norm).join(' ');
      if (familiaVisual) {
        // alias-sensitive matching
        const aliasList = [familiaNombre, ...familiaVisual.alias.split('·').map(x=>x.trim())];
        for (const a of aliasList) if (styles.includes(norm(a).split(' ')[0])) { s += 4; break; }
      }
      // flujo
      const flj = norm(d.flujo);
      if (flujo.includes('alto') && flj.includes('alto')) s += 3;
      if (flujo.includes('medio') && flj.includes('medio')) s += 2;
      if (flujo.includes('bajo') && flj.includes('bajo')) s += 2;
      // configuración premium para objetivos premium
      if (analisis.objetivo_comercial === 'premium' && d.nivel_premium >= 4) s += 2;
      if (analisis.objetivo_comercial === 'identidad' && d.nivel_premium >= 3) s += 1;
      // Espacios cerrados -> manual ok; abiertos -> preferir cobertura alta
      if (cerrado === false && d.cobertura_max_m2 >= 200) s += 1;
      // ruido en hospitality / wellness
      if (['bienestar','premium','foco'].includes(analisis.objetivo_comercial) && /muy bajo|bajo/i.test(d.nivel_ruido)) s += 1;
      return s;
    }

    const ranked = K.difusores
      .map(d => ({ d, s: scoreDifusor(d) }))
      .sort((x, y) => y.s - x.s);

    const best = ranked[0]?.d || null;

    // Cantidad: ceil(m² / cobertura_max). Si m² desconocido, 1.
    let cantidad = 1;
    let cantidadEstimada = m2 == null;
    if (best && m2 != null && best.cobertura_max_m2 > 0) {
      cantidad = Math.max(1, Math.ceil(m2 / best.cobertura_max_m2));
    }

    // Intensidad
    let intensidad = 'media';
    if (analisis.objetivo_comercial === 'bienestar' || analisis.objetivo_comercial === 'foco') intensidad = 'baja';
    if (analisis.objetivo_comercial === 'social' || analisis.objetivo_comercial === 'energia') intensidad = 'media-alta';
    if (flujo.includes('alto') && cerrado === false) intensidad = 'alta';

    // Ubicación
    let ubicacion = best?.ubicacion || 'central';
    if (analisis.tipo_de_espacio && /lobby|recepci|entrada/i.test(analisis.tipo_de_espacio)) ubicacion = 'cerca de entrada / recepción';

    // Riesgos
    const riesgos = [];
    if (cerrado === false) riesgos.push('Espacio abierto o semi-abierto: riesgo de sub-difusión por corrientes de aire.');
    if (altura != null && altura >= 4.5) riesgos.push(`Altura ${altura} m sobre la media: validar instalación a la altura adecuada.`);
    if (analisis.ventilacion === 'alta') riesgos.push('Ventilación alta: considera aumentar intensidad o agregar segundo equipo.');
    if (analisis.ventilacion === 'media-baja') riesgos.push('Ventilación reducida: vigilar saturación olfativa.');
    if (m2 == null) riesgos.push('m² no provistos: cantidad y cobertura están estimadas, requieren validación en sitio.');
    if (best && !best.priced) riesgos.push(`El modelo ${best.modelo} aún no tiene precio cargado en el cotizador (requiere validación de precio).`);

    // Ajustes
    const ajustes = [];
    if (best && cantidad > 1) ajustes.push(`Distribuir ${cantidad} unidades en zonas con corriente cruzada.`);
    if (best && /manual/i.test(best.configuracion) && ['premium','bienestar'].includes(analisis.objetivo_comercial)) {
      ajustes.push('Considerar versión con app para programación fina.');
    }

    return {
      difusor_recomendado: best ? best.modelo : 'requiere validación',
      difusor_key: best ? best.key : null,
      cotizador_key: best ? best.cotizador_key : null,
      cantidad,
      cantidad_estimada: cantidadEstimada,
      ubicacion_sugerida: ubicacion,
      intensidad,
      riesgos,
      ajustes_recomendados: ajustes,
      _meta: best ? {
        cobertura_min_m2: best.cobertura_min_m2,
        cobertura_max_m2: best.cobertura_max_m2,
        configuracion: best.configuracion,
        nivel_premium: best.nivel_premium,
        imagen_url: best.imagen_url,
        url_producto: best.url_producto,
        precio_renta_mxn: best.precio_renta_mxn
      } : null
    };
  }

  // ---------- prompt Designer ----------
  function buildDesignerPrompt(analisis, estrategia, labels) {
    const fv = K.familiasVisuales.find(f => f.id === analisis.familia_visual);
    const familiaVisualName = fv ? `${fv.nombre} (${fv.alias})` : (analisis.familia_visual || '—');
    const lab = labels || [];
    while (lab.length < 5) lab.push('');
    return [
      'Crea una visualización arquitectónica premium basada en una foto real de interior.',
      'Mejora la imagen original con corrección de iluminación profesional, nitidez y profundidad realzadas, manteniendo un look fotográfico realista.',
      '',
      'Estilo del overlay:',
      '- líneas finas y elegantes en tono neutro',
      '- llamadas arquitectónicas (callouts)',
      '- layout minimalista de lujo',
      '- estética de presentación hospitality high-end',
      '',
      'Resaltar:',
      `1. Iluminación: ${analisis.tipo_de_luz || '—'}`,
      `2. Materiales: ${analisis.materialidad || '—'}`,
      `3. Geometría: ${analisis.formas || '—'}`,
      `4. Densidad espacial: ${analisis.densidad || '—'}`,
      `5. Estilo: ${familiaVisualName}`,
      '',
      'Título:',
      'Análisis sensorial del espacio',
      '',
      'Subtítulo:',
      'Lectura visual y dirección olfativa',
      '',
      'Etiquetas:',
      lab[0], lab[1], lab[2], lab[3], lab[4],
      '',
      'Dirección olfativa:',
      estrategia.familia_olfativa,
      estrategia.subacorde_olfativo,
      '',
      'Estilo de diseño:',
      '- minimalismo de lujo',
      '- paleta neutra (cremas y maderas suaves)',
      '- sombras suaves',
      '- estética hospitality premium',
      '- logo Olfativa pequeño y elegante en la esquina inferior derecha',
      '',
      'Output:',
      'Genera un visual limpio, premium y listo para presentación al cliente.'
    ].join('\n');
  }

  // Labels: 5 etiquetas cortas para overlays
  function makeLabels(analisis, estrategia) {
    return [
      `Iluminación · ${shortify(analisis.tipo_de_luz)}`,
      `Materiales · ${shortify(analisis.materialidad)}`,
      `Geometría · ${shortify(analisis.formas)}`,
      `Aroma · ${estrategia.aroma_principal?.nombre || '—'}`,
      `Dirección · ${shortify(estrategia.familia_olfativa, 30)}`
    ];
  }
  function shortify(s, max = 22) {
    if (!s) return '—';
    const t = String(s).trim();
    return t.length <= max ? t : t.slice(0, max - 1) + '…';
  }

  // ---------- resumen comercial ----------
  function buildResumenComercial(analisis, estrategia, difusion) {
    const fv = K.familiasVisuales.find(f => f.id === analisis.familia_visual);
    const objetivo = K.objetivos.find(o => o.id === analisis.objetivo_comercial);
    return (
      `Este espacio se percibe ${fv ? fv.nombre.toLowerCase() : 'ambiguo'}` +
      `${analisis.emocion_actual ? ` · ${analisis.emocion_actual}` : ''}. ` +
      `El objetivo es ${objetivo ? objetivo.nombre.toLowerCase() : '—'}` +
      `${analisis.emocion_deseada ? `: ${analisis.emocion_deseada}` : ''}. ` +
      `Por eso la dirección olfativa es ${estrategia.familia_olfativa}. ` +
      `El aroma ${estrategia.aroma_principal?.nombre || '—'} funciona por congruencia entre paleta visual, materialidad y objetivo. ` +
      `El difusor ${difusion.difusor_recomendado} asegura cobertura para ${analisis.m2_estimados || '—'} m² considerando ` +
      `${analisis.espacio_cerrado ? 'espacio cerrado' : 'apertura'} y flujo ${analisis.flujo_personas || '—'}.`
    );
  }

  // ---------- ensamblado del output ----------
  function buildOutput(analisis) {
    const estrategia = recommendAromas(analisis);
    const difusion   = recommendDifusor(analisis);
    const labels     = makeLabels(analisis, estrategia);
    const prompt     = buildDesignerPrompt(analisis, estrategia, labels);
    const resumen    = buildResumenComercial(analisis, estrategia, difusion);

    return {
      analisis_visual: {
        tipo_de_luz: analisis.tipo_de_luz || '',
        temperatura_visual: analisis.temperatura_visual || '',
        paleta_dominante: analisis.paleta_dominante || '',
        saturacion: analisis.saturacion || '',
        contraste: analisis.contraste || '',
        materialidad: analisis.materialidad || '',
        materiales_principales: analisis.materiales_principales || [],
        formas: analisis.formas || '',
        geometria: analisis.geometria || '',
        densidad: analisis.densidad || '',
        familia_visual: analisis.familia_visual || '',
        familia_visual_secundaria: analisis.familia_visual_secundaria || '',
        nivel_premium: analisis.nivel_premium || '',
        presencia_naturaleza: analisis.presencia_naturaleza || '',
        tipo_de_espacio: analisis.tipo_de_espacio || ''
      },
      lectura_emocional: {
        emocion_actual: analisis.emocion_actual || '',
        emocion_deseada: analisis.emocion_deseada || '',
        objetivo_comercial: analisis.objetivo_comercial || ''
      },
      estrategia_olfativa: {
        familia_olfativa: estrategia.familia_olfativa,
        subacorde_olfativo: estrategia.subacorde_olfativo,
        aroma_principal:  estrategia.aroma_principal?.nombre || 'requiere validación',
        aroma_alternativo: estrategia.aroma_alternativo?.nombre || 'requiere validación',
        nivel_riesgo: estrategia.nivel_riesgo,
        justificacion: estrategia.justificacion
      },
      difusion: {
        difusor_recomendado: difusion.difusor_recomendado,
        cantidad: difusion.cantidad,
        ubicacion_sugerida: difusion.ubicacion_sugerida,
        intensidad: difusion.intensidad,
        riesgos: difusion.riesgos,
        ajustes_recomendados: difusion.ajustes_recomendados
      },
      designer: {
        labels,
        prompt_final: prompt
      },
      resumen_comercial: resumen,
      _meta: {
        vision_source: analisis._source || 'unknown',
        warning: analisis._warning || null,
        aroma_principal_full: estrategia.aroma_principal,
        aroma_alternativo_full: estrategia.aroma_alternativo,
        difusor_full: difusion._meta,
        difusor_key: difusion.difusor_key,
        cotizador_key: difusion.cotizador_key
      }
    };
  }

  // ---------- validación de schema ----------
  function schemaValidate(out) {
    const errors = [];
    if (!out || typeof out !== 'object') return { ok: false, errors: ['output no es objeto'] };
    const need = ['analisis_visual','lectura_emocional','estrategia_olfativa','difusion','designer','resumen_comercial'];
    for (const k of need) if (!out[k]) errors.push(`falta ${k}`);
    if (out.estrategia_olfativa && !out.estrategia_olfativa.aroma_principal) errors.push('falta aroma_principal');
    if (out.difusion && !out.difusion.difusor_recomendado) errors.push('falta difusor_recomendado');
    return { ok: errors.length === 0, errors };
  }

  // ---------- API pública ----------
  W.OLF_IA = {
    visionAdapter: 'mock',
    visionAdapters: {
      mock: mockVision
      // openai: async (file) => { ... }   <- implementar aquí cuando haya API key
      // claude: async (file) => { ... }
    },
    async analyzeImage(file, opts) {
      const adapter = this.visionAdapters[this.visionAdapter];
      if (!adapter) throw new Error(`vision adapter "${this.visionAdapter}" no implementado`);
      return adapter(file, opts);
    },
    recommendAromas,
    recommendDifusor,
    buildDesignerPrompt,
    buildOutput,
    schemaValidate,
    // helpers expuestos para UI
    mockProfiles: MOCK_PROFILES
  };
})(window);
