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
