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
| 6 · Pantallas | Decisiones con deshacer, Resultados con filtros, Historial, Ajustes, búsqueda Ctrl K, progreso por archivo | ✅ Completa (ADR 015) |
| 7 · IA | spaCy, embeddings ONNX, anomalías, `AlertExplainer` | Pendiente |
| 8 · Empaquetado | Sidecar PyInstaller, instaladores .msi, .deb, .AppImage y elegir la carpeta del historial | Pendiente |

## Qué puede hacer hoy la app

- Arranca en **Inicio** con el estado vacío y «Nueva revisión» (Ctrl N). No hay sesión, contadores ni alertas hasta que el motor devuelve una revisión.
- **Nueva revisión:** mientras el motor lee, muestra el avance archivo por archivo («Leyendo 3 de 5 archivos · ≈ 40 s restantes») también en la barra superior. **Confirmar lectura** explica en 3 partes los archivos que no se pudieron leer.
- **Resultados:** alertas reales agrupadas por riesgo, con filtros combinables (riesgo, tipo, archivo, estado), búsqueda sin tildes («/»), menú «⋯» por fila (decidir sin abrir, «No alertar casos similares», copiar valores) y pestañas Archivos y Decisiones. Atajos J K, ↵, C E I y Ctrl Z.
- **Detalle:** Valor A y Valor B con su origen, «Abrir en página N» (abre la copia del archivo con la aplicación del sistema), «Ver las N apariciones», qué cambia entre los valores, «Es correcto / Es un error / Ignorar» con el valor correcto y la corrección sugerida, y «Deshacer».
- **Cerrar revisión:** queda en el historial como solo lectura.
- **Historial:** sesiones del periodo (7, 30 o 90 días), métricas de uso (alertas resueltas, tiempo medio, porcentaje de errores reales), decisiones de la sesión elegida, «Abrir revisión» y «Exportar registro (CSV)».
- **Ajustes:** sensibilidad, tipos que se comparan, casos que no generan alerta, idioma, formato regional, tema, retención de 90 días y carpeta del historial; cada cambio se guarda al instante.
- **Búsqueda global (Ctrl K):** en una revisión busca alertas y fragmentos de los documentos; en Historial, sesiones; en Ajustes, secciones.
- Si el motor está detenido, Inicio sigue usable y dice qué hacer («Reintentar conexión»).
- Catálogo de componentes, solo en desarrollo: `npm --prefix app run dev` y abrir `http://localhost:1420/dev/design-system`.

## Pruebas

- Motor: `uv run --project engine pytest`, con el caso obligatorio 4857 vs 4587 → ALTA, el flujo SSE de `POST /reviews` y las rutas de decisiones, historial, ajustes, búsqueda y apertura de archivos.
- Interfaz: `npm --prefix app test` corre la suite (flujos completos con servicios de prueba, lógica de filtros, diferencias, CSV y componentes) y, después, la verificación del build de producción (sin catálogo ni datos de ejemplo).

## Pendiente y decisiones abiertas

- La app de escritorio necesita Rust para compilarse en local (en CI ya compila). Falta versionar `Cargo.lock` tras la primera compilación local.
- Fase 7: explicación de cada alerta (el párrafo del detalle), spaCy para nombres, embeddings para «informe de junio» frente al periodo del adjunto y anomalías.
- Fase 8: elegir la carpeta del historial desde Ajustes (plugin de diálogo de Tauri) e instaladores.
- Deshacer vive mientras el motor está abierto; las decisiones quedan guardadas aunque se reinicie.
- Un número sin moneda (por ejemplo una celda de Excel) todavía no se toma como monto.
