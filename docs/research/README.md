# Fuentes de investigación · base científica de Olfativa

Esta carpeta aloja los PDFs de aromacología y psicología del olfato
que sustentan las reglas codificadas en `data/scent-iq-foundations.json`.

Los binarios no se versionan en el repositorio inicial — la sesión
de ronda 6 los referenció por título pero no los embebió para no
saturar el contexto del agente. Tony (u otro editor con acceso a las
fuentes) puede subirlos manualmente conservando los nombres listados
abajo, o renombrar este README si los títulos finales difieren.

## PDFs esperados

1. **`hirsch-aroma-marketing.pdf`** — Alan R. Hirsch · investigación
   sobre aroma marketing y respuesta emocional al olor. Fuente clave
   para R001 (cítricos y alerta), R022 (mentol y TRPM8), R027 (café
   y atención), R034 (bergamota y estado de ánimo).

2. **`herz-scent-of-desire.pdf`** — Rachel S. Herz · *The Scent of
   Desire*. Psicología del olfato, asociación olor-emoción, evidencia
   clínica sobre linalool (lavanda) y reducción de cortisol. Sustenta
   R013, R024, R010 (gourmand y adormecimiento cognitivo).

3. **`jellinek-psychological-basis-perfumery.pdf`** — J. Stephan
   Jellinek · *The Psychological Basis of Perfumery*. Marco teórico
   de familias olfativas, indólicos en florales blancas, signature
   masculina del cuero/tabaco, narrativa ritual del incienso.
   Sustenta R003, R012, R017, R033, R046 (jazmín indólico).

4. **`ifra-environmental-briefings.pdf`** — IFRA · briefings públicos
   de aplicación ambiental. Buenas prácticas IFRA para acuáticos,
   eucalipto y dosis máximas seguras en espacios cerrados. Sustenta
   R012 acuáticas y R023 eucalipto.

5. **`sense-of-smell-institute.pdf`** — Sense of Smell Institute ·
   compilación de briefings sobre alfa-santalol (sándalo) y modulación
   EEG hacia estado relajado-alerta, te verde y atención sostenida
   (L-teanina), oud y prestigio cultural. Sustenta R005, R011 (verdes
   y atención), R025 oud y R048 sándalo.

## Cómo se relacionan con el modelo

`data/scent-iq-foundations.json` cita cada PDF en el campo `fuente` de
las reglas (`reglas_psicoaromacologia[].fuente`) y en `meta.fuentes`.
La función `seedFromFoundations()` (en `scent-iq-knowledge.js`) aplica
las reglas sobre los 104 aromas del catálogo para llenar los campos
TIPO A de los 5 sentidos (olfato, vista, tacto, oído, gusto).

Si añade un PDF nuevo:
1. Súbalo a esta carpeta con un nombre minúscula-guion (ej.
   `nueva-fuente.pdf`).
2. Edite `data/scent-iq-foundations.json` agregando una entrada a
   `meta.fuentes` y citándolo en las reglas que sustenta (`fuente`).
3. Corra el editor del Cotizador → botón `↻ Re-seed` (preserva
   los overrides de Tony, solo refresca los valor_sugerido).
4. Bump del cache buster en `cotizador.html` para que los ejecutivos
   reciban la versión nueva sin limpiar caché manualmente.

## Privacidad

Estos PDFs son material académico y/o de fuentes públicas. Cualquier
PDF interno propio de Olfativa (briefings comerciales, listas de
clientes, recetas privadas) NO debe vivir en esta carpeta — el repo
es público y los archivos quedarían expuestos.
