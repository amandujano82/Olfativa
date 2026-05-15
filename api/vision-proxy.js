// =============================================================
// Vercel Edge Function · /api/vision-proxy
// Proxy entre el cotizador Olfativa (front estático en GitHub Pages /
// Vercel) y la Anthropic Messages API (Claude 3.5 Sonnet Vision).
//
// La API key vive como secret server side en process.env.ANTHROPIC_API_KEY.
// El front nunca la ve.
//
// Endpoint: POST /api/vision-proxy con multipart/form-data
//   · image          (File)   PNG/JPG/WEBP, máx 5 MB. Opcional si solo
//                              quieres análisis derivado del giro.
//   · tipoDeEspacio  (string) id del dropdown del Scent Advisor
//                              (spa, hotel, boutique, bar,
//                              restaurante, oficina, retail,
//                              showroom, clinica, gym, residencia).
//   · override       (JSON)   { familia_visual?, materialidad?,
//                              tipo_de_luz? } — se aplica encima
//                              de la respuesta del modelo.
//
// Respuesta 200: JSON con el shape que espera scent-iq-engines
//                (campos del MOCK_PROFILES + _source: 'claude-vision').
// Respuesta 502: { error, fallback } con perfil determinista según
//                el mapeo de la ronda 3 (mismo profileIndex).
//
// Despliegue: ver docs/integracion-vision-real.md.
// =============================================================

export const config = {
  runtime: 'edge',
  // Region cercana al usuario en MX/US (iad1 = us-east-1, sfo1 = us-west).
  regions: ['iad1'],
};

// Snapshot vigente de Anthropic con visión. Si Anthropic publica un alias
// más reciente, cambiar AQUI · no esparcir el ID por el archivo.
// claude-3-5-sonnet-* fue deprecado y devolvía 404 not_found_error con
// las keys nuevas a partir de mayo 2026.
const ANTHROPIC_MODEL = 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';

// CORS · permite GitHub Pages, el propio dominio Vercel y localhost
const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

// ----- Enums permitidos (deben caer en el set del catálogo Olfativa)
const FAMILIAS_VISUALES = [
  'organico_biophilic',
  'minimalista_calmo',
  'industrial_urbano',
  'glam_nocturno',
  'costero_tropical',
  'bohemio_mexicano',
  'quiet_luxury',
  'contemporaneo_neutro',
];
const TIPOS_LUZ = [
  'luz calida difusa',
  'luz natural luminosa',
  'luz neutra',
  'luz fria contrastada',
  'luz dramatica puntual',
];
const SATURACIONES    = ['baja', 'media', 'alta'];
const CONTRASTES      = ['bajo', 'medio', 'alto'];
const DENSIDADES      = ['baja', 'media', 'alta'];
const NIVELES_PREMIUM = ['medio', 'medio alto', 'alto'];
const GEOMETRIAS      = ['curvas', 'angular', 'mixta'];
const PRESENCIA_NAT   = ['baja', 'media', 'alta'];

// Mapeo determinista giro -> perfil fallback (mismo de la ronda 3).
function buildFallback(fv, luz, sat, con, den, prem, geo, nat, tipo) {
  return {
    familia_visual: fv,
    familia_visual_secundaria: '',
    tipo_de_luz: luz,
    temperatura_visual: '',
    paleta_dominante: '',
    saturacion: sat,
    contraste: con,
    materialidad: '',
    materiales_principales: [],
    formas: '',
    geometria: geo,
    densidad: den,
    nivel_premium: prem,
    presencia_naturaleza: nat,
    tipo_de_espacio: tipo,
    emocion_actual: '',
    emocion_deseada: '',
    m2_estimados: 80,
    altura_estimada_m: 3.0,
  };
}
const SPACE_FALLBACK = {
  'spa':         buildFallback('organico_biophilic', 'luz calida difusa',     'media', 'medio', 'media', 'medio alto', 'curvas',  'media', 'spa wellness'),
  'hotel':       buildFallback('quiet_luxury',       'luz calida difusa',     'baja',  'medio', 'media', 'alto',       'mixta',   'baja',  'hotel lobby quiet luxury'),
  'boutique':    buildFallback('costero_tropical',   'luz natural luminosa',  'media', 'medio', 'baja',  'medio alto', 'curvas',  'alta',  'boutique costero resort'),
  'bar':         buildFallback('industrial_urbano',  'luz dramatica puntual', 'alta',  'alto',  'alta',  'medio alto', 'angular', 'baja',  'bar lounge nightlife'),
  'restaurante': buildFallback('bohemio_mexicano',   'luz calida difusa',     'alta',  'medio', 'alta',  'medio',      'mixta',   'media', 'restaurante bohemio mexicano'),
  'oficina':     buildFallback('quiet_luxury',       'luz neutra',            'baja',  'medio', 'media', 'medio alto', 'angular', 'baja',  'oficina corporativa'),
  'retail':      buildFallback('bohemio_mexicano',   'luz natural luminosa',  'media', 'medio', 'media', 'medio alto', 'mixta',   'baja',  'retail moda'),
  'showroom':    buildFallback('quiet_luxury',       'luz dramatica puntual', 'baja',  'alto',  'baja',  'alto',       'angular', 'baja',  'showroom premium'),
  'clinica':     buildFallback('minimalista_calmo',  'luz neutra',            'baja',  'bajo',  'baja',  'medio alto', 'mixta',   'baja',  'clinica estetica'),
  'gym':         buildFallback('minimalista_calmo',  'luz natural luminosa',  'media', 'medio', 'media', 'medio',      'angular', 'baja',  'gym estudio'),
  'residencia':  buildFallback('quiet_luxury',       'luz calida difusa',     'baja',  'medio', 'media', 'alto',       'mixta',   'media', 'residencia premium'),
};

// ----- Prompt rígido (Entregable 2)
// Si recibimos `catalogoResumen` lo prependemos como bloque
// CATALOGO DISPONIBLE para que el modelo entienda el universo real
// de aromas de Tony y no aluciné nombres genéricos.
// Si recibimos `foundationsResumen` lo prependemos ANTES del catálogo
// como bloque PRINCIPIOS OLFATIVA para que el modelo razone con las
// reglas científicas (psicoaromacología, mapeos 5 sentidos,
// contraindicaciones por contexto). Schema de respuesta no cambia.
function buildPrompt(tipoDeEspacio, catalogoResumen, foundationsResumen) {
  const parts = [];

  if (foundationsResumen && foundationsResumen.trim().length > 0) {
    parts.push('PRINCIPIOS OLFATIVA · base científica que rige el match aroma↔espacio.');
    parts.push('Esta base es UNIVERSAL: alimenta hoy el Cotizador B2B y mañana Olfativa Home residencial.');
    parts.push('Usa estas reglas para razonar coherencia sensorial completa en los 5 sentidos (olfato, vista, tacto, oído, gusto).');
    parts.push('');
    parts.push(foundationsResumen.trim());
    parts.push('');
  }

  if (catalogoResumen && catalogoResumen.trim().length > 0) {
    parts.push('CATALOGO DISPONIBLE · universo real de aromas de Olfativa con los 5 sentidos por aroma.');
    parts.push('Cada aroma trae bloques [OLFATO] [VISTA] [TACTO] [OIDO] [GUSTO] [VOZ_TONY] [CTX]. El campo `OVR:n` indica cuántos campos sobreescribió Tony manualmente · OVR > 0 significa criterio humano validado por el experto.');
    parts.push('');
    parts.push(catalogoResumen.trim());
    parts.push('');
    parts.push('Reglas de uso del catálogo:');
    parts.push('  · Elige aromas únicamente de este catálogo. No inventes nombres.');
    parts.push('  · PRIORIZA aromas con OVR > 0 (override de Tony) por sobre los que solo tienen sugerencia automática · el override = criterio humano validado.');
    parts.push('  · Respeta `[CTX] evitar` de cada aroma · si el espacio del análisis cae en uno, descarta el aroma.');
    parts.push('  · Cruza los 5 sentidos del aroma con la foto: olfato (familia ↔ emoción), vista (familia_visual y luz coinciden con paleta detectada), tacto (texturas del aroma coinciden con materialidad de la foto), oído (energía del aroma coincide con ritmo esperado del espacio), gusto (solo si es restaurante/bar/cafetería).');
    parts.push('  · Aplica los PRINCIPIOS OLFATIVA arriba: contraindicaciones por contexto son DURAS (clínica, guardería, restaurante savory, dormitorio, oficina foco, spa, bar nocturno).');
    parts.push('  · Si ningún aroma del catálogo encaja bien, elige el más neutro disponible y marca `confianza_aroma: "baja"`.');
    parts.push('  · En el JSON de salida incluye `aroma_sugerido_nombre` con el NOMBRE exacto del aroma elegido y `justificacion_5_sentidos` (objeto con 5 strings cortos: olfato, vista, tacto, oido, gusto · puede ser "" si no aplica al espacio).');
    parts.push('');
  }

  parts.push('Eres un analista visual del Olfativa Sensory System. Tu tarea es leer la foto del espacio comercial o residencial y devolver SOLO un objeto JSON válido sin texto adicional.');
  parts.push('');
  parts.push('Debes elegir valores de los enums permitidos.');
  parts.push('');
  parts.push('familia_visual debe ser una de estas 8: organico_biophilic, minimalista_calmo, industrial_urbano, glam_nocturno, costero_tropical, bohemio_mexicano, quiet_luxury, contemporaneo_neutro.');
  parts.push('tipo_de_luz una de: luz calida difusa, luz natural luminosa, luz neutra, luz fria contrastada, luz dramatica puntual.');
  parts.push('saturacion una de: baja, media, alta.');
  parts.push('contraste una de: bajo, medio, alto.');
  parts.push('densidad una de: baja, media, alta.');
  parts.push('nivel_premium una de: medio, medio alto, alto.');
  parts.push('geometria una de: curvas, angular, mixta.');
  parts.push('presencia_naturaleza una de: baja, media, alta.');
  parts.push('');
  parts.push('Otros campos texto libre corto:');
  parts.push('  · materialidad (frase corta de 3 a 6 palabras)');
  parts.push('  · materiales_principales (array de hasta 4 strings)');
  parts.push('  · formas (frase corta)');
  parts.push('  · tipo_de_espacio (frase corta inferida de la foto)');
  parts.push('  · emocion_actual (frase corta)');
  parts.push('  · emocion_deseada (frase corta)');
  parts.push('  · m2_estimados (número entero entre 20 y 500)');
  parts.push('  · altura_estimada_m (número entre 2.4 y 6.0)');
  if (catalogoResumen && catalogoResumen.trim().length > 0) {
    parts.push('  · aroma_sugerido_nombre (string · NOMBRE exacto del catálogo)');
    parts.push('  · confianza_aroma (string · "alta" | "media" | "baja")');
    parts.push('  · justificacion_5_sentidos (objeto · { olfato:string, vista:string, tacto:string, oido:string, gusto:string }). Cada string corto · "" si no aplica al tipo de espacio (por ejemplo gusto en oficina).');
  }
  parts.push('');
  parts.push('Contexto de uso: el usuario del cotizador es ejecutivo de cuenta de Olfativa, una marca de aromatización profesional. Subió esta foto del espacio del cliente.');
  parts.push(`Adicionalmente el ejecutivo indicó que el tipo de espacio es: ${tipoDeEspacio || 'no especificado'}.`);
  parts.push('Considera ese tipo como ancla principal. La foto sirve para refinar materialidad, luz, paleta y emoción.');
  parts.push('');
  parts.push('Devuelve SOLO el JSON. No expliques.');

  return parts.join('\n');
}

// ----- Validación / saneamiento de enums
function pickEnum(value, allowed, fallback) {
  if (typeof value !== 'string') return fallback;
  const v = value.toLowerCase().trim();
  if (allowed.includes(v)) return v;
  const hit = allowed.find(a => v.includes(a) || a.includes(v));
  return hit || fallback;
}

function clampInt(v, min, max, fb) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fb;
  return Math.max(min, Math.min(max, n));
}
function clampFloat(v, min, max, fb) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fb;
  return Math.max(min, Math.min(max, n));
}

function sanitizeAnalisis(raw, tipoDeEspacio) {
  const fb = SPACE_FALLBACK[tipoDeEspacio] || SPACE_FALLBACK['oficina'];
  return {
    familia_visual:            pickEnum(raw.familia_visual,            FAMILIAS_VISUALES, fb.familia_visual),
    familia_visual_secundaria: typeof raw.familia_visual_secundaria === 'string' ? raw.familia_visual_secundaria : '',
    tipo_de_luz:               pickEnum(raw.tipo_de_luz,               TIPOS_LUZ,         fb.tipo_de_luz),
    temperatura_visual:        typeof raw.temperatura_visual === 'string' ? raw.temperatura_visual : '',
    paleta_dominante:          typeof raw.paleta_dominante === 'string' ? raw.paleta_dominante : '',
    saturacion:                pickEnum(raw.saturacion,                SATURACIONES,      fb.saturacion),
    contraste:                 pickEnum(raw.contraste,                 CONTRASTES,        fb.contraste),
    materialidad:              typeof raw.materialidad === 'string' ? raw.materialidad : '',
    materiales_principales:    Array.isArray(raw.materiales_principales) ? raw.materiales_principales.slice(0, 4).map(String) : [],
    formas:                    typeof raw.formas === 'string' ? raw.formas : '',
    geometria:                 pickEnum(raw.geometria,                 GEOMETRIAS,        fb.geometria),
    densidad:                  pickEnum(raw.densidad,                  DENSIDADES,        fb.densidad),
    nivel_premium:             pickEnum(raw.nivel_premium,             NIVELES_PREMIUM,   fb.nivel_premium),
    presencia_naturaleza:      pickEnum(raw.presencia_naturaleza,      PRESENCIA_NAT,     fb.presencia_naturaleza),
    tipo_de_espacio:           typeof raw.tipo_de_espacio === 'string' && raw.tipo_de_espacio
                                 ? raw.tipo_de_espacio : fb.tipo_de_espacio,
    emocion_actual:            typeof raw.emocion_actual === 'string' ? raw.emocion_actual : '',
    emocion_deseada:           typeof raw.emocion_deseada === 'string' ? raw.emocion_deseada : '',
    m2_estimados:              clampInt(raw.m2_estimados, 20, 500, fb.m2_estimados),
    altura_estimada_m:         clampFloat(raw.altura_estimada_m, 2.4, 6.0, fb.altura_estimada_m),
  };
}

// ----- Override manual del ejecutivo (familia, materialidad, luz)
function applyOverride(analisis, override) {
  if (!override || typeof override !== 'object') return analisis;
  const out = { ...analisis };
  if (override.familia_visual && FAMILIAS_VISUALES.includes(override.familia_visual)) {
    out.familia_visual = override.familia_visual;
  }
  if (typeof override.materialidad === 'string' && override.materialidad.trim()) {
    out.materialidad = override.materialidad.trim();
  }
  if (override.tipo_de_luz) {
    const luz = pickEnum(override.tipo_de_luz, TIPOS_LUZ, null);
    if (luz) out.tipo_de_luz = luz;
  }
  return out;
}

// ----- Conversión image File → base64 (chunks por límite de stack de btoa)
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function mediaTypeFor(file) {
  const t = (file && file.type) || '';
  if (t === 'image/png')  return 'image/png';
  if (t === 'image/jpeg') return 'image/jpeg';
  if (t === 'image/webp') return 'image/webp';
  if (t === 'image/gif')  return 'image/gif';
  return 'image/jpeg';
}

// ----- Llamada a Anthropic Messages API
async function callClaude(apiKey, imageBase64, mediaType, prompt) {
  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...(imageBase64
            ? [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } }]
            : []),
          { type: 'text', text: prompt },
        ],
      },
    ],
  };

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type':      'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`Anthropic ${r.status}: ${txt.slice(0, 300)}`);
  }

  const json = await r.json();
  return (json.content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
    .trim();
}

// Extrae el primer bloque JSON razonable del texto del modelo.
function parseModelJson(text) {
  if (!text) throw new Error('Modelo devolvió texto vacío');
  try { return JSON.parse(text); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch (_) {}
  }
  const first = text.indexOf('{');
  const last  = text.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(text.slice(first, last + 1)); } catch (_) {}
  }
  throw new Error('No se pudo parsear JSON del modelo');
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

// ----- Handler principal
export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let formData;
  try { formData = await request.formData(); }
  catch (_) {
    return jsonResponse({ error: 'multipart/form-data inválido' }, 400);
  }

  const image = formData.get('image');
  const tipoDeEspacio = (formData.get('tipoDeEspacio') || '').toString().trim().toLowerCase();
  // Catálogo vivo del cliente · si viene, se prepende al prompt como
  // bloque CATALOGO DISPONIBLE para que el modelo no aluciné aromas.
  const catalogoResumen = (formData.get('catalogoResumen') || '').toString();
  // Principios científicos (foundations.json compactado) · si viene,
  // se prepende como PRINCIPIOS OLFATIVA al system prompt.
  const foundationsResumen = (formData.get('foundationsResumen') || '').toString();
  let override = null;
  const overrideRaw = formData.get('override');
  if (overrideRaw) {
    try { override = JSON.parse(overrideRaw.toString()); }
    catch (_) { /* ignorar override mal formado */ }
  }

  // Validación de tamaño · 5 MB
  if (image && typeof image === 'object' && image.size > 5 * 1024 * 1024) {
    return jsonResponse({ error: 'imagen > 5 MB' }, 413);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return jsonResponse({
      error: 'Vercel sin ANTHROPIC_API_KEY configurada',
      fallback: applyOverride(SPACE_FALLBACK[tipoDeEspacio] || SPACE_FALLBACK['oficina'], override),
    }, 502);
  }

  let imageBase64 = null;
  let mediaType = 'image/jpeg';
  if (image && typeof image === 'object' && image.size > 0) {
    try {
      imageBase64 = await fileToBase64(image);
      mediaType = mediaTypeFor(image);
    } catch (_) {
      return jsonResponse({ error: 'no se pudo leer la imagen' }, 400);
    }
  }

  const prompt = buildPrompt(tipoDeEspacio, catalogoResumen, foundationsResumen);

  try {
    const modelText = await callClaude(process.env.ANTHROPIC_API_KEY, imageBase64, mediaType, prompt);
    const raw = parseModelJson(modelText);
    const sane = sanitizeAnalisis(raw, tipoDeEspacio);
    const final = applyOverride(sane, override);
    final._source = 'claude-vision';
    // Sugerencia de aroma del modelo (solo si llegó catálogo y el modelo
    // respondió aroma_sugerido_nombre · validación que esté en el catálogo
    // ocurre en el cliente porque el proxy no tiene la lista, solo el
    // resumen compacto). confianza_aroma se usa para teñir el slide.
    const aromaPick = typeof raw.aroma_sugerido_nombre === 'string' ? raw.aroma_sugerido_nombre.trim() : '';
    const confianza = typeof raw.confianza_aroma === 'string' ? raw.confianza_aroma.trim().toLowerCase() : '';
    // Justificación 5 sentidos (opcional · solo si llegó catálogo).
    // Saneamos a un objeto con 5 strings cortos para no romper el
    // contrato con cotizador.html.
    let just5 = null;
    if (raw && typeof raw.justificacion_5_sentidos === 'object' && raw.justificacion_5_sentidos) {
      const j = raw.justificacion_5_sentidos;
      const str = (v) => (typeof v === 'string' ? v.slice(0, 240) : '');
      just5 = {
        olfato: str(j.olfato),
        vista:  str(j.vista),
        tacto:  str(j.tacto),
        oido:   str(j.oido),
        gusto:  str(j.gusto),
      };
    }
    final._meta = {
      model: ANTHROPIC_MODEL,
      tipo_de_espacio_input: tipoDeEspacio || null,
      had_image: !!imageBase64,
      override_applied: !!override && Object.keys(override).length > 0,
      catalog_injected: catalogoResumen.trim().length > 0,
      foundations_injected: foundationsResumen.trim().length > 0,
      modelo_aroma_sugerido: aromaPick || null,
      confianza_aroma: ['alta','media','baja'].includes(confianza) ? confianza : null,
      justificacion_5_sentidos: just5,
    };
    return jsonResponse(final, 200);
  } catch (e) {
    // El detalle real (status + body de Anthropic) queda solo en Vercel
    // Logs. El cliente recibe un mensaje genérico para no filtrar key
    // expirada, modelos exactos, ni payloads de upstream.
    console.error('[vision-proxy] upstream/parse error:', (e && e.stack) || e);
    const fallback = applyOverride(
      SPACE_FALLBACK[tipoDeEspacio] || SPACE_FALLBACK['oficina'],
      override
    );
    fallback._source = 'fallback-deterministic';
    fallback._meta = {
      tipo_de_espacio_input: tipoDeEspacio || null,
      had_image: !!imageBase64,
      override_applied: !!override && Object.keys(override).length > 0,
      error: 'upstream rechazó la imagen · revisa modelo o key',
    };
    return jsonResponse({ error: 'vision upstream falló', fallback }, 502);
  }
}
