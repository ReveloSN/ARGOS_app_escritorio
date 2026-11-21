# ARGUS Rediseño inicial

Versión implementada del rediseño visual solicitado por el usuario el 7 de noviembre de 2026. Complementa los mockups HTML existentes. Se mantienen la detección, las decisiones y los flujos de exportación; se actualizan jerarquía, legibilidad y adaptación al ancho.

## Jerarquía

Inicio presenta primero el expediente o el mensaje de bienvenida, después las acciones y las comparaciones recientes cuando existen. La mascota acompaña a la derecha; cuando no cabe, aparece después del contenido. Se retira la retícula de fondo de Inicio. La barra lateral conserva la navegación y presenta Nueva revisión como acceso secundario para evitar competir con la acción principal de la pantalla.

## Base compartida

Texto de cuerpo de 14 px; controles medianos de 34 px, grandes de 36 px y extra grandes de 40 px. Se conserva IBM Plex y el acento petróleo de ambos temas. Los controles tienen un token de borde propio, con contraste mínimo de 3 a 1; los separadores mantienen sus tokens anteriores. El foco debe ser distinguible del estado hover. Las fuentes de las explicaciones se presentan como mínimo a 12 px.

## Mascota

Personaje SVG con cuerpo redondeado, pequeñas extremidades y una hoja. Reutiliza las siete expresiones del asistente y sus señales reales, sin alterar el cálculo del estado. El logo original permanece separado. El único movimiento es un parpadeo breve al cambiar de expresión, desactivado por las preferencias de movimiento reducido existentes.

Se muestra en Inicio, en la barra expandida y en los lugares que ya empleaban AssistantEye. En la barra contraída se utiliza el ojo simple para mantener su legibilidad. Ocultar el asistente retira la figura y conserva el estado textual. Junto a texto equivalente, la figura es decorativa para evitar anuncios duplicados.

Las expresiones se pueden inspeccionar en desarrollo en `/dev/design-system`. El catálogo se excluye del build de producción. No se añaden datos ficticios a las pantallas de producción.

## Expediente y alertas

El nombre del expediente ocupa una fila propia y puede ajustarse completo. Las acciones se agrupan debajo y las pestañas conservan su orden. El tipo de un dato no se repite cuando coincide con su nombre. La tabla mantiene la altura natural de todas sus filas; su contenedor ofrece desplazamiento cuando hace falta. El panel de documentos contradictorios pasa debajo de la tabla cuando no hay espacio suficiente para ambos.

Las tarjetas de Valor A y Valor B se apilan cuando el área del detalle es estrecha. Cada archivo y ubicación permanece visible y los nombres largos se ajustan en líneas. Las tablas de alertas conservan un ancho mínimo legible y se desplazan dentro de su contenedor.

## Comparar

La lista de cambios y la explicación seleccionada ocupan zonas independientes del panel lateral. Abrir una explicación no inserta contenido entre los demás cambios. El botón seleccionado identifica su panel con aria-controls; los atajos J y K conservan el orden y traen la fila seleccionada a la vista. El texto y el panel lateral pasan a filas con altura suficiente cuando no caben lado a lado. Se preservan los modos Versiones, Inconsistencias y Matriz.

## Envío e informe

El borrador de correo y su panel de problemas se muestran lado a lado con espacio suficiente y se apilan por debajo de 900 px de contenido. Los nombres de los adjuntos no se cortan y los problemas tienen títulos semánticos. La vista previa del informe aplica la misma adaptación; la tabla de evidencia ajusta sus columnas y parte los nombres largos dentro de la hoja. Las opciones de exportación siguen accesibles al desplazarse.

## Historial y ajustes

El Historial deja de reservar un panel lateral vacío cuando no hay sesión seleccionada. En ancho reducido, las decisiones pasan debajo de la lista sin partir a la mitad la altura disponible. Los nombres largos de sesión se ajustan dentro del panel. En Ajustes, el índice lateral se convierte en filas de navegación cuando falta espacio para el formulario. Se unifican contornos de campos, filtros y selectores con el token accesible de controles.

## Paneles y foco

Opciones de Comparar se ancla a la barra de herramientas completa, sin invadir la barra lateral. Su altura se limita al espacio real hasta el borde inferior de la ventana y su contenido puede desplazarse; los selectores pasan a una columna cuando no caben lado a lado. Escape cierra el panel y devuelve el foco a Opciones.

En controles segmentados, el foco se dibuja hacia dentro para no recortarse en las esquinas y usa el color del texto sobre la opción seleccionada. Los nombres largos se ajustan sin recortar las opciones. Inicio y Fin eligen los extremos del grupo. La navegación lateral se desplaza cuando la altura disponible no permite mostrar todos sus controles.

## Verificación y límites

Se revisaron visualmente Inicio, carga y confirmación de lectura, Expediente, alertas, detalle, los tres modos de Comparar, borrador de envío, Historial, Ajustes, informe y catálogo en un navegador Chromium. Se usó el motor real con almacenamiento temporal, dos documentos TXT y un correo EML de prueba, con nombres largos y diferencias de monto, fecha, contrato y periodo. Se comprobaron ambos temas y vistas representativas a 800, 1024 y 1280 px. Las pruebas de componentes cubren los flujos existentes, la ocultación y las preferencias de movimiento. Esta verificación no sustituye una evaluación con usuarios ni una ejecución nativa en WebView2 y WebKitGTK.

## Tercera tanda: propuesta aprobada (8 de noviembre de 2026)

Propuesta concreta registrada antes de implementarla. El usuario aprobó los seis objetivos.

### Aviso de conexión único

- Con el motor detenido aparece **un solo aviso**, una franja bajo la barra superior que ocupa todo el ancho del área de trabajo, en cualquier pantalla. Contiene las tres partes obligatorias del mensaje de error: «El motor de análisis no responde.», el porqué y el qué hacer, más el botón «Reintentar conexión». Mientras se reintenta, el botón dice «Comprobando…» y queda desactivado; el aviso desaparece solo cuando el motor responde de verdad.
- Inicio, Comparar y Revisar antes de enviar dejan de pintar su propio bloque de error. Ajustes no repite el aviso de carga si el motivo es el motor detenido; su error propio sigue para fallos de guardado o si el motor responde y la carga falla.
- El estado del asistente de IA vive en la barra lateral (mascota y texto «En pausa»). La barra superior ya no repite «Asistente de IA: en pausa · Reintentar»; solo muestra el avance de lectura, o el estado cuando la barra lateral está contraída y no hay un aviso de conexión.
- Inicio no repite el texto de estado bajo la mascota: la figura grande es decorativa y su expresión sale del mismo estado real.

### Inicio

- Un bloque de bienvenida alineado arriba (no centrado en el vacío): la mascota a la izquierda del texto, a 112 px, dentro del mismo bloque; título, explicación breve y acciones a la derecha. Debajo, los tres pasos reales de una revisión («Cargar», «Confirmar lectura», «Revisar») en una fila con una frase cada uno, separados por espacio y no por tarjetas.
- «Nueva revisión» es la acción primaria; «Comparar dos versiones» queda como secundaria al lado; «Ver el historial» aparece solo si hay revisiones guardadas.
- Con una sesión real, Inicio muestra su resumen y comparaciones recientes como hasta ahora, y la mascota pasa a tamaño mediano (48 px) junto al título del resumen. Con el asistente oculto, no se reserva su hueco.
- A menos de 640 px de contenido los pasos se apilan; solo por debajo de 480 px la mascota pasa encima del texto, para que «Nueva revisión» siga visible en ventanas de 800 × 500.

### Tipografía

Roles con tokens propios: título de página 24/32 semibold; descripción de página 14/24 en texto secundario; título de sección 16/22 semibold; título de grupo 20/28 semibold; texto auxiliar 12/16 en terciario. Inicio, Comparar, Expediente, Historial, Envío y Ajustes usan los mismos roles.

### Bordes

- Se retiran: el borde inferior de la barra superior (comparte el fondo del área de trabajo), el contorno de las tarjetas del asistente y de la sesión activa, el divisor entre la marca y la navegación, la línea sobre el pie de la barra lateral, el borde lateral del índice de Ajustes y los divisores entre secciones de Ajustes (los reemplaza el espacio y el título).
- Se conservan: la línea lateral de la barra lateral (en el tema claro el cambio de fondo con el área de trabajo es casi imperceptible y es la única separación estructural), contornos de campos, botones secundarios, selectores y tablas; foco; elemento activo de la navegación (fondo más borde).

### Ajustes

Dos grupos con título propio: «Análisis» (Detección, Privacidad, Inteligencia artificial, OCR; dependen del motor) y «Esta aplicación» (Idioma y región, Apariencia, Asistente, Atajos de teclado; se guardan en el equipo y funcionan sin motor). El índice muestra los grupos como encabezados no interactivos. Cada sección tiene título de 16 px; cada grupo, título de 20 px y una línea de explicación.

### Tema oscuro

Tres planos más separados: fondo de trabajo `#121110`, paneles y barras `#1e1c19`, controles y elevados `#2a2723`. Los contornos de controles y el foco mantienen contraste de 3:1 o más sobre cada plano.

## Cuarta tanda: revisión nativa (propuesta aprobada, 9 de noviembre de 2026)

Propuesta concreta registrada antes de implementar los seis hallazgos de la revisión nativa de Codex. El usuario autorizó los seis.

### 1. Ajustes durante el arranque

- Si Ajustes se abre mientras el motor arranca y alguna carga falla, cada sección afectada dice «Disponible cuando el motor responda.» y no se muestra un error: todavía no lo es.
- Cuando el motor pasa a responder, se vuelve a pedir **solo** lo que falló, una vez por cada vez que el motor vuelve. Lo que ya cargó no se pide de nuevo, así no se pierde lo que el usuario está escribiendo.
- Si la carga falla otra vez con el motor listo, aparece el error en tres partes con «Reintentar», sin reintentos automáticos en bucle. Los errores de guardado se siguen mostrando como antes.

### 2. Historial

- Lista y detalle quedan lado a lado desde 960 px de contenido (antes, 1120). El panel de decisiones mide entre 280 y 340 px y la tabla conserva su ancho mínimo, con desplazamiento propio si no cabe.
- Con menos ancho, la pantalla deja de repartir la altura entre dos zonas con desplazamiento propio. Se lee como una sola columna que se desplaza entera: encabezado y métricas, todas las sesiones con su altura natural y, debajo, las decisiones de la sesión elegida, separadas por un título propio y un espacio.
- Las flechas recorren todas las filas y cada fila enfocada se trae a la vista. El detalle ya no comprime la lista.

### 3. Ejes y márgenes comunes

- Todas las pantallas principales (Inicio, Comparar, Historial, Nueva revisión, Revisar antes de enviar, Ajustes) empiezan su contenido a 24 px del borde izquierdo del área de trabajo y a 20 px de la cabecera. Los valores salen de los tokens `--page-inset-inline` y `--page-inset-top`.
- Inicio y los estados vacíos de página (Comparar, Enviar) se alinean al mismo eje izquierdo, sin centrarse en el vacío. Su texto conserva el ancho de lectura (máximo 880 px). Las tablas y los documentos usan todo el ancho disponible.

### 4. Nueva revisión · Cargar

- La zona de arrastre crece: ocupa al menos 240 px de alto y, en ventanas altas, hasta la mitad de la altura disponible. Lleva un icono mayor, el título «Arrastre aquí los archivos» y el botón «Elegir archivos» centrados. Las reglas de carga no cambian.
- «Nombre de la sesión» es obligatorio, como ya lo exige «Leer y comparar». La etiqueta dice «(obligatorio)» y una ayuda explica para qué sirve: identificar la revisión en el Historial y en el informe, por ejemplo «Contrato 4857 – Proveedor X».

### 5. Texto auxiliar

- Texto auxiliar a 13/18 px (antes, 12/16), con el token nuevo `--font-size-auxiliary`: atajos (Kbd), formatos aceptados, notas al pie, línea local de la barra lateral y encabezados de columna del Historial. Los encabezados de columna pasan de 11 px en mayúsculas a 12 px en mayúsculas, con más espaciado.
- Los valores monoespaciados de las tablas no cambian de tamaño, para conservar la densidad.

### 6. Cabecera global

- A la izquierda de la cabecera aparece la ubicación actual. En las secciones de primer nivel muestra el icono y el nombre de la sección («Historial», «Ajustes»). En las pantallas internas muestra la ruta contextual que antes iba dentro de la página: «Inicio › Nueva revisión», «Comparar › A frente a B», «Expediente › Alerta 3», «Revisar antes de enviar › …».
- Las migas de pan se retiran del cuerpo de cada página: no se repiten y se gana una fila vertical. El título de la página (h1) se mantiene.
- La ruta ocupa una sola línea a 14 px. Si no cabe, solo se recorta el nivel actual, con elipsis; su nombre completo queda en el título emergente y en la propia pantalla.
- Búsqueda, selector de sesión, atajos y navegación lateral no cambian.

## Quinta tanda: lectura de diferencias, decisiones, documentos largos, informe y mascota (propuesta aprobada, 9 de noviembre de 2026)

Propuesta registrada antes de implementar. Sale de capturas con datos de prueba: dos contratos de 60 cláusulas con 4857/4587, montos, un nombre propio cambiado y nombres de archivo de unos 90 caracteres, más un correo. El usuario aprobó los cinco objetivos.

### 1. Lectura de diferencias y origen

- **Fragmento:** el valor dentro del fragmento citado se marca (`<mark>`, fondo de diferencia y subrayado, no solo color), para que se vea dónde está en el texto de origen. Si el fragmento no contiene el valor literal, se muestra tal cual.
- **Origen:** archivo y ubicación forman una sola línea de texto: «archivo · Línea 1». Ya no aparece un «·» suelto al partir la línea. Los nombres largos se parten después de `_`, `-` y `.`, nunca a mitad de palabra, y se muestran completos.
- **Explicación:** la frase resumen pasa de 15 px semibold con interlineado de 32 px a 15 px medium con 22 px. Un nombre de archivo sin espacios se parte solo si no cabe; en la frase no se agregan puntos de corte, para no alterar el nombre accesible del título.
- **Ruta de la cabecera:** «Expediente › …» en lugar del nombre de la sesión, que ya muestra el selector de sesión. Revisar antes de enviar usa solo su sección.
- **Comparar:** en la cabecera, cada documento es una unidad «A nombre» y «B nombre», una por línea cuando no caben juntos, sin separar la letra de su nombre.

### 2. Decisiones

- La opción elegida muestra «Elegida» con un icono, además del color. «Es un error», que siempre va rellena, ya no depende solo de un tono más oscuro.
- Encima de las opciones, el progreso: «N decididas · M pendientes de T». Sale de `SessionSnapshot` en el expediente y de la comparación en Comparar.
- En el detalle de una alerta, la confirmación («Alerta 1 marcada como «Es un error»» con «Deshacer Ctrl Z») aparece dentro del bloque de decisión, no flotando sobre el texto. En Comparar, como al decidir se pasa al cambio siguiente, va arriba del panel lateral, encima de la lista «Cambios».

### 3. Documentos largos

- En el detalle de una alerta, el bloque de decisión es el último elemento del detalle y queda fijo al pie del panel mientras se lee, desde el principio del desplazamiento. Va en flujo normal, con fondo y línea superior: cuando se llega al final ocupa su sitio y no tapa nada. El panel de detalle sigue siendo la única zona con desplazamiento propio.
- Si el panel de detalle mide menos de 480 px de alto (por ejemplo, a 800 × 500), el bloque queda en su sitio, sin fijarse: fijo taparía casi todo. C, E e I siguen a mano.
- Lo que recibe el foco se desplaza por encima del bloque fijo, no detrás (`scroll-padding`).
- Comparar conserva su panel de decisión fijo bajo la frase resumen (segunda tanda).

### 4. Informe

- **Resumen:** después de las cifras, una línea con el desglose por riesgo de los datos reales: «Por riesgo: 78 altas, 2 medias, 0 bajas» y cuántas altas siguen pendientes.
- **Evidencia:** columnas «#», «Riesgo», «Dato», «Valor A · origen» y «Valor B · origen», en el orden de las alertas. La tabla de decisiones también lleva «#».
- **PDF:** anchos de columna según el contenido, con columnas estrechas para «#» y «Riesgo». Los nombres de archivo largos se parten dentro de su celda y el encabezado de la tabla se repite en cada página. DOCX: la misma estructura, y la fila de títulos se repite en cada página. Nada se omite ni se resume.

### 5. Mascota

- Al cambiar de estado, el color pasa con una transición de 250 ms en lugar de saltar, y los brazos de la pose «celebrar» aparecen con un fundido. Sin bucles.
- En la barra lateral (pantallas de trabajo), al encontrar un problema o terminar, la figura no salta: solo cambian la expresión y el color. El saltito queda para las figuras de Inicio y de los primeros pasos.
- Con movimiento reducido todo es instantáneo. Ocultar la mascota y los estados de error se conservan.


### Corrección: confirmación en Comparar sin mover la lista

- Arriba del panel lateral hay una franja de alto fijo. En reposo muestra «J K moverse · C E I decidir · Ctrl Z deshacer», que reemplaza la línea «J K para navegar» de la cabecera de la lista. Al decidir, la confirmación con «Deshacer» ocupa la misma franja.
- El alto lo fija una copia invisible (`aria-hidden`) de la confirmación más larga posible para esa comparación. Por eso ni la lista ni el cambio elegido se mueven cuando la confirmación aparece, cambia o se va. No se roba el foco ni se tapa texto.
