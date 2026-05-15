/* global window */
// =============================================================
// scent-iq-vision-claude.js · ronda 6
//
// Adapter del cotizador que conecta el Scent Advisor con un Edge
// Function de Vercel que llama a Claude Sonnet Vision. La API key
// vive como secret server side; este archivo NUNCA la toca.
//
// Se carga DESPUÉS de scent-iq-engines.js y scent-iq-knowledge.js
// para:
//   1. Registrar W.OLF_IA.visionAdapters.claude.
//   2. Aliasar W.OLF_IA.catalog (getter) y setCatalog/resetCatalog
//      contra OLF_KNOW (que es donde vive el array real).
//   3. Construir dos resúmenes que viajan al proxy:
//        · catalogoResumen   · enriquecido con TIPO A + TIPO B
//                              publicable (sin notas_internas_tony).
//        · foundationsResumen · reglas más operativas + mapeos
//                              5 sentidos + contraindicaciones por
//                              contexto, leídas de OLF_KNOW.foundations.
//
// Entradas del cliente:
//   · file               File | null       imagen subida (opcional)
//   · opts.tipoDeEspacio string             id del dropdown (spa,
//                                           hotel, oficina, ...)
//   · opts.override      { familia_visual?, materialidad?, tipo_de_luz? }
//
// Persistencia (gestionada por el panel Admin):
//   · localStorage.olfativa.visionAdapter     'mock' | 'claude'
//   · localStorage.olfativa.visionWorkerUrl   URL del endpoint Vercel
//   · localStorage.olfativa.catalogOverrides  catálogo editado por Tony
// =============================================================

(function (W) {
  W.OLF_IA = W.OLF_IA || {};
  W.OLF_IA.visionAdapters = W.OLF_IA.visionAdapters || {};

  // ------------------------------------------------------------
  // Bridge OLF_IA.catalog → OLF_KNOW.aromas
  // El motor (scent-iq-engines.js) lee aromas vía K.aromas =
  // OLF_KNOW.aromas. Esta capa expone la misma fuente bajo el
  // namespace público OLF_IA para que el resto de la app
  // (Admin editor, adapter Claude) trabaje contra un único punto.
  // ------------------------------------------------------------
  try {
    Object.defineProperty(W.OLF_IA, 'catalog', {
      get() { return (W.OLF_KNOW && W.OLF_KNOW.aromas) || []; },
      configurable: true,
    });
    W.OLF_IA.setCatalog = function (arr) {
      if (W.OLF_KNOW && typeof W.OLF_KNOW.setCatalog === 'function') {
        return W.OLF_KNOW.setCatalog(arr);
      }
      throw new Error('OLF_KNOW.setCatalog no disponible · carga scent-iq-knowledge.js antes.');
    };
    W.OLF_IA.resetCatalog = function () {
      if (W.OLF_KNOW && typeof W.OLF_KNOW.resetCatalog === 'function') {
        return W.OLF_KNOW.resetCatalog();
      }
    };
  } catch (e) {
    console.warn('[scent-iq] no se pudo definir OLF_IA.catalog:', e);
  }

  // ------------------------------------------------------------
  // Helpers · valor efectivo TIPO A y formato compacto
  // ------------------------------------------------------------
  function effective(aroma, fieldId) {
    if (!aroma || !aroma.tipo_a || !aroma.tipo_a[fieldId]) return null;
    const s = aroma.tipo_a[fieldId];
    if (s.valor_override !== null && s.valor_override !== undefined) return s.valor_override;
    return s.valor_sugerido;
  }
  function hasOverride(aroma, fieldId) {
    return !!(aroma && aroma.tipo_a && aroma.tipo_a[fieldId]
      && aroma.tipo_a[fieldId].valor_override !== null
      && aroma.tipo_a[fieldId].valor_override !== undefined);
  }
  function fmt(v) {
    if (v === null || v === undefined || v === '') return '—';
    if (Array.isArray(v)) {
      if (v.length === 0) return '—';
      if (typeof v[0] === 'object' && v[0] && v[0].genero) {
        return v.map(p => `${p.genero}(${p.etiqueta || 'sin_tag'})`).join(', ');
      }
      return v.join(', ');
    }
    if (typeof v === 'object') {
      if ('escala' in v && 'rango_db_sugerido' in v) {
        return `escala ${v.escala || '—'} · ${v.rango_db_sugerido || '—'}`;
      }
      try { return JSON.stringify(v); } catch (_) { return String(v); }
    }
    return String(v);
  }
  // Cuenta cuántos campos TIPO A tienen override de Tony · señal de
  // criterio humano validado. El proxy usará este número para decir
  // al modelo "priorice aromas con OVR > 0".
  function countOverrides(aroma) {
    if (!aroma || !aroma.tipo_a) return 0;
    let n = 0;
    Object.keys(aroma.tipo_a).forEach(k => { if (hasOverride(aroma, k)) n++; });
    return n;
  }

  // ------------------------------------------------------------
  // catalogoResumen · enriquecido con los 5 sentidos
  // Formato por aroma (4 líneas):
  //   1) NOMBRE | familia | sublinea | acordes | OVR:n | notas
  //   2) [OLFATO]  intensidad, persistencia, temperatura, energia
  //   2) [VISTA]   familia_visual_compat, paleta, luz, intensidad_luminica
  //   2) [TACTO]   texturas, peso_visual, densidad_textil
  //   2) [OIDO]    generos, volumen, instrumentacion, ambiente, playlist
  //   2) [GUSTO]   cocinas, sabores, bebidas, momento, maridaje
  //   2) [VOZ_TONY] a_que_huele, adjetivos, agrado, intensidad_real,
  //                 gusta, anecdotas, combos, rivales
  //   2) [CTX]     recomendado_en, evitar_en, cliente_ideal, lujo
  // notas_internas_tony NO sale jamás (privado).
  // Si superan tokens (catálogo >30 aromas), recortamos a 30 más
  // relevantes (con más overrides primero).
  // ------------------------------------------------------------
  function buildAromaBlock(a) {
    const lines = [];
    const nombre  = (a.nombre || '').trim();
    const familia = (a.familia_olfativa || a.familia || '').trim();
    const subln   = (a.sublinea || '').trim();
    const acordes = Array.isArray(a.acordes) ? a.acordes.filter(Boolean).join('+') : (a.subacorde || '');
    const ovr     = countOverrides(a);
    const notas   = a.notas || {};
    const notasStr = [notas.salida, notas.corazon, notas.fondo].filter(Boolean).join(' / ');

    lines.push(`${nombre} | ${familia} | ${subln} | acordes:${acordes} | OVR:${ovr} | notas:${notasStr}`);

    // OLFATO
    lines.push(`  [OLFATO] intensidad:${fmt(effective(a, 'intensidad_sugerida'))} · persistencia:${fmt(effective(a, 'persistencia'))} · temperatura:${fmt(effective(a, 'temperatura_emocional'))} · energia:${fmt(effective(a, 'energia'))}`);
    // VISTA
    lines.push(`  [VISTA] familia_visual:${fmt(effective(a, 'familia_visual_compatible'))} · paleta:${fmt(effective(a, 'paleta_cromatica_sugerida'))} · luz:${fmt(effective(a, 'tipo_luz_compatible'))} · intensidad_luminica:${fmt(effective(a, 'intensidad_luminica'))}`);
    // TACTO
    lines.push(`  [TACTO] texturas:${fmt(effective(a, 'texturas_compatibles'))} · peso_visual:${fmt(effective(a, 'peso_visual_mobiliario'))} · densidad_textil:${fmt(effective(a, 'densidad_textil'))}`);
    // OIDO
    lines.push(`  [OIDO] generos:${fmt(effective(a, 'generos_musicales_compatibles'))} · volumen:${fmt(effective(a, 'nivel_volumen_exacto'))} · instrumentacion:${fmt(effective(a, 'instrumentacion_predominante'))} · ambiente:${fmt(effective(a, 'ambiente_sonoro'))} · playlist:${fmt(effective(a, 'playlist_sugerida'))}`);
    // GUSTO
    lines.push(`  [GUSTO] cocinas:${fmt(effective(a, 'tipos_cocina_compatibles'))} · sabores:${fmt(effective(a, 'sabores_predominantes_compatibles'))} · bebidas:${fmt(effective(a, 'tipos_bebida_compatibles'))} · momento:${fmt(effective(a, 'momento_consumo'))} · maridaje:${fmt(effective(a, 'maridaje_conceptual'))}`);

    // VOZ DE TONY (TIPO B publicable, sin notas_internas_tony)
    const tb = a.tipo_b || {};
    const vozParts = [];
    if (tb.a_que_huele && String(tb.a_que_huele).trim())          vozParts.push(`huele:"${String(tb.a_que_huele).trim()}"`);
    if (Array.isArray(tb.adjetivos_vivenciales) && tb.adjetivos_vivenciales.length) vozParts.push(`adjetivos:${tb.adjetivos_vivenciales.join(', ')}`);
    if (tb.nivel_de_agrado_real)                                   vozParts.push(`agrado:${tb.nivel_de_agrado_real}`);
    if (tb.intensidad_real_medida != null)                         vozParts.push(`intensidad_real:${tb.intensidad_real_medida}`);
    if (tb.gusta_o_no_gusta && tb.gusta_o_no_gusta.value !== null) {
      vozParts.push(`gusta:${tb.gusta_o_no_gusta.value ? 'si' : 'no'}${tb.gusta_o_no_gusta.razon ? ' (' + tb.gusta_o_no_gusta.razon + ')' : ''}`);
    }
    if (tb.anecdotas_de_uso && String(tb.anecdotas_de_uso).trim()) vozParts.push(`anecdotas:"${String(tb.anecdotas_de_uso).trim()}"`);
    if (Array.isArray(tb.aromas_combos)  && tb.aromas_combos.length)  vozParts.push(`combos:${tb.aromas_combos.join(', ')}`);
    if (Array.isArray(tb.aromas_rivales) && tb.aromas_rivales.length) vozParts.push(`rivales:${tb.aromas_rivales.join(', ')}`);
    if (vozParts.length) lines.push(`  [VOZ_TONY] ${vozParts.join(' · ')}`);

    // CONTEXTOS Y CLIENTE
    lines.push(`  [CTX] recomendado:${fmt(effective(a, 'contextos_recomendados'))} · evitar:${fmt(effective(a, 'contextos_a_evitar'))} · cliente_ideal:${fmt(effective(a, 'tipo_cliente_ideal'))} · lujo:${fmt(effective(a, 'nivel_lujo_sugerido'))}`);

    return lines.join('\n');
  }

  function buildCatalogoResumen(opts) {
    opts = opts || {};
    const max = opts.max || 30;
    const aromas = (W.OLF_IA && W.OLF_IA.catalog) || [];
    if (!aromas.length) return '';
    // Filtro defensivo · ningún notas_internas_tony viaja jamás. Hacemos
    // una pasada explícita para asegurar que si por error está en la raíz
    // del aroma o en tipo_b, queda fuera del bloque que armamos.
    const sanitized = aromas.map(a => {
      const c = JSON.parse(JSON.stringify(a));
      if (c.tipo_b) delete c.tipo_b.notas_internas_tony;
      if ('notas_internas_tony' in c) delete c.notas_internas_tony;
      return c;
    });
    // Ranking · aromas con más overrides de Tony primero (criterio
    // humano validado · el proxy va a priorizar estos).
    const ranked = sanitized
      .map(a => ({ a, ovr: countOverrides(a) }))
      .sort((x, y) => y.ovr - x.ovr);
    const top = ranked.slice(0, max).map(({ a }) => buildAromaBlock(a));
    return top.join('\n\n');
  }
  W.OLF_IA.buildCatalogoResumen = buildCatalogoResumen;

  // ------------------------------------------------------------
  // foundationsResumen · principios científicos compactos
  //   · 20-30 reglas clave (las de confianza alta primero, luego media)
  //   · mapeos sensoriales por familia (vista/tacto/oído/gusto)
  //   · contraindicaciones por contexto
  // Se prepende al system prompt como bloque "PRINCIPIOS OLFATIVA".
  // ------------------------------------------------------------
  function buildFoundationsResumen(opts) {
    opts = opts || {};
    const F = (W.OLF_KNOW && W.OLF_KNOW.foundations) || null;
    if (!F) return '';
    const maxReglas = opts.maxReglas || 24;
    const parts = [];

    if (F.meta && F.meta.version) {
      parts.push(`# Foundations v${F.meta.version} · marco 5 sentidos · base universal (Cotizador B2B + Olfativa Home).`);
    }

    // Reglas operativas · alta primero, luego media. Saltamos baja
    // y la regla default (R040).
    if (Array.isArray(F.reglas_psicoaromacologia)) {
      const rank = { alta: 3, media: 2, baja: 1 };
      const reglas = F.reglas_psicoaromacologia
        .filter(r => r.si !== 'default' && r.confianza !== 'baja')
        .sort((a, b) => (rank[b.confianza] || 0) - (rank[a.confianza] || 0))
        .slice(0, maxReglas);
      if (reglas.length) {
        parts.push('## Reglas operativas (las más fuertes primero · confianza alta/media):');
        reglas.forEach(r => {
          const recom = Array.isArray(r.recomendado_en) && r.recomendado_en.length ? ` · recomendado_en: ${r.recomendado_en.slice(0, 4).join(', ')}` : '';
          const evit  = Array.isArray(r.evitar_en) && r.evitar_en.length ? ` · evitar_en: ${r.evitar_en.slice(0, 4).join(', ')}` : '';
          parts.push(`  - ${r.id} [${r.confianza}] si ${r.si}${recom}${evit}`);
        });
      }
    }

    // Mapeos sensoriales · resumen por familia olfativa
    const M = F.mapeos_sensoriales_5sentidos || {};
    if (M.familia_to_vista) {
      parts.push('## Vista por familia olfativa (familia_visual · luz · intensidad lumínica):');
      M.familia_to_vista.forEach(e => {
        parts.push(`  - ${e.familia}: visual=${(e.familias_visuales || []).join('/')} · luz=${(e.luz || []).join('/')} · ${e.intensidad_luminica || ''}`);
      });
    }
    if (M.familia_to_tacto) {
      parts.push('## Tacto por familia:');
      M.familia_to_tacto.forEach(e => {
        parts.push(`  - ${e.familia}: texturas=${(e.texturas || []).join('/')} · peso=${e.peso || ''} · densidad=${e.densidad || ''}`);
      });
    }
    if (M.familia_to_oido) {
      parts.push('## Oído por familia (géneros · volumen · ambiente):');
      M.familia_to_oido.forEach(e => {
        const vol = e.volumen ? `escala ${e.volumen.escala} ${e.volumen.rango_db_sugerido}` : '';
        parts.push(`  - ${e.familia}: ${(e.generos || []).slice(0, 4).join('/')} · ${vol} · ${e.ambiente || ''}`);
      });
    }
    if (M.familia_to_gusto) {
      parts.push('## Gusto por familia (cocinas · bebidas · momento):');
      M.familia_to_gusto.forEach(e => {
        if (!e.gastronomica && (!e.bebida || !e.bebida.length)) return;
        parts.push(`  - ${e.familia}${e.gastronomica ? ' (gastro)' : ' (ambiental)'}: cocinas=${(e.cocinas || []).join('/')} · bebidas=${(e.bebida || []).join('/')} · momento=${e.momento || ''}`);
      });
    }

    // Contraindicaciones por contexto
    if (Array.isArray(F.contraindicaciones_por_contexto) && F.contraindicaciones_por_contexto.length) {
      parts.push('## Contraindicaciones por contexto:');
      F.contraindicaciones_por_contexto.forEach(c => {
        const ev = (c.evitar_familias || []).slice(0, 4).join(', ');
        const pr = (c.preferir_familias || []).slice(0, 3).join(', ');
        parts.push(`  - ${c.contexto} [${c.confianza}]: EVITAR ${ev}${pr ? ` · PREFERIR ${pr}` : ''}`);
      });
    }

    return parts.join('\n');
  }
  W.OLF_IA.buildFoundationsResumen = buildFoundationsResumen;

  // ------------------------------------------------------------
  // Adapter Claude
  // ------------------------------------------------------------
  W.OLF_IA.visionAdapters.claude = async function (file, opts) {
    const url = (localStorage.getItem('olfativa.visionWorkerUrl') || '').trim();
    if (!url) {
      throw new Error('Worker URL no configurada en Admin · pega la URL del Worker en Integración de visión.');
    }

    const fd = new FormData();
    if (file) fd.append('image', file);
    if (opts && opts.tipoDeEspacio) fd.append('tipoDeEspacio', opts.tipoDeEspacio);
    if (opts && opts.override) {
      try { fd.append('override', JSON.stringify(opts.override)); } catch (_) {}
    }
    // Catálogo vigente · prompt-side hint enriquecido con los 5 sentidos
    // (TIPO A + TIPO B publicable). notas_internas_tony filtrado.
    const catalogoResumen = buildCatalogoResumen();
    if (catalogoResumen) fd.append('catalogoResumen', catalogoResumen);
    // Principios científicos · reglas + mapeos + contraindicaciones.
    const foundationsResumen = buildFoundationsResumen();
    if (foundationsResumen) fd.append('foundationsResumen', foundationsResumen);

    let r;
    try {
      r = await fetch(url, { method: 'POST', body: fd });
    } catch (e) {
      throw new Error('No se pudo contactar al Worker · revisa la URL y CORS (' + (e && e.message || e) + ')');
    }

    if (!r.ok) {
      // El Worker responde 502 con { error, fallback }. Si recibimos
      // fallback usable, lo devolvemos marcado para que el ejecutivo
      // siga teniendo análisis y vea en el slide la nota de estimado.
      let body = null;
      try { body = await r.json(); } catch (_) {}
      if (body && body.fallback) {
        return {
          ...body.fallback,
          _source: body.fallback._source || 'fallback-deterministic',
          _warning: 'Vision real falló (' + r.status + '). Usamos fallback determinista del giro.',
        };
      }
      throw new Error('vision proxy falló · HTTP ' + r.status);
    }

    const data = await r.json();
    return { ...data, _source: data._source || 'claude-vision' };
  };
})(window);
