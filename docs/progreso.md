# Progreso de ARGUS

Estado al 23/10/2026. Cada fase se cierra solo con lint, tipos y pruebas en verde en CI (ubuntu y windows).

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

### Plan v0.1 (rediseño con identidad ARGUS; mockups de `docs/mockups/` del 22/10/2026)

| Fase | Contenido | Estado |
|---|---|---|
| 1 · Motor de comparación | Segmentos con origen, alineación por huella y similitud, diff por palabra y carácter, materialidad (número, fecha, monto, parte, negación y cambios de forma), modos y `/comparisons` con progreso | ✅ Completa (ADR 018, 019) |
| 2 · Sistema de diseño | Tokens del rediseño, ojo de ARGUS (logo y estados del asistente), retícula, marcas de diferencia, contraste 4.5:1 (texto) y 3:1 (trazos) en los dos temas, catálogo solo en desarrollo | ✅ Completa (ADR 020) |
| 3 · Interfaz de comparación | Pantalla Comparar: paneles sincronizados, diff en el texto, resumen, minimapa, filtros, decisiones y matriz | ✅ Completa (ADR 021) |
| 4 · Expediente y prevención | Datos confirmados como fuente de verdad, verificaciones internas y revisión antes de enviar | ✅ Completa (ADR 022) |
| 5 · Informe y métricas | Informe PDF y DOCX y panel de métricas en Historial | ✅ Completa (ADR 023) |
| 6 · IA opcional | `ChangeExplainer` con respaldo por plantillas, «reformulado» frente a «cambio de sentido» y benchmark del embedder | Pendiente |
| 7 · Asistente | `ArgusAssistant` con sus estados derivados del motor, onboarding y ajuste «Mostrar asistente» | Pendiente |
| 8 · OCR | `OcrEngine` con Tesseract local y Google Document AI opcional (revisa el ADR 005) | Pendiente |
| 9 · Empaquetado y cierre | Instaladores con modelos, arranque sin internet, README y progreso final | Pendiente |

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
- **Expediente:** la revisión es el expediente. La pestaña «Datos confirmados» guarda el número de contrato, las partes, los montos y las fechas que el usuario confirma (Agregar dato, Editar, Retirar, Restaurar y Ctrl Z) y marca al instante qué documento contradice cada dato, con su riesgo y su origen; explica por qué ninguno lo contradice (coincide, otra forma de escribirlo o una regla «No alertar casos similares»). Los pares de valores que ninguna confirmación resuelve aparecen como «Sin confirmar».
- **Verificaciones internas:** en las alertas del expediente también aparecen el monto en letras que no coincide con el número, el total que no es la suma de sus celdas, la fecha de fin anterior a la de inicio, la fecha que no existe y los campos sin llenar. Las de un solo valor muestran solo el Valor A.
- **Revisar antes de enviar:** con un borrador `.eml` marca en el texto el periodo citado que no coincide con el adjunto, el adjunto prometido que falta y el destinatario que no es del expediente; propone la corrección con el documento del expediente y «Abrir en el correo» (Ctrl Enter) abre una copia corregida en el programa de correo. ARGUS no envía el correo.
- **Informe:** «Generar informe» en el Expediente abre la vista previa (resumen, evidencia con el origen de cada valor, decisiones tomadas y nota sobre sugerencias de IA); se eligen las secciones y el formato y «Exportar» (Ctrl E) guarda el PDF o el DOCX en Documentos/ARGUS/<expediente>, con «Abrir informe».
- **Comparar documentos:** desde la barra lateral o «Comparar dos versiones» en Inicio. Con dos archivos muestra las versiones lado a lado, con desplazamiento sincronizado y cada diferencia marcada en el texto (tachado = falta, subrayado = agregado, punteado = cambiado, y la nota de dónde quedó lo movido), el resumen por tipo, un minimapa y filtros; los cambios solo de mayúsculas, puntuación o formato se pueden ocultar. Cada cambio tiene su detalle con riesgo y «Es correcto / Es un error / Ignorar» con deshacer (J K, C E I, Ctrl Z). «Buscar inconsistencias» muestra cada dato por documento con el valor distinto marcado; con tres o más archivos abre la Matriz de diferencias y desde un par vuelve a las versiones. El motor (`POST /comparisons`) funciona sin el modelo de embeddings; con él, también reconoce las reformulaciones.
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
- «Abrir en Comparar» (contradicción) y «Guardar en el expediente» (Enviar) esperan poder agregar documentos a una revisión existente.
- Las comparaciones aún no aparecen en el Historial ni se borran con la retención de 90 días; llega con la Fase C.
- Nemotron-3-Embed-1B solo se integrará en la Fase B si se verifica que existe, su licencia y su tamaño.
