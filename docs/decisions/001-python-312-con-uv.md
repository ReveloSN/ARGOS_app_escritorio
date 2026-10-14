# 001 · Python 3.12 gestionado con uv

- **Estado:** aceptada · 14/10/2026
- **Contexto:** CLAUDE.md pide Python 3.11+. El motor depende de spaCy, onnxruntime y PyInstaller, que necesitan wheels compatibles en Windows y Linux. El equipo de desarrollo tiene 3.12 y 3.13.
- **Decisión:** fijar `requires-python = ">=3.12,<3.13"` y `.python-version = 3.12`. Gestionar dependencias, entorno y lockfile con **uv** (`engine/uv.lock`).
- **Consecuencias:** un solo lockfile reproducible e idéntico en ambos SO y en CI (`uv sync --locked`). Subir a 3.13 queda como decisión futura, cuando todas las dependencias publiquen wheels estables.
