# Progreso de ARGUS

Estado al 27/10/2026. Cada fase se cierra solo con lint, tipos y pruebas en verde en CI (ubuntu y windows).

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
| 6 · IA opcional | `ChangeExplainer` con respaldo por plantillas, «reformulado» frente a «cambio de sentido» y benchmark del embedder | ✅ Completa (ADR 024) |
| 7 · Asistente | `ArgusAssistant` con sus estados derivados del motor, onboarding y ajuste «Mostrar asistente» | ✅ Completa (ADR 025) |
| 8 · OCR | `OcrEngine` con Tesseract local y Google Document AI opcional (revisa el ADR 005) | ✅ Completa (ADR 026) |
| 9 · Empaquetado y cierre | Instaladores con modelos, arranque sin internet, README y progreso final | ✅ Completa (ADR 027) |

### Revisión autónoma (25–27/10/2026, ADR 030)

Recorrido de la app real con motor real en una carpeta de datos aislada (2 sesiones; TXT, DOCX y EML). Detalle, pruebas y capturas en `docs/autonomo/`.

| Cambio | Contenido | Estado |
|---|---|---|
| Comparar, lo esencial primero | Filtros, «Solo cambios importantes», tipo y leyenda en un panel plegable «Opciones» (con el nombre de lo que está activo) | ✅ Completa |
| Cada dato una vez | La barra superior ya no repite el estado del asistente; una sola acción primaria en Inicio; atajos de las pestañas como teclas | ✅ Completa |
| Nada recortado sin salida | Valores y títulos de alertas, valor del detalle, nombres largos de sesión (la cabecera ya no saca los botones de la ventana), tabla de Historial a 800 px | ✅ Completa |
| Mensajes con salida | Archivo ilegible en Comparar, «sin diferencias» frente a «filtros», Inicio con revisiones guardadas, búsqueda sin resultados | ✅ Completa |
| Teclado | «Renombrar la sesión» recibe el foco; `ModalDialog` devuelve el foco sin pelearse con el modo estricto de React | ✅ Completa |
| `ARGUS_DEV_ORIGIN` | Suma un origen de bucle local al CORS del motor, solo para desarrollo | ✅ Completa |

### Correcciones de la app real (24/10/2026, ADR 029)

| Corrección | Contenido | Estado |
|---|---|---|
| Inicio con datos | `SessionSnapshot` como única fuente: Inicio y la barra lateral muestran las mismas cifras | ✅ Completa |
| Selector de sesión | Menú con las sesiones del historial, Nueva, Renombrar y Eliminar con deshacer; todo se recarga al cambiar | ✅ Completa |
| Comparar contra todos | Documento base, «Contra: todos o uno», lista única etiquetada, filtro y resumen por documento, encabezados de la matriz, «Cerrar comparación» y Esc | ✅ Completa |
| Comparar con un solo texto (variante 1a) | Texto unificado, línea superior con «Opciones», lista de una línea con punto de riesgo, detalle bajo la fila, matriz de triángulo superior, nombres largos (ADR 031); crítica de diseño aplicada: decisiones pegadas arriba del lateral y con jerarquía, valores A y B plegados, Opciones flotante que nombra lo activo, datos en monoespaciada, filas «+ no», avance al siguiente cambio sin decidir y «Revisión completa» | ✅ Completa (ramas rediseno-visual y critica-comparar, sin push) |
| Explicación en bloques | Frase resumen, A/B lado a lado, tres bloques, decisiones y «Ver detalle»; la IA responde en bloques y la plantilla local los llena sin clave | ✅ Completa |
| Etiquetas de la IA local | Solo los pares cambiados llevan sugerencia; lenguaje claro | ✅ Completa |

## Qué puede hacer hoy la app

- Arranca en **Inicio** con el estado vacío y «Nueva revisión» (Ctrl N). No hay sesión, contadores ni alertas hasta que el motor devuelve una revisión. Con una sesión activa, Inicio muestra sus documentos cargados, las alertas pendientes por riesgo, las últimas comparaciones y accesos directos: las mismas cifras que la barra lateral, porque las dos salen de `SessionSnapshot`.
- **Selector de sesión:** la flecha junto a «Sesión · nombre» abre un menú con las sesiones del historial (documentos, alertas pendientes y fecha), la activa marcada con ícono, y «Nueva sesión», «Renombrar» y «Eliminar» (con confirmación y «Deshacer» durante 8 s). Se maneja con flechas, Enter y Esc. Al cambiar de sesión se recargan la barra lateral, Inicio, el Expediente y Comparar.
- **Nueva revisión:** mientras el motor lee, muestra el avance archivo por archivo («Leyendo 3 de 5 archivos · ≈ 40 s restantes») también en la barra superior. **Confirmar lectura** explica en 3 partes los archivos que no se pudieron leer.
- **Resultados:** alertas reales agrupadas por riesgo, con filtros combinables (riesgo, tipo, archivo, estado), búsqueda sin tildes («/»), menú «⋯» por fila (decidir sin abrir, «No alertar casos similares», copiar valores) y pestañas Archivos y Decisiones. Atajos J K, ↵, C E I y Ctrl Z.
- **Detalle:** Valor A y Valor B con su origen, «Abrir en página N» (abre la copia del archivo con la aplicación del sistema), «Ver las N apariciones», qué cambia entre los valores, «Es correcto / Es un error / Ignorar» con el valor correcto y la corrección sugerida, y «Deshacer».
- **Cerrar revisión:** queda en el historial como solo lectura.
- **Historial:** sesiones del periodo (7, 30 o 90 días), métricas de uso (alertas resueltas, tiempo medio, porcentaje de errores reales), decisiones de la sesión elegida, «Abrir revisión» y «Exportar registro (CSV)» (que confirma el archivo guardado). También lista las **comparaciones** del periodo con cuántos elementos ya se decidieron y «Abrir comparación» (ADR 032); sus decisiones cuentan en las métricas.
- **Ajustes:** sensibilidad, tipos que se comparan, casos que no generan alerta, idioma, formato regional, tema, retención de 90 días y carpeta del historial; cada cambio se guarda al instante. En la app de escritorio, «Cambiar carpeta» copia el historial a la carpeta elegida, lo verifica, reinicia el motor y conserva la carpeta anterior.
- **IA local (sin internet):** nombres de persona con spaCy; un correo que cita un periodo distinto al de su adjunto del mismo tema (embeddings ONNX), mostrado como sugerencia con su confianza; fechas con un año fuera del patrón y montos con un cero de más o de menos; la confianza aprende de sus decisiones anteriores, y cada alerta trae una explicación en el idioma de la interfaz.
- **Búsqueda global (Ctrl K):** en una revisión busca alertas y fragmentos de los documentos; en Historial, sesiones; en Ajustes, secciones.
- Si el motor está detenido, Inicio sigue usable y dice qué hacer («Reintentar conexión»). Sin sesión abierta pero con revisiones guardadas, Inicio lo dice («No hay una revisión abierta») y ofrece «Ver el historial».
- **Expediente:** la revisión es el expediente. La pestaña «Datos confirmados» guarda el número de contrato, las partes, los montos y las fechas que el usuario confirma (Agregar dato, Editar, Retirar, Restaurar y Ctrl Z) y marca al instante qué documento contradice cada dato, con su riesgo y su origen; explica por qué ninguno lo contradice (coincide, otra forma de escribirlo o una regla «No alertar casos similares»). Los pares de valores que ninguna confirmación resuelve aparecen como «Sin confirmar».
- **Verificaciones internas:** en las alertas del expediente también aparecen el monto en letras que no coincide con el número, el total que no es la suma de sus celdas, la fecha de fin anterior a la de inicio, la fecha que no existe y los campos sin llenar. Las de un solo valor muestran solo el Valor A.
- **Revisar antes de enviar:** con un borrador `.eml` marca en el texto el periodo citado que no coincide con el adjunto, el número de contrato o el monto del asunto o del cuerpo que se parece al del adjunto pero no es el mismo (4587 frente a 4857, $ 18.450.000 frente a $ 18.540.000; sin corrección automática, ARGUS no cambia el texto), el adjunto prometido que falta y el destinatario que no es del expediente; no dice «listo» si quedan problemas marcados como error sin corregir; propone la corrección con el documento del expediente y «Abrir en el correo» (Ctrl Enter) abre una copia corregida en el programa de correo. ARGUS no envía el correo.
- **Informe:** «Generar informe» en el Expediente abre la vista previa (resumen, evidencia con el origen de cada valor, decisiones tomadas y nota sobre sugerencias de IA); se eligen las secciones y el formato y «Exportar» (Ctrl E) guarda el PDF o el DOCX en Documentos/ARGUS/<expediente>, con «Abrir informe». En Comparar, «Exportar informe» (PDF o Word) guarda el informe de la comparación, con el origen de cada valor y la decisión, en Documentos/ARGUS/<comparación> (ADR 032).
- **Comparar documentos:** desde la barra lateral o «Comparar dos versiones» en Inicio. Con dos archivos muestra un solo texto con los cambios (lo eliminado tachado en gris, lo agregado subrayado; ADR 031) junto a una lista de una línea por cambio, con un punto rojo solo en los de riesgo alto, que van primero, y el detalle abierto bajo la fila elegida (ahí está el nivel de riesgo completo y el archivo y la página de cada valor); cada diferencia está marcada en el texto (tachado = falta, subrayado = agregado, punteado = cambiado, y la nota de dónde quedó lo movido), el resumen por tipo y un minimapa; los filtros (por tipo, «Solo cambios importantes» y ocultar los cambios solo de mayúsculas, puntuación o formato) y la leyenda de las marcas están plegados en «Opciones», un panel flotante que avisa cuántos hay activos. Al decidir un cambio se pasa al siguiente sin decidir y la lista avisa «Revisión completa» al terminar. Un archivo que no se pudo leer se explica en 3 partes y no desaparece en silencio; dos documentos iguales dicen «No hay diferencias entre estos documentos». Cada cambio tiene su detalle con riesgo y «Es correcto / Es un error / Ignorar» con deshacer (J K, C E I, Ctrl Z). «Buscar inconsistencias» muestra cada dato por documento con el valor distinto marcado; con tres o más archivos abre la Matriz de diferencias y desde un par vuelve a las versiones. En «Comparar versiones» se elige el **documento base** y **contra qué**: todos los demás (una sola lista de cambios, cada uno con su documento, filtrable por documento y con el resumen por documento) o uno concreto. En la matriz, el encabezado de una fila o columna abre ese documento contra todos y la celda abre el par. Los archivos que ya están en el expediente se eligen en «Documentos del expediente» y se comparan sin volver a subirlos (el motor usa la copia guardada; los que no se pudieron leer no se ofrecen). «Cerrar comparación» (o Esc) vuelve a elegir qué comparar; sus decisiones se conservan y la comparación se puede reabrir desde «Últimas comparaciones». El motor (`POST /comparisons`) funciona sin el modelo de embeddings; con él, también reconoce las reformulaciones.
- **OCR:** en «Confirmar lectura», un PDF escaneado ofrece «Activar OCR» (y «Reemplazar archivo»). La revisión se vuelve a leer con OCR solo para ese archivo, con avance por página, y la lectura anterior se descarta. Por defecto lee Tesseract en este equipo, en español e inglés. Si se activa Google Document AI en Ajustes › OCR (proyecto, ubicación, procesador y clave JSON de la cuenta de servicio en el llavero), antes de enviar se dice cuántas páginas saldrán del equipo y se puede elegir el OCR local. Sin red o sin clave se usa el OCR local. «Archivos» indica qué se leyó con OCR.
- **Asistente de IA:** el ojo de ARGUS en la barra lateral dice en qué está según datos reales (la barra superior solo lo repite si la lateral está contraída o hay algo que atender: leyendo o motor detenido): En pausa con el motor detenido (con «Reintentar»), Leyendo N de M archivos, Explicando un cambio, No pudo leer un archivo, N alertas de riesgo alto, Necesita una confirmación (datos «Sin confirmar»), Sin inconsistencias o Listo. Inicio lo muestra grande sobre la retícula. La primera vez se abren los «Primeros pasos» (3 pantallas; Esc omite y Enter avanza). Ajustes › Asistente permite ocultarlo (el estado queda en texto), reducir el movimiento y volver a ver los primeros pasos.
- **IA opcional:** cada cambio de Comparar que sea un par cambiado lleva la sugerencia «Reformulado, mismo significado» o «Posible cambio de significado» (local, sin internet; lo que solo falta, se agrega o se mueve no lleva ninguna). La explicación de un cambio o de una alerta se lee en cinco segundos: una frase resumen, «Documento A dice» y «Documento B dice» con la diferencia marcada, «Qué cambió», «Por qué importa» y «Qué puede hacer», y debajo las decisiones. Se llena al instante con la plantilla local. «Ver detalle» pide el texto largo y, si se activa en Ajustes > Inteligencia artificial, con el proveedor elegido (Anthropic Claude o DeepSeek, cada uno con su propia clave en el llavero del sistema; ADR 028), los cuatro bloques pasan a ser una «Sugerencia de IA, usted decide» con la cita del archivo y la página de cada fragmento de origen; solo esos fragmentos salen del equipo, nunca el documento. Sin clave o sin conexión se usa la explicación local con un aviso de 3 partes y «Reintentar». La decisión (Es correcto / Es un error / Ignorar) sigue siendo del usuario.
- **Instaladores:** `.msi`, `-setup.exe` y zip portable (Windows), `.deb`, `.rpm` y `.AppImage` (Linux x64 y ARM64) y `.dmg` (macOS Apple silicon; ADR 029) con el motor, los modelos y Tesseract (español e inglés) incluidos; funcionan sin internet desde la primera ejecución.
- Una segunda copia de la interfaz en desarrollo (otro puerto mientras el 1420 está ocupado) necesita que el motor admita su origen: `ARGUS_DEV_ORIGIN=http://localhost:1421 ARGUS_ENGINE_TOKEN=… uv run python -m argus --port 8766`. Solo acepta `http://localhost:N` o `http://127.0.0.1:N`.
- Catálogo de componentes, solo en desarrollo: `npm --prefix app run dev` y abrir `http://localhost:1420/dev/design-system`.

## Pruebas

- Modelo de embeddings (una vez, unos 118 MB, verificado por huella): `uv run --project engine python -m argus.infrastructure.nlp.embedding_model`. Sin él, solo se omite la comparación semántica.
- Motor: `uv run --project engine pytest`, con el caso obligatorio 4857 vs 4587 → ALTA, el flujo SSE de `POST /reviews` y las rutas de decisiones, historial, ajustes, búsqueda y apertura de archivos, y la comparación de documentos (segmentos, alineación, diff, materialidad, modos y `/comparisons`).
- Motor empaquetado: desde `engine/`, `uv run pyinstaller distribution/argus-engine.spec --noconfirm` y luego `uv run python distribution/smoke_test.py` (arranca el binario con datos temporales y revisa los archivos de ejemplo).
- Instaladores: se generan en GitHub Actions (workflow «Instaladores»), después de una prueba de humo que arranca el motor empaquetado sin internet y comprueba reglas, spaCy, embeddings, OCR y Ajustes. Una etiqueta `vX.Y.Z` publica la versión en Releases; «Run workflow» los deja como artefactos (así quedó la v0.1).
- Motor empaquetado en local: desde `engine/`, `uv run pyinstaller distribution/argus-engine.spec --noconfirm`, `uv run python distribution/bundle_tesseract.py` (con Tesseract instalado) y `uv run python distribution/smoke_test.py`.
- Interfaz: `npm --prefix app test` corre la suite (flujos completos con servicios de prueba, lógica de filtros, diferencias, CSV y componentes) y, después, la verificación del build de producción (sin catálogo ni datos de ejemplo).

## Pendiente y decisiones abiertas

- Compilar la app de escritorio en Windows requiere Rust y las Build Tools de Visual Studio (enlazador MSVC); en CI ya compila y genera los instaladores.
- Los instaladores no tienen firma de código: Windows muestra SmartScreen al instalar.
- Los puertos NLI (`EntailmentModel`) y del embedder Nemotron están listos sin implementar.
- En desarrollo, el OCR local usa el Tesseract del sistema (`PATH` o `ARGUS_TESSERACT`); los instaladores traen el suyo.
- El modelo `es_core_news_md` de spaCy es GPL-3.0 y va en los instaladores: la licencia que se elija para ARGUS debe ser compatible (el repositorio aún no declara licencia).
- Document AI en modo síncrono acepta hasta 15 páginas; un PDF más largo se lee con el OCR local.
- Deshacer vive mientras el motor está abierto; las decisiones quedan guardadas aunque se reinicie.
- Un número sin moneda (por ejemplo una celda de Excel) todavía no se toma como monto.
- «Abrir en Comparar» (contradicción) y «Guardar en el expediente» (Enviar) esperan poder agregar documentos a una revisión existente.
- Las comparaciones aparecen en el Historial y se borran con la retención de 90 días, que ahora también corre al activar el límite en Ajustes (ADR 032). Las comparaciones cerradas se reabren desde el Historial o, mientras la app sigue abierta, desde «Últimas comparaciones».
- Las inconsistencias de Comparar se leen contra los datos confirmados del Expediente abierto (sin expediente abierto no hay referencia); «Revisar antes de enviar» no compara las fechas del correo contra las del adjunto, y un número sin moneda sigue sin tomarse como monto.
- «Comparar contra todos» usa los pares que el motor ya calculó: con tres o más archivos son todos contra todos; un modo encadenado (versiones) solo ofrece sus pares consecutivos.
- El selector de sesión solo aparece con una sesión activa; sin ella, las sesiones guardadas se abren desde Historial (Inicio lo indica).
- Pendiente de la revisión autónoma: el minimapa de Comparar no se movió a «Opciones»; las filas de la lista de alertas son altas en ventanas estrechas; no se probó la app empaquetada de Tauri ni la IA con clave real; el modo estricto de React solo existe en desarrollo (el arreglo del foco de los diálogos se comprobó ahí).
- La respuesta estructurada de la IA (JSON) no se probó con la API real de Anthropic ni de DeepSeek, solo con dobles; si un modelo no responde JSON, se muestra como texto libre y los bloques quedan con la plantilla.
- Nemotron-3-Embed-1B solo se integrará en la Fase B si se verifica que existe, su licencia y su tamaño.
