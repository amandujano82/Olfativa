# Integración de visión real · Claude 3.5 Sonnet Vision vía Vercel

El cotizador Olfativa puede pasar de su mock determinista a vision real
de Claude 3.5 Sonnet **sin que la API key viva en el navegador**. El
endpoint `/api/vision-proxy.js` (Vercel Edge Function) recibe la foto
del Scent Advisor, llama a la Anthropic Messages API con la key como
secret server side y devuelve el JSON normalizado que espera
`scent-iq-engines.js`.

> Esta guía está pensada para que **Tony la ejecute manualmente**.
> Claude no toca la API key en ningún momento.

---

## 1 · Importar el repo a Vercel

1. Entra a [vercel.com](https://vercel.com/) con la cuenta ya existente.
2. Click **Add New → Project**.
3. Selecciona **Import Git Repository** y busca
   `amandujano82/Olfativa`. Autoriza el acceso si Vercel te lo pide.

## 2 · Configurar la variable de entorno (API key)

En la pantalla de configuración del deploy, **antes de hacer Deploy**:

1. Expande **Environment Variables**.
2. Crea una nueva variable:
   - **Name** · `ANTHROPIC_API_KEY`
   - **Value** · `sk-ant-...` (tu key real de [console.anthropic.com](https://console.anthropic.com/))
   - **Environments** · marca **Production**, **Preview** y **Development**.

> La variable se guarda como secret. El front nunca la ve; solo el
> Edge Function la lee vía `process.env.ANTHROPIC_API_KEY`.

## 3 · Deploy

1. Click **Deploy**.
2. Espera ~1 minuto al primer deploy. Vercel detecta automáticamente
   el archivo `api/vision-proxy.js` y lo despliega como Edge Function.
3. Cuando termine, copia la URL del deploy. Será algo como:
   ```
   https://olfativa.vercel.app
   ```

El endpoint final del proxy es esa URL **+ `/api/vision-proxy`**:

```
https://olfativa.vercel.app/api/vision-proxy
```

## 4 · Conectar el cotizador al proxy

1. Abre el cotizador en
   `https://amandujano82.github.io/Olfativa/cotizador.html?nocache=20`
   con password **olfativa2026**.
2. Click en **Admin** (top bar).
3. Hasta abajo del modal verás la nueva sección
   **Integración de visión**.
4. Pega la URL completa del endpoint en **URL del Worker**.
5. Selecciona el radio **Claude Vision real**.
6. Click **Guardar integración**. El cotizador deja `mock` o `claude`
   en `localStorage.olfativa.visionAdapter` y persiste la URL en
   `localStorage.olfativa.visionWorkerUrl`.

## 5 · Probar end-to-end

1. Cierra Admin. Click **Scent Advisor** en el top bar.
2. En el dropdown **Tipo de espacio** elige *Oficina corporativa*.
3. Sube una foto real de una oficina (PNG/JPG, < 5 MB).
4. El análisis debe leer la oficina correctamente —
   `familia_visual: contemporaneo_neutro` o `quiet_luxury`, no más
   *Costero tropical boutique costera*.
5. El recuadro **Override visual del especialista** sigue disponible
   si quieres corregir manualmente la lectura.

---

## Troubleshooting

### El cotizador dice "Worker URL no configurada en Admin"
Vuelve a Admin → Integración de visión, pega la URL del Worker
completa (con `https://` y `/api/vision-proxy`) y click *Guardar*.

### El cotizador dice "vision proxy falló · HTTP 502"
El Edge Function recibió la petición pero Anthropic devolvió error.
El proxy ya devuelve un *fallback determinista* basado en el giro
elegido, así que el flujo no se rompe. Para diagnosticar:

1. En Vercel → tu proyecto → **Logs** verás el error original.
2. Causas comunes:
   - `ANTHROPIC_API_KEY` mal copiada o expirada.
   - Cuota de Anthropic agotada (sube plan o billing).
   - Imagen corrupta o > 5 MB.

### El cotizador no llega ni al Worker (CORS / Network error)
1. Comprueba que la URL en Admin sea exactamente la que Vercel mostró
   en el deploy + `/api/vision-proxy`.
2. Si tu front corre en otro dominio (no GitHub Pages), Vercel ya
   responde `Access-Control-Allow-Origin: *` desde `vercel.json`.

### Quiero volver al mock
En Admin → Integración de visión, selecciona el radio
**Mock determinista**. El cotizador vuelve al adapter local
(`scent-iq-engines.js`) sin redeploy.

---

## Reglas del proyecto

- `scent-iq-engines.js` **NO** se modifica nunca. El adapter `claude`
  se registra desde `scent-iq-vision-claude.js` con
  `W.OLF_IA.visionAdapters.claude = ...`.
- `scent-iq-knowledge.js` **NO** se modifica nunca. El proxy reusa
  el mismo conjunto de 8 familias visuales que el catálogo.
- La API key de Anthropic vive solo en Vercel como secret. Si en
  algún momento aparece hardcodeada en el repo, hay que rotarla
  inmediatamente en Anthropic Console y reconfigurar Vercel.
- Región del Edge Function: `iad1` (US East). Si Tony quiere baja
  latencia desde MX, alternativa es `sfo1` (San Francisco). Editar
  en `api/vision-proxy.js` → `export const config.regions`.
