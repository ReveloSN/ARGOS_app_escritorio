# 006 · Las reglas de capas y de tamaño se verifican automáticamente

- **Estado:** aceptada · 14/10/2026
- **Contexto:** CLAUDE.md fija reglas de capas (§3) y límites de tamaño (§4). Si solo dependen de la revisión manual, se erosionan.
- **Decisión:**
  - `tests/architecture/test_layer_dependencies.py` analiza el AST y falla si `domain` importa de `application`, `infrastructure`, `api` o de frameworks, o si `application` importa de `infrastructure` o `api`.
  - Ruff prohíbe los imports relativos (para que la prueba vea todas las dependencias) y aplica máximo 3 parámetros (`PLR0913`), 2 niveles de anidación (`PLR1702`, preview activado explícitamente) y complejidad ciclomática ≤ 5.
  - Los avisos en pruebas se tratan como errores.
- **Consecuencias:** una violación rompe el CI en vez de llegar a revisión. Si un caso concreto justifica una excepción, se anota en línea con `noqa` y el motivo.
