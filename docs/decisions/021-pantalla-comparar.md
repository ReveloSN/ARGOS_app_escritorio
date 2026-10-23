# 021 · Pantalla Comparar documentos (Fase 3)

- **Estado:** aceptada · 22/10/2026
- **Contexto:** el mockup «ARGUS Comparar» muestra dos versiones lado a lado con las diferencias marcadas dentro del texto, un resumen por tipo, un minimapa, filtros, el detalle del cambio con decisiones y dos modos más: inconsistencias entre documentos y matriz para 3 o más. El motor de la Fase 1 solo devolvía los cambios, sin el texto completo ni decisiones.
- **Decisión:**
  - **El motor devuelve el texto completo de cada par** (segmentos de los dos documentos), su proporción de coincidencia y si parecen no estar relacionados (`seemsUnrelated` bajo 0,2). Así la interfaz pinta el texto sin leer los archivos otra vez.
  - **Inconsistencias dentro de la comparación:** `ComparisonAnalyzer` corre el mismo `ReviewAnalyzer` de las revisiones sobre los documentos comparados. Cambios e inconsistencias comparten una sola numeración (primero los cambios), y ese número identifica cada elemento al decidir. El Expediente se suma en la Fase 4.
  - **Decisiones con deshacer en las comparaciones:** `DecisionHistories` (Command con deshacer por sesión) lo comparten `ReviewDecisions` y `ComparisonDecisions`; `SqliteDecisionRepository` recibe su tabla (`DecisionTable`), con la migración 4 para `comparison_decisions`. Rutas `POST /comparisons/{id}/decisions` y `.../decisions/undo`.
  - **Cambios idénticos que solo se movieron** no son un cambio de forma: `cosmetic_difference` devuelve nada si los dos textos son iguales (antes se marcaban como formato y el filtro los ocultaba).
  - **Subida con progreso compartida:** `EventChannel` en el motor y `streamUpload` en la interfaz sirven a revisiones y comparaciones.
  - **Interfaz:** «Comparar» en la barra lateral y «Comparar dos versiones» en Inicio. Con 2 archivos abre Versiones; con 3 o más, la Matriz (modo contrato y anexos). Paneles con desplazamiento sincronizado en proporción, minimapa, filtros por tipo y casillas para ignorar mayúsculas, puntuación y formato, teclas J K, C E I, Ctrl Z y 1 2 3 para los modos. `useDecisionCommands` reúne decidir, deshacer y reintentar para alertas y cambios; `DecisionButtons` es la misma botonera en los dos.
  - **Esperan a la Fase 6:** «Explicar este cambio» y la etiqueta de IA «Reformulado / Cambio de sentido».
- **Consecuencias:** las comparaciones todavía no aparecen en el Historial ni entran en la retención de 90 días. Si dos versiones no se parecen, la pantalla lo explica y ofrece cambiar al modo de inconsistencias.
