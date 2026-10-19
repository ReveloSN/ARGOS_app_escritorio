# Progreso de ARGUS

Estado al 19/10/2026. Cada fase se cierra solo con lint, tipos y pruebas en verde en CI (ubuntu y windows).

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
| 7 · IA | spaCy, embeddings ONNX, anomalías, aprendizaje con las decisiones y `AlertExplainer` | ✅ Completa (ADR 016) |
| 8 · Empaquetado | Sidecar PyInstaller, instaladores .msi, .deb, .AppImage y elegir la carpeta del historial | ✅ Completa (ADR 017) |
| A · Comparación (motor) | Segmentos con origen, alineación por huella y similitud, diff por palabra y carácter, materialidad, modos y `/comparisons` | ✅ Completa (ADR 018) |
| B · IA opcional | Embedders local avanzado y en la nube (con consentimiento), contradicciones (NLI), `ChangeExplainer` y benchmark | Pendiente |
| C · Comparar documentos (interfaz) | Mockup primero; dos paneles sincronizados, diff en el texto, cambios con filtros, decisiones, Explicar y matriz | Pendiente |
| D · OCR opcional | PDF escaneados en vez de rechazarlos (revisa el ADR 005) | Pendiente |

## Qué puede hacer hoy la app

- Arranca en **Inicio** con el estado vacío y «Nueva revisión» (Ctrl N). No hay sesión, contadores ni alertas hasta que el motor devuelve una revisión.
- **Nueva revisión:** mientras el motor lee, muestra el avance archivo por archivo («Leyendo 3 de 5 archivos · ≈ 40 s restantes») también en la barra superior. **Confirmar lectura** explica en 3 partes los archivos que no se pudieron leer.
- **Resultados:** alertas reales agrupadas por riesgo, con filtros combinables (riesgo, tipo, archivo, estado), búsqueda sin tildes («/»), menú «⋯» por fila (decidir sin abrir, «No alertar casos similares», copiar valores) y pestañas Archivos y Decisiones. Atajos J K, ↵, C E I y Ctrl Z.
- **Detalle:** Valor A y Valor B con su origen, «Abrir en página N» (abre la copia del archivo con la aplicación del sistema), «Ver las N apariciones», qué cambia entre los valores, «Es correcto / Es un error / Ignorar» con el valor correcto y la corrección sugerida, y «Deshacer».
- **Cerrar revisión:** queda en el historial como solo lectura.
- **Historial:** sesiones del periodo (7, 30 o 90 días), métricas de uso (alertas resueltas, tiempo medio, porcentaje de errores reales), decisiones de la sesión elegida, «Abrir revisión» y «Exportar registro (CSV)».
- **Ajustes:** sensibilidad, tipos que se comparan, casos que no generan alerta, idioma, formato regional, tema, retención de 90 días y carpeta del historial; cada cambio se guarda al instante. En la app de escritorio, «Cambiar carpeta» copia el historial a la carpeta elegida, lo verifica, reinicia el motor y conserva la carpeta anterior.
- **IA local (sin internet):** nombres de persona con spaCy; un correo que cita un periodo distinto al de su adjunto del mismo tema (embeddings ONNX), mostrado como sugerencia con su confianza; fechas con un año fuera del patrón y montos con un cero de más o de menos; la confianza aprende de sus decisiones anteriores, y cada alerta trae una explicación en el idioma de la interfaz.
- **Búsqueda global (Ctrl K):** en una revisión busca alertas y fragmentos de los documentos; en Historial, sesiones; en Ajustes, secciones.
- Si el motor está detenido, Inicio sigue usable y dice qué hacer («Reintentar conexión»).
- **Comparación de documentos (solo motor, todavía sin pantalla):** `POST /comparisons` con un modo (versiones, correo y adjunto, contrato y anexos, uno contra varios) divide cada archivo en párrafos, cláusulas y filas de tabla, los alinea y devuelve cada cambio (agregado, eliminado, modificado, movido) con su origen, el diff por palabra y por carácter, y su riesgo según toque montos, fechas, números, partes o negaciones. Funciona sin el modelo de embeddings; con él, también reconoce las reformulaciones. `GET /comparisons/{id}` la vuelve a abrir.
- **Instaladores:** `.msi` (Windows), `.deb` y `.AppImage` (Linux) con el motor y los modelos incluidos; funcionan sin internet desde la primera ejecución.
- Catálogo de componentes, solo en desarrollo: `npm --prefix app run dev` y abrir `http://localhost:1420/dev/design-system`.

## Pruebas

- Modelo de embeddings (una vez, unos 118 MB, verificado por huella): `uv run --project engine python -m argus.infrastructure.nlp.embedding_model`. Sin él, solo se omite la comparación semántica.
- Motor: `uv run --project engine pytest`, con el caso obligatorio 4857 vs 4587 → ALTA, el flujo SSE de `POST /reviews` y las rutas de decisiones, historial, ajustes, búsqueda y apertura de archivos, y la comparación de documentos (segmentos, alineación, diff, materialidad, modos y `/comparisons`).
- Motor empaquetado: desde `engine/`, `uv run pyinstaller distribution/argus-engine.spec --noconfirm` y luego `uv run python distribution/smoke_test.py` (arranca el binario con datos temporales y revisa los archivos de ejemplo).
- Instaladores: se generan en GitHub Actions (workflow «Instaladores»). Una etiqueta `vX.Y.Z` publica la versión en Releases; «Run workflow» los deja como artefactos.
- Interfaz: `npm --prefix app test` corre la suite (flujos completos con servicios de prueba, lógica de filtros, diferencias, CSV y componentes) y, después, la verificación del build de producción (sin catálogo ni datos de ejemplo).

## Pendiente y decisiones abiertas

- Compilar la app de escritorio en Windows requiere Rust y las Build Tools de Visual Studio (enlazador MSVC); en CI ya compila y genera los instaladores.
- Los instaladores no tienen firma de código: Windows muestra SmartScreen al instalar.
- La explicación usa plantillas; conectar un proveedor de IA generativa (con consentimiento en Ajustes y clave en el llavero) queda como opción futura detrás del mismo puerto.
- Deshacer vive mientras el motor está abierto; las decisiones quedan guardadas aunque se reinicie.
- Un número sin moneda (por ejemplo una celda de Excel) todavía no se toma como monto.
- Las comparaciones aún no aparecen en el Historial ni se borran con la retención de 90 días; llega con la Fase C.
- Nemotron-3-Embed-1B solo se integrará en la Fase B si se verifica que existe, su licencia y su tamaño.
