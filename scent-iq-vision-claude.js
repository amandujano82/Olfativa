/* global window */
// =============================================================
// scent-iq-vision-claude.js
//
// Adapter del cotizador que conecta el Scent Advisor con un Worker
// proxy de Cloudflare que llama a Claude 3.5 Sonnet Vision. La API
// key vive como secret server side; este archivo NUNCA la toca.
//
// Se carga DESPUÉS de scent-iq-engines.js para registrar la entrada
// `claude` en W.OLF_IA.visionAdapters. Se activa cuando el ejecutivo
// elige "Claude Vision real" en el panel Admin del cotizador
// (y la URL del Worker se guarda en localStorage).
//
// Entradas del cliente:
//   · file              File | null       imagen subida (opcional)
//   · opts.tipoDeEspacio string             id del dropdown (spa,
//                                           hotel, oficina, ...)
//   · opts.override     { familia_visual?, materialidad?, tipo_de_luz? }
//
// Persistencia (gestionada por el panel Admin):
//   · localStorage.olfativa.visionAdapter   'mock' | 'claude'
//   · localStorage.olfativa.visionWorkerUrl URL del Worker desplegado
// =============================================================

(function (W) {
  W.OLF_IA = W.OLF_IA || {};
  W.OLF_IA.visionAdapters = W.OLF_IA.visionAdapters || {};

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
