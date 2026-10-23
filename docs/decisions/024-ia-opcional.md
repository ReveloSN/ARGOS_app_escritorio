# 024 · IA opcional: explicar un cambio y sugerir su sentido (Fase 6)

- **Estado:** aceptada · 23/10/2026
- **Contexto:** la sección 15 de CLAUDE.md pide un `ChangeExplainer` opcional con respaldo por plantillas, la distinción «reformulado» frente a «cambio de sentido» como sugerencia y puertos listos para un embedder Nemotron y un clasificador NLI. La detección exacta no puede depender de IA, de internet ni de claves.
- **Decisión:**
  - **Sentido del cambio (`RuleAndSimilarityMeaningClassifier`), local y sin clave.** Reglas primero y similitud después:
    - una materialidad sustantiva (número, fecha, monto, parte o negación) se sugiere como cambio de sentido con confianza 0.90;
    - un cambio solo de forma (mayúsculas, puntuación o espacios) se sugiere como reformulado, 0.95;
    - el texto agregado o quitado se sugiere como cambio de sentido, 0.70;
    - si aparece o desaparece una palabra de obligación o permiso («podrá», «deberá», «prohibido»…), cambio de sentido, 0.80;
    - con similitud MiniLM de 0.90 o más, reformulado; por debajo de 0.75, cambio de sentido con confianza `min(0.85, 0.5 + diferencia)`; entre 0.75 y 0.90 no se sugiere nada;
    - un cambio solo movido no lleva sugerencia.
  - **Benchmark** (`engine/benchmarks/meaning_benchmark.py`, con prueba que exige el modelo):

    | Caso | Esperado | Similitud | Materialidad | Sugerencia |
    |---|---|---|---|---|
    | Número transpuesto (4857 → 4587) | cambio de sentido | 0.954 | número | cambio de sentido 0.90 |
    | Negación | cambio de sentido | 0.721 | negación | cambio de sentido 0.90 |
    | Reformulación | reformulado | 0.975 | redacción | reformulado 0.98 |
    | Reformulación del objeto | reformulado | 0.936 | redacción | reformulado 0.94 |
    | Uso permitido se reduce | cambio de sentido | 0.564 | redacción | cambio de sentido 0.80 |
    | Facultad pasa a obligación | cambio de sentido | 0.984 | redacción | cambio de sentido 0.80 |
    | Solo mayúsculas | reformulado | 0.552 | mayúsculas | reformulado 0.95 |

    La cláusula movida no recibe sugerencia. Resultado: 7 de 7. MiniLM puntúa «podrá» frente a «deberá» con 0.984 y no distingue facultad de obligación; por eso existe la regla determinista de palabras de obligación en lugar de bajar el umbral.
  - **Puertos sin implementar:** `EntailmentModel` (clasificador NLI) en el clasificador de sentido y el `TextEmbedder` que ya existe para un Nemotron local. Ninguno se agrega hasta verificar su licencia, tamaño y desempeño en este mismo benchmark.
  - **Explicación (`ExplainChange`).** Se pide solo al abrir «Explicar este cambio» en el detalle. Si la IA está apagada, se usa `TemplateChangeExplainer` (claves `changeExplanation.<tema>` en i18n). Si está activada, se usa `AiChangeExplainer`, que envía al proveedor solo los dos fragmentos alineados del cambio. Ante falta de clave, llavero no disponible, clave rechazada, rechazo del modelo o error del proveedor, vuelve a la plantilla e informa el motivo (`fallbackReason`). La salida del modelo va rotulada «Sugerencia de IA» y siempre muestra la cita y el origen del fragmento.
  - **Proveedor: Anthropic Claude por el SDK oficial `anthropic`** (decidido con el usuario). Modelo `claude-sonnet-5-5`, esfuerzo bajo, 1024 tokens como máximo y `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) para que el servidor pruebe otro modelo si el principal está saturado. El adaptador vive en `infrastructure/ai/` detrás del puerto `ExplanationProvider`; cambiar de proveedor es escribir otro adaptador.
  - **Clave en el llavero del sistema con `keyring`** (decidido con el usuario): Credential Manager en Windows y Secret Service en Linux. Servicio «ARGUS», cuenta «anthropic-api-key». La clave nunca se guarda en SQLite, archivos ni en el repositorio, y la API nunca la devuelve. Si no hay llavero, Ajustes lo explica en 3 partes y la app sigue con plantillas.
  - **Consentimiento:** «Explicar cambios con IA» viene apagado (`ai_explains_changes` en preferencias). Mientras esté apagado no sale nada del equipo.
- **Consecuencias:** se agregan las dependencias `anthropic` y `keyring`. Las pruebas reemplazan el llavero y el proveedor por dobles (`AiAdapters`) y nunca llaman a la API. Falta verificar que PyInstaller incluya `anthropic` y los backends de `keyring` en el sidecar (Fase 9).
