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
