# Progreso de ARGUS

Estado al 15/10/2026. Cada fase se cierra solo con lint, tipos y pruebas en verde en CI (ubuntu y windows).

## Fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 · Esqueleto | Motor FastAPI con `/health`, app Tauri 2 + React + TS, enlace con puerto y token, CI | ✅ Completa (ADR 001–008) |
| 1 · Dominio y lectura | Entidades, value objects, `DocumentReader`, lectores PDF/DOCX/XLSX/EML/texto | ✅ Completa (ADR 009) |
| 2 · Extracción | Cadena de extractores con prioridad e índice invertido | ✅ Completa (ADR 010) |
| 3 · Comparación y riesgo | Damerau-Levenshtein + BK-tree, comparadores, Specification, cola de prioridad | ✅ Completa (ADR 011) |
| 4 · Persistencia | Repositorios SQLite, sesiones, decisiones con Command y deshacer, métricas | ✅ Completa (ADR 012) |
| 5 · Sistema de diseño | Tokens en 3 niveles, átomos a templates, i18n es/en, temas | ✅ Completa (ADR 013) |
| 5.1 · Corrección de producto | Catálogo solo en desarrollo, flujo con datos reales, `POST /reviews` | ✅ Completa (ADR 014) |
| 6 · Pantallas | Decisiones en el detalle, filtros, historial, ajustes, progreso por archivo | ⏳ En curso: base del flujo hecha |
| 7 · IA | spaCy, embeddings ONNX, anomalías, `AlertExplainer` | Pendiente |
| 8 · Empaquetado | Sidecar PyInstaller e instaladores .msi, .deb, .AppImage | Pendiente |

## Qué puede hacer hoy la app

- Arranca en **Inicio** con el estado vacío y «Nueva revisión». No hay sesión, contadores ni alertas hasta que el motor devuelve una revisión.
- **Nueva revisión:** se cargan archivos y un nombre; el motor los lee, compara y guarda la sesión. **Confirmar lectura** muestra qué se leyó de cada archivo y explica en 3 partes los que no se pudieron leer.
- **Resultados:** las alertas reales ordenadas por riesgo y confianza. **Detalle:** Valor A y Valor B lado a lado, con los caracteres distintos resaltados, el archivo, la ubicación y el fragmento de origen.
- Si el motor está detenido, Inicio sigue usable y dice qué hacer («Reintentar conexión»).
- Catálogo de componentes, solo en desarrollo: `npm --prefix app run dev` y abrir `http://localhost:1420/dev/design-system`.

## Pruebas

- Motor: `uv run --project engine pytest`, con el caso obligatorio 4857 vs 4587 → ALTA y el endpoint `POST /reviews` sobre archivos reales.
- Interfaz: `npm --prefix app test` corre la suite y, después, la verificación del build de producción (sin catálogo ni datos de ejemplo).

## Pendiente y decisiones abiertas

- La app de escritorio necesita Rust para compilarse en local (en CI ya compila). Falta versionar `Cargo.lock` tras la primera compilación local.
- Fase 6: decisiones C/E/I con deshacer en el detalle (el motor ya las soporta), filtros y búsqueda, Historial con métricas, Ajustes (idioma, tema, sensibilidad, carpeta del historial), progreso por archivo con SSE.
- Un número sin moneda (por ejemplo una celda de Excel) todavía no se toma como monto. Los nombres de persona solo se reconocen tras un cargo o tratamiento (Fase 7 con spaCy).
