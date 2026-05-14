/* global window */
// =============================================================
// scent-iq-vision-claude.js
//
// Adapter del cotizador que conecta el Scent Advisor con un Edge
// Function de Vercel que llama a Claude Sonnet Vision. La API key
// vive como secret server side; este archivo NUNCA la toca.
//
// Se carga DESPUÉS de scent-iq-engines.js para:
//   1. Registrar W.OLF_IA.visionAdapters.claude.
//   2. Aliasar W.OLF_IA.catalog (getter) y setCatalog/resetCatalog
//      contra OLF_KNOW (que es donde vive el array real).
//
// Entradas del cliente:
//   · file              File | null       imagen subida (opcional)
//   · opts.tipoDeEspacio string             id del dropdown (spa,
//                                           hotel, oficina, ...)
//   · opts.override     { familia_visual?, materialidad?, tipo_de_luz? }
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
  // Resumen compacto del catálogo · se inyecta al prompt del modelo
  // como bloque CATALOGO DISPONIBLE para guiar la lectura y evitar
  // que aluciné aromas que no existen.
  // Formato por línea (1 aroma): NOMBRE | familia | subacorde |
  //   ctx_si: ... | ctx_no: ... | visual: ...
  // Máx 30 aromas (limita tokens en prompt).
  // ------------------------------------------------------------
  function buildCatalogoResumen() {
    const aromas = (W.OLF_IA && W.OLF_IA.catalog) || [];
    if (!aromas.length) return '';
    return aromas.slice(0, 30).map(a => {
      const nombre  = (a.nombre || '').toString().trim();
      const familia = (a.familia_olfativa || a.familia || '').toString().trim();
      const subac   = (a.subacorde || (Array.isArray(a.acordes) ? a.acordes.join('+') : '')).toString().trim();
      const ctxOk   = Array.isArray(a.contextos_recomendados) ? a.contextos_recomendados.filter(Boolean).join(', ') : '';
      const ctxNo   = Array.isArray(a.contextos_a_evitar)     ? a.contextos_a_evitar.filter(Boolean).join(', ')     : '';
      const tagsVis = Array.isArray(a.tags_visuales)          ? a.tags_visuales.filter(Boolean).join(', ')          : '';
      return `${nombre} | ${familia} | ${subac} | ctx_si: ${ctxOk} | ctx_no: ${ctxNo} | visual: ${tagsVis}`;
    }).join('\n');
  }
  W.OLF_IA.buildCatalogoResumen = buildCatalogoResumen;

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
    // Catálogo vigente · prompt-side hint para que el modelo elija
    // dentro del set real de aromas (anti-alucinación).
    const catalogoResumen = buildCatalogoResumen();
    if (catalogoResumen) fd.append('catalogoResumen', catalogoResumen);

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
