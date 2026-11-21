# Rediseño visual de ARGUS

Fecha de trabajo: 7 de noviembre de 2026, hora de Bogotá.

## Resumen ejecutivo

Se implementó una revisión visual de las pantallas principales y una mascota propia basada en el ojo de ARGUS. La interfaz conserva su identidad petróleo y piedra, sus temas claro y oscuro y sus funciones de análisis local. El trabajo se concentró en hacer legibles los datos y sus fuentes, aclarar la jerarquía y permitir trabajar con nombres largos y menos ancho de pantalla.

La mascota tiene cuerpo, hoja, extremidades y siete expresiones. Sus cambios dependen de los estados existentes del asistente. Se conserva la opción de ocultarla, el texto de estado y la preferencia de movimiento reducido.

## Hallazgos y correcciones

| Área | Problema observado | Resultado implementado |
| --- | --- | --- |
| Controles compartidos | Contornos demasiado similares al fondo y tamaños compactos | Token de contorno con pruebas de contraste en ambos temas, foco visible y controles más amplios |
| Inicio | Retícula dominante y acciones que competían entre sí | Resumen del expediente antes de las acciones, mascota lateral y acceso secundario en la barra |
| Expediente | Nombre de sesión truncado y tipo repetido en algunas filas | Encabezado completo en fila propia y eliminación de etiquetas duplicadas |
| Alertas y detalle | Valores y nombres de archivo se salían de las tarjetas con poco ancho | Tarjetas apilables, nombres completos ajustados y fuentes legibles |
| Comparar | El detalle insertado en una fila desplazaba los demás cambios | Lista y detalle separados, enlazados de forma accesible y con desplazamiento propio |
| Envío | Borrador estrecho y adjuntos largos que podían cortarse | Panel de problemas debajo del borrador al faltar espacio y nombres ajustados |
| Historial | Distribución rígida del panel y reserva de espacio sin selección | Panel adaptable, nombres largos ajustados y ancho completo sin selección |
| Ajustes | Índice lateral restaba ancho al formulario | Índice en filas en ancho reducido y contornos coherentes |
| Informe | La tabla de evidencia podía salir de la hoja | Columnas ajustadas, fuentes dentro de la hoja y opciones debajo en ancho reducido |

## Implicaciones

La misma base de tokens se aplica a todas las pantallas. Se conservan la tipografía IBM Plex, el acento de color y el uso de monoespaciada para valores. Los cambios de estructura mantienen las decisiones, el deshacer y la navegación por teclado.

La mascota acompaña la tarea sin cubrir documentos. En la barra contraída se muestra el ojo simple, que resulta más legible que reducir todo el cuerpo. El modo fluido del ojo evita depender de selectores que alteraban su estructura interna desde otro componente.

## Verificación

La suite completa de interfaz aprobó 510 pruebas en 99 archivos y las 8 pruebas del paquete de producción. También se ejecutaron tipos, ESLint, Stylelint, formato y compilación de producción. Las pruebas de Comparar se actualizaron para comprobar la conexión entre selección y detalle, las decisiones y los nombres completos en la nueva estructura.

La revisión visual usó Chromium, el motor real con datos temporales y documentos creados para la prueba. Dos archivos TXT y un correo EML contienen diferencias de identificador, monto, fecha y periodo. Los nombres largos permitieron reproducir y corregir desbordes. Se revisaron ambos temas y vistas representativas a 800, 1024 y 1280 píxeles. Se comprobó que ocultar la mascota conserva el estado textual y que el movimiento reducido se aplica al documento.

En la prueba final se compararon otros dos TXT con 14 cambios, a 1280 × 700 px. El panel de detalle conservó 300 px de altura y sus botones; al recorrer 13 posiciones con J, la lista se desplazó hasta mantener la última fila seleccionada dentro de sus límites. Esta prueba atendió los dos riesgos que Claude señaló en su revisión final. Después pasaron las 13 pruebas dirigidas de selección, teclado y decisiones, junto con tipos, lint, formato y build.

Claude colaboró mediante el plugin cc: realizó diagnósticos y revisiones, implementó el acabado del ojo y la mascota y añadió pruebas. Declaró uso de impeccable, design:design-critique y design:accessibility-review. Codex integró los cambios y efectuó la revisión en navegador. El registro detallado está en la carpeta compartida .handoff del directorio de trabajo.

## Recomendaciones

Presentar al profesor el recorrido completo de una revisión, destacando la jerarquía, el origen de los valores, el foco de teclado y la adaptación al ancho. La carpeta de capturas permite comparar el resultado con la versión anterior.

Antes de distribuir instaladores, realizar una comprobación visual nativa en WebView2 y WebKitGTK. No se ejecutaron esas superficies en esta sesión. La evaluación con usuarios y las métricas del curso requieren una prueba específica; las verificaciones de código no demuestran una mejora de SUS ni una reducción del tiempo de tarea.

## Apéndice

### Segunda tanda de mejoras

Se corrigió un recorte reproducido del panel Opciones de Comparar: a 800 px de ancho parte del panel quedaba detrás de la barra lateral. Ahora se ancla al ancho de la barra de herramientas, distribuye los selectores según el espacio disponible y calcula su altura a partir de su posición real. Se ajusta al cambiar el ancho, la altura o el estado de la barra lateral. Con una ventana de 800 × 500 px, el panel quedó entre x236 y x780, y entre y314 y y488; su contenido se desplaza dentro del panel.

La navegación lateral puede desplazarse en ventanas bajas sin comprimir enlaces ni botones. Los controles segmentados tienen un anillo de foco interior que contrasta también sobre la opción seleccionada, soporte de Inicio y Fin y una parada de Tab cuando no hay un valor válido. Los textos se ajustan al ancho disponible: se comprobó un grupo de 214 px con las tres opciones completas. Se revisó el foco en ambos temas y se incorporaron colores del sistema para alto contraste.

Claude implementó el control segmentado mediante cc:rescue y declaró uso de impeccable, design:accessibility-review y design:design-critique. Codex integró los cambios, corrigió la distribución con poco ancho y verificó el resultado guardado en Chromium. La suite completa aprobó 513 pruebas en 100 archivos y 8 de bundle; tipos, lint, formato y build también pasaron. No se modificaron las reglas de detección ni se crearon commits.

Referencia de composición: [ARGUS Rediseño inicial](mockups/ARGUS%20Rediseño%20inicial.md).

Las capturas de esta sesión se guardan fuera del repositorio, en `ARGOS-app-escritorio/output/playwright/`. Incluyen Inicio, Expediente, alertas, detalle, Comparar, matriz, inconsistencias, envío, Historial, Ajustes, informe y expresiones de la mascota.

El informe Word basado en Design Report no se generó: el renderizador de documentos falló porque no encontró LibreOffice en el runtime incluido. La plantilla original permanece intacta; este registro Markdown documenta el trabajo técnico y no pretende reproducir su formato.

### Tercera tanda (8 de noviembre de 2026)

Claude implementó los seis objetivos aprobados. La propuesta concreta se registró antes en [ARGUS Rediseño inicial](mockups/ARGUS%20Rediseño%20inicial.md), sección «Tercera tanda». Skills usadas: impeccable (contexto, craft floor y detector, sin hallazgos), design:design-critique y design:accessibility-review, aplicadas sobre capturas reales.

**Crítica previa (capturas a 1280 × 800).** Con el motor caído, Comparar mostraba tres veces el mismo problema: la barra superior («Asistente de IA: en pausa · Reintentar»), un bloque de error de 140 px en el contenido y «En pausa» en la barra lateral. Inicio repetía el estado («Listo») bajo la mascota. El contenido de Inicio flotaba centrado en el vacío, con la mascota separada del texto. Ajustes era una lista larga de ocho secciones del mismo peso, separadas por líneas.

| Objetivo | Decisión implementada |
| --- | --- |
| Aviso de conexión | Un solo aviso fijo bajo la barra superior (`EngineConnectionNotice`), con qué pasó, por qué y qué hacer, más «Reintentar conexión». Mientras comprueba dice «Comprobando…»; si sigue caído, «Seguía sin responder a las HH:MM». Desaparece solo cuando `/health` responde. Inicio, Comparar y Envío ya no pintan su propio bloque. La barra superior ya no repite la pausa; el estado del asistente queda en la barra lateral. Ajustes no duplica el aviso cuando la causa es el motor detenido. |
| Inicio | Bloque alineado arriba: mascota (128 px, decorativa, misma expresión real) junto al título, la explicación y las acciones. «Nueva revisión» es primaria con icono y atajo; «Comparar dos versiones» sigue al lado. Debajo, los tres pasos reales («Cargar», «Confirmar lectura», «Revisar») con una frase cada uno. Con una sesión real se conserva su resumen y las comparaciones recientes, con la mascota a 48 px. Ocultar el asistente no deja hueco. |
| Tipografía | Roles en tokens (`--text-page-title-*`, `--text-group-title-*`, `--text-section-title-*`, `--text-description-*`, `--text-auxiliary-*`), usados por Inicio, Comparar, Expediente, Historial, Envío, Informe, estados vacíos y Ajustes. Sin fuentes nuevas. |
| Bordes | Se quitaron la línea inferior de la barra superior, las líneas de la marca y del pie de la barra lateral, los contornos de las tarjetas del asistente y de sesión, el borde del índice de Ajustes y los divisores entre sus secciones. Se conservaron la línea lateral de la barra lateral, los contornos de controles, el foco y el estado activo. |
| Ajustes | Dos grupos: «Análisis» (Detección, Privacidad, Inteligencia artificial, OCR; dependen del motor) y «Esta aplicación» (Idioma y región, Apariencia, Asistente, Atajos; funcionan sin motor). El índice muestra los grupos como encabezados de texto. Títulos de grupo a 20 px y de sección a 16 px. |
| Tema oscuro | Fondo de trabajo `#121110`, paneles `#1e1c19` y elevados `#2d2a26`. Una prueba exige un salto de contraste de 1.1:1 o más entre planos consecutivos (antes, 1.07:1). También se prueban el foco y el contorno de controles sobre los fondos nuevos. |

**Verificación observada.** Se usó un servidor Vite propio en `localhost:1430` y el motor real en `127.0.0.1:8765`, con datos temporales y `ARGUS_DEV_ORIGIN`. Se revisaron estas capturas:

- Inicio y Ajustes en claro y oscuro a 1280 × 800.
- Inicio, Comparar y Ajustes con el motor caído, en claro a 1280 × 800 y en oscuro a 800 × 500.
- Inicio a 800 × 600.
- Comparar con datos reales: dos TXT con 14 cambios, en claro a 1280 × 800.
- Opciones de Comparar en oscuro a 800 × 500: el panel quedó en x236–780 e y314–488, las mismas cifras que la tanda anterior, sin regresión.

No hubo desborde horizontal en ninguna captura. El foco del botón del aviso y del índice de Ajustes se ve en ambos temas. El reintento fallido muestra la hora real.

El motor caído se simuló bloqueando en el navegador las peticiones a `127.0.0.1:8765`. Las capturas están en `ARGOS-app-escritorio/output/playwright/tercera-tanda/`.

**Pruebas.**

- `tsc`, ESLint, Prettier y Stylelint, limpios.
- Vitest: 624 pruebas en 133 archivos, más 8 del bundle.
- Build y `git diff --check`, aprobados.

Las pruebas nuevas cubren lo siguiente:

- El aviso es único, también al cambiar de pantalla.
- La barra superior no repite el estado.
- El reintento fallido muestra la hora y el aviso desaparece cuando el motor vuelve.
- Inicio explica los pasos sin repetir el estado.
- Ajustes queda agrupado y los ajustes locales siguen disponibles con el motor detenido.
- Contraste de los planos oscuros y del aviso.

**Limitaciones.**

- **Conexión en la vista web.** En `localhost:1420` el error del motor no era de CORS: no había ningún proceso escuchando en `127.0.0.1:8765`, el puerto de `.env.local`, y la API acepta `http://localhost:1420`. Además, el Vite de 1420, del `tauri dev` en curso, servía transformaciones HMR obsoletas («does not provide an export named 'SettingsPage'»). Por eso no se usó para verificar. Hay que reiniciarlo para ver los cambios.
- **Superficies sin verificar.** Expediente, Historial, Envío e Informe con datos no se capturaron en esta tanda. Allí el cambio fue solo de tokens tipográficos con los mismos valores (24/32 semibold), y lo cubren las pruebas existentes. No se revisó la app nativa en WebView2 ni en WebKitGTK. Tampoco se evaluó con usuarios. No se tocaron la detección ni el motor.

### Cuarta tanda: hallazgos de la revisión nativa (9 de noviembre de 2026)

Claude implementó los seis hallazgos que Codex registró tras reiniciar `tauri dev`. La propuesta se escribió antes en [ARGUS Rediseño inicial](mockups/ARGUS%20Rediseño%20inicial.md), sección «Cuarta tanda».

Skills usadas:

- impeccable (craft floor y detector, sin hallazgos);
- design:design-critique. Detectó que la ruta larga de Comparar se partía en dos líneas dentro de la cabecera; se corrigió.
- design:accessibility-review. Se comprobaron el foco del enlace de la ruta, la descripción accesible del campo obligatorio y el recorrido con flechas.

| Hallazgo | Decisión implementada |
| --- | --- |
| 1. Ajustes durante el arranque | `useReloadWhenEngineReady`: cuando el motor pasa a responder, recarga **solo** las secciones que fallaron, una vez por transición. Lo ya cargado no se pide de nuevo. Mientras el motor arranca o está detenido, Ajustes no muestra su propio error. Si vuelve a fallar con el motor listo, el error real aparece con «Reintentar» y no hay bucle. |
| 2. Historial | Lista y detalle lado a lado desde 960 px de contenido. El panel mide entre 280 y 340 px (`--history-aside-width`). Con menos ancho, la pantalla es una sola columna que se desplaza entera: todas las sesiones con su altura natural y, debajo, el detalle en un panel separado. |
| 3. Ejes y márgenes | Tokens `--page-inset-inline` (24 px) y `--page-inset-top` (20 px) en Inicio, Comparar, Historial, Nueva revisión, Envío, Expediente y Ajustes. Inicio y los estados vacíos se alinean a la izquierda en lugar de centrarse. |
| 4. Cargar | Sin archivos, la zona de carga es vertical y amplia (`--upload-zone-min-height`, entre 240 y 400 px), con icono de 40 px y texto de 16 px. Con archivos vuelve a ser una fila. «Nombre de la sesión» muestra «(obligatorio)» como `aria-required`, una ayuda («Identifica la revisión en el Historial, en el selector de sesión y en el informe.») y un ejemplo. Las reglas de carga no cambian. |
| 5. Texto auxiliar | `--font-size-auxiliary` 13/18 para formatos, notas y la línea local de la barra lateral. Los atajos (Kbd, barra de atajos) y los encabezados de columna del Historial pasan de 11 a 12 px; las columnas, además, a texto secundario. Los valores de las tablas no cambian. |
| 6. Cabecera | La cabecera muestra el icono y el nombre de la sección actual. Las pantallas internas llevan allí su ruta mediante un portal (`TopbarLocation`), y la ruta deja de repetirse dentro de la página. Va en una línea de 14 px; si no cabe, solo se recorta el nivel actual. |

**Verificación observada.** Se usó un entorno separado: Vite propio en `localhost:5180` y motor real en `127.0.0.1:8765` con `ARGUS_DATA_DIR` temporal. Ahí se sembraron siete revisiones de prueba desde la propia interfaz. No se tocaron el `tauri dev` de 1420, sus datos ni las preferencias del usuario. El puerto 1430 quedó reservado por el sistema y no se usó.

- **Historial**
  - 1274 × 720: lista y detalle lado a lado, con las 7 filas visibles.
  - 1024 × 560: 0 contenedores con desplazamiento propio dentro del área principal. Con las flechas se llega a la última fila, que queda seleccionada, y el detalle aparece debajo, separado.
- **Ejes:** el título de Comparar, Historial y Nueva revisión empieza en x = 240 y el bloque de Inicio también.
- **Cargar:** zona de 686 × 288 px a 1274 × 720 y de 760 × 240 px a 1024 × 560.
- **Comparar con datos (2 TXT)**
  - Ruta en una línea.
  - Opciones a 800 × 500 en x240–776 / y296–488, dentro de la ventana.
- **Foco:** el enlace «Inicio» de la ruta tiene foco visible y Enter vuelve a Inicio.
- **Ajustes:** se detuvo el motor propio, se abrió Ajustes y se volvió a arrancar el motor. A los 26 s las secciones cargaron sin pulsar «Reintentar» y sin errores en pantalla. En el navegador, la petición quedó pendiente en vez de fallar. La ruta «falla y luego se recupera» la cubren las pruebas nuevas, que fallan si se quita la recuperación.

Capturas en `ARGOS-app-escritorio/output/playwright/cuarta-tanda/`, en ambos temas.

**Pruebas.** `tsc`, ESLint, Prettier y Stylelint limpios. Vitest: 631 pruebas en 137 archivos, más 8 del bundle. Build y `git diff --check`, aprobados.

Pruebas nuevas:

- recuperación de Ajustes, con su comprobación de que no hay bucle;
- recorrido del Historial con el teclado;
- ubicación y ruta en la cabecera;
- ayuda y marca de obligatorio del nombre de la sesión.

**Límites.**

- La app nativa (WebView2) no se inspeccionó en esta tanda: estaba en manos de la sesión de Codex y no se reinició.
- La ventana a 1274 × 720 se reprodujo en Chromium.
- No se comprobó el lector de pantalla real (NVDA).

### Quinta tanda: lectura de diferencias, decisiones, documentos largos, informe y mascota (9 de noviembre de 2026)

Propuesta registrada antes de implementar en [ARGUS Rediseño inicial](mockups/ARGUS%20Rediseño%20inicial.md), sección «Quinta tanda». Skills usadas: impeccable (detector, sin hallazgos), design:design-critique y design:accessibility-review, sobre capturas reales.

**Datos de prueba.** Fueron sintéticos y quedaron fuera del repositorio:

- dos contratos de 60 cláusulas, con 4857/4587, montos, fechas y un nombre propio cambiado («Rodríguez»/«Rodrigues»);
- nombres de archivo de unos 90 caracteres;
- un correo de prueba;
- el motor real en `127.0.0.1:8765`, con `ARGUS_DATA_DIR` temporal y `uv run --no-sync` (sin red), y Vite propio en `localhost:5180`.

La revisión dio 80 alertas (78 altas y 2 medias); Comparar dio 30 cambios. No se usaron documentos ni sesiones del usuario y no se tocó el `tauri dev` de 1420.

**Crítica previa (capturas a 1280 × 800).**

- En el detalle de alerta, los botones de decisión quedaban fuera de la vista.
- La explicación mostraba nombres de archivo de 90 caracteres en negrita de 15 px con un interlineado de 32 px.
- Los nombres en monoespaciada se partían a mitad de palabra y aparecía un «·» suelto delante de «Línea 1».
- El aviso de decisión flotaba sobre el texto, en el detalle y en Comparar.
- La «Es un error» elegida solo se distinguía por un tono más oscuro.
- La cabecera repetía el nombre de la sesión, que también estaba en el selector.
- En la tabla de evidencia del PDF, «Riesgo», «Alto» y el «#» de dos cifras se partían letra a letra.

| Objetivo | Implementado |
| --- | --- |
| 1. Diferencias y origen | El valor se marca dentro del fragmento citado (`HighlightedExcerpt`, fondo y subrayado). El origen es una sola línea de texto: archivo · ubicación, y la ubicación no se parte. Los nombres de archivo se parten en `_ - . /` con `<wbr>` (`BreakableText`) sin cambiar el texto copiado. La frase resumen pasa a 15/22 medium. La ruta usa «Expediente › Alerta N». En Comparar, la letra A o B va pegada a su documento. |
| 2. Decisiones | La opción elegida dice «Elegida», con icono. El bloque muestra «N de T decididas · M pendientes» con su barra, tomado de `SessionSnapshot`. La confirmación con «Deshacer Ctrl Z» va dentro del bloque en el detalle y arriba del panel lateral en Comparar. No cambian la semántica ni la persistencia. |
| 3. Documentos largos | El bloque de decisión es el último hijo del detalle y queda fijo al pie (`position: sticky`). Si el panel mide menos de 480 px de alto, queda en el flujo. Con `scroll-padding`, el foco no queda escondido detrás del bloque. No se añadieron barras de desplazamiento anidadas: solo la lista y el detalle tienen la suya. |
| 4. Informe | El resumen agrega «Por riesgo: 78 altas, 2 medias y 0 bajas. Quedan 77 alertas de riesgo alto sin decidir.». Evidencia y Decisiones llevan «#»; Evidencia también «Riesgo». En el PDF, `report_column_widths.py` da a las columnas cortas el ancho de su palabra más larga y reparte el resto. En el DOCX, la fila de títulos se repite en cada página. En la vista previa, la tabla tiene ancho automático. No cambian los datos, las fuentes ni el análisis. |
| 5. Mascota | El color del estado cambia con un fundido de 250 ms. Las dos poses están dibujadas y cambian con un fundido. La figura pequeña de la barra lateral ya no salta al encontrar un problema o terminar: solo cambia de expresión. No hay bucles. El movimiento reducido pone las duraciones a 0. |

**Verificación observada.**

- **Detalle de alerta**
  - 1280 × 720: el bloque se ve desde arriba y sigue fijo al desplazar.
  - «Ver detalle» con foco queda por encima del bloque: borde inferior en y454, bloque desde y470.
  - 800 × 500: el bloque queda en su sitio, sin tapar, y la ruta muestra «Expediente › Alerta 78».
- **Decidir y deshacer**
  - E deja «Es un error · Elegida», confirmación en el bloque y «1 de 80 decididas · 79 pendientes»; Ctrl Z vuelve a «0 de 80».
  - A 800 × 500, una reproducción directa confirmó que Ctrl Z restaura la decisión anterior. En una primera captura no se vio deshecho, por la temporización del guion.
- **Comparar**
  - 1280 × 800: la confirmación aparece arriba del panel lateral y no tapa el texto.
  - 800 × 500: «A nombre» y «→ B nombre» van uno por línea.
- **Informe**
  - Se interceptó en el navegador la petición de exportación para no escribir en `Documentos\ARGUS` del usuario. El documento capturado se maquetó con los renderizadores reales del motor en una carpeta temporal.
  - PDF de 7 páginas convertido a PNG con pdftoppm e inspeccionado: encabezado repetido, columnas cortas en una línea y nombres partidos dentro de la celda.
  - DOCX revisado por estructura con python-docx: 5 títulos, tablas de 5 columnas con fila de encabezado repetida y pie con campos de página.
- Capturas y renders en `ARGOS-app-escritorio/output/playwright/quinta-tanda/`.

**Pruebas.**

- **Interfaz:** `tsc`, ESLint, Prettier y Stylelint limpios; Vitest 642 de 642 en 138 archivos, más 8 de 8 del bundle; build y `git diff --check`, aprobados. Pruebas nuevas o ampliadas:
  - bloque de decisión (progreso, «Elegida», confirmación y deshacer en el bloque);
  - confirmación de Comparar en el panel lateral;
  - columnas y desglose por riesgo del informe;
  - la mascota pequeña no salta;
  - contraste de los fondos nuevos en ambos temas.
- **Motor:** ruff, black y mypy estricto limpios; pytest 1767 de 1767 con 99 % de cobertura. Pruebas nuevas de anchos de columna y de la fila de encabezado del DOCX.

**Límites.**

- **App nativa:** no se verificaron en WebView2 ni Resultados ni exportaciones; la sesión nativa es del usuario y no se abrieron sus revisiones.
- **DOCX:** no se inspeccionó a la vista, porque en el equipo no hay LibreOffice ni Word por línea de comandos. Se revisó solo su estructura.
- **Mascota:** los fundidos no se pueden ver en capturas fijas; se verificaron por código y pruebas.
- **Comparar:** la lista que bajaba unos 50 px al aparecer la confirmación quedó corregida después; ver «Corrección de la quinta tanda».


### Corrección de la quinta tanda y comprobación nativa (9 de noviembre de 2026)

**Regresión corregida.** En Comparar, al aparecer la confirmación arriba del panel, la lista de cambios bajaba y el cambio elegido salía de la vista. Medida antes de corregir, en Chromium a 1280 × 800: la lista pasaba de y348 a y402 y la fila elegida quedaba en y496–532, fuera del área visible, que terminaba en y478.

**Solución.** `DecisionStatusSlot` es una franja de alto fijo arriba del panel lateral.

- En reposo muestra «J K moverse · C E I decidir · Ctrl Z deshacer». Reemplaza la línea «J K para navegar» de la cabecera de la lista, que se retiró junto con su clave de i18n.
- Al decidir, la confirmación con «Deshacer» ocupa la misma celda.
- El alto lo fija una copia oculta (`aria-hidden`, `visibility: hidden`, sin foco) de la confirmación más larga posible para esa comparación, con el número de cambio más alto y la etiqueta de decisión más larga. Por eso la franja no crece al aparecer el aviso ni encoge al deshacer.
- La confirmación se funde y, oculta, sale del árbol accesible. No roba el foco ni tapa texto.
- Una medida fija de 56 px no bastaba en WebView2: con el texto a escala 150 % el mensaje ocupaba tres líneas y la lista seguía bajando 20 px. Por eso se mide con la copia oculta.
- Costo: en reposo la lista pierde unos 31 px de alto. Antes perdía 54 px cada vez que aparecía la confirmación.

**Verificación de la corrección.** Posición de la fila elegida antes de decidir, con la confirmación, tras Ctrl Z y con la confirmación ya retirada:

- **Chromium, 1280 × 800, claro y oscuro:** la fila se mantiene en y442–478 dentro de la lista (y379–478) en los cuatro momentos.
- **Chromium, 800 × 500, claro y oscuro:** la fila se mantiene en y407–443 dentro de la lista (y143–443). Al decidir, el panel apilado se desplaza hasta el cambio siguiente, como ya lo hacía.
- **WebView2 nativo, 1280 × 700 CSS a escala 150 %, claro y oscuro:** la fila se mantiene en y395–431 en los cuatro momentos.
- En todos los casos, el foco sigue en el mismo elemento.

Prueba de regresión en `changeDecisions.test.tsx`:

- la confirmación aparece en la misma franja que los atajos, antes de la lista;
- los atajos se ocultan con `aria-hidden` mientras se ve la confirmación;
- existe la copia de medida oculta;
- el foco no se mueve.

**Comprobación nativa.** Se hizo con una instancia propia del ejecutable de desarrollo (`target/debug/argus.exe`), aislada de la del usuario:

- `ARGUS_DATA_DIR` y `WEBVIEW2_USER_DATA_FOLDER` temporales;
- `UV_NO_SYNC=1`;
- depuración remota de WebView2 (Edg/157) en el puerto 9333, controlada con Playwright por CDP.

Al arrancar, Inicio decía «Todavía no hay revisiones», y la base `argus.sqlite3` apareció en la carpeta temporal: la instancia no veía el historial del usuario. Se creó la revisión «QA ARGUS sintético – no es una revisión real» con los dos contratos sintéticos, que dio 73 alertas. Se comprobó:

- **Resultados.**
- **Detalle:** bloque de decisión fijo, «Elegida» y confirmación dentro del bloque.
- **Decidir y deshacer:** E pasó a «1 de 73 decididas · 72 pendientes» y Ctrl Z volvió a «0 de 73».
- **Vista previa del informe:** columnas «#» y «Riesgo» y desglose por riesgo.
- **Comparar:** estable en ambos temas.

No se exportó (la carpeta sería `Documentos\ARGUS`), no se abrió «Ver detalle» y no se tocaron claves, proveedores ni privacidad. Al terminar se cerró la instancia propia y se borraron su perfil y sus datos temporales. La app del usuario (`tauri dev`, proceso lanzado por `cargo run`) siguió abierta y no se tocó.

**Checks.** `tsc`, ESLint, Prettier y Stylelint limpios. Vitest: 642 de 642 en 138 archivos, más 8 de 8 del bundle. Build y `git diff --check`, aprobados; el detector de impeccable no dio hallazgos. Skill de esta corrección: design:accessibility-review, para el foco, la región viva y la copia oculta.

Capturas en `ARGOS-app-escritorio/output/playwright/quinta-tanda/correccion/`.

**Límites que se mantienen.**

- El DOCX solo se revisó por estructura.
- A 1280 × 700 CSS en la app nativa, la lista de Comparar muestra una sola fila: el panel lateral reparte poco alto entre la lista y el detalle. Ya pasaba antes de esta corrección y no se cambió, para no ampliar el alcance. El cambio elegido siempre queda visible.
