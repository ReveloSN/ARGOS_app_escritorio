# 031 · Comparar con un solo texto, una lista de una línea y una matriz de triángulo superior

- **Estado:** aceptada · 27/10/2026. Reorganiza la pantalla Comparar (versiones y matriz) según «ARGUS Comparar v2», variante 1a; amplía los ADR 021 y 030.
- **Contexto:** la revisión de diseño dijo que Comparar tenía demasiados elementos a la vez y que la etiqueta de riesgo en cada fila se veía mal. Medido: 19 elementos interactivos, 15 colores, paneles de 363 px de texto y, en la matriz, 6 etiquetas «Alto» juntas y cada par dos veces.
- **Decisión:**
  - **Una línea superior** (A → B, «N cambios · M importantes», «Opciones»). Selectores de documento, ignorar, tipos, minimapa, leyenda y el enlace a la matriz viven en «Opciones» (tecla O, cuenta de activas, el foco entra y vuelve).
  - **Un solo texto** (\\`UnifiedDocument\\`): lo eliminado tachado en gris, lo agregado subrayado en el acento, el riesgo alto resaltado y, donde se movió un párrafo, una nota de adónde fue. Se construye solo con los segmentos y las ediciones que entrega el motor.
  - **Lista de una línea por cambio**, riesgo alto primero. El riesgo se marca solo en el alto, con un punto rojo con nombre accesible «Riesgo alto»; medio y bajo no se marcan. Un solo control «Todos / Solo importantes». «Importante» es riesgo alto (antes también incluía riesgo medio por nombres de partes).
  - **El detalle se abre bajo la fila elegida** y es el único lugar con el nivel completo (palabra e icono; medio y bajo en gris). Vocabulario «Documento A dice / B dice»; cada valor lleva archivo y página o sección.
  - **Matriz:** solo el triángulo superior; cada celda muestra el conteo, y el riesgo alto añade tono, icono y el nombre «Riesgo alto, N cambios». El panel derecho detalla el par y «Abrir el par» sirve para cualquiera.
  - **Nombres largos** se recortan con puntos suspensivos y \\`title\\`; no hay desplazamiento horizontal desde 1100×700.
- **Datos:** ninguno nuevo; el riesgo, los tipos, las ediciones y lo movido ya los calculaba el motor (\\`ChangeResult\\`).
- **Descartado:** la variante de dos columnas del mockup (el encargo pide solo la 1a); marcar cada fila con etiqueta de riesgo (era el problema); hacer cada marca del texto una parada de Tab (una por cambio; el teclado usa la lista y J / K).
- **Consecuencias:**
  - El presupuesto de 12 elementos interactivos se cumple fuera del detalle (11) y no con él abierto (15); crece con la cantidad de cambios. Decidido: los 3 modos de la cabecera y las 3 decisiones se cuentan aparte, de modo que con el detalle abierto quedan 9 (ver registro).
  - \\`DocumentPanel.tsx\\` y \\`segmentRuns.ts\\` dejaron de usarse por la vista de versiones (el segundo sigue en la explicación); no se borraron.
  - Sin verificar: tema claro con el rediseño y la app empaquetada.

## Enmienda · crítica de diseño (29/40)
- El detalle del cambio muestra primero la frase resumen y las decisiones (el bloque de decisiones se queda pegado arriba del lateral al desplazarlo); los valores A y B quedan plegados tras «Ver qué dice cada documento» y siguen mostrando archivo y página o sección al abrirlos. Los tres bloques de explicación van en una fila cada uno. Solo en Comparar: el panel de Alertas no cambia.
- En riesgo alto «Es un error» va primero e «Ignorar» es un botón terciario; decidir lleva al siguiente cambio.
- «Opciones» nombra lo activo («Ignorando: formato · Mostrando: Faltan»); el minimapa no cuenta como filtro; la matriz solo se abre con su pestaña. La lista lleva una leyenda de «Riesgo alto».
- Montos, fechas e identificadores sueltos van en monoespaciada y, dentro de un par, solo los caracteres que difieren van en negrita (se calculan con los dos valores que da el motor).
- Presupuesto de 12 elementos: se cuentan aparte los 3 modos y las 3 decisiones; con el detalle abierto quedan 9.

### Enmienda · segunda crítica (27/40)

Decidir avanza al siguiente cambio sin decidir y la lista avisa cuando la revisión está completa. Opciones es un panel flotante, la matriz una cuadrícula con roles y las filas de una palabra muestran «+»/«−». Detalle en `docs/autonomo/registro.md`.

### Enmienda · tercera crítica (25/40)

Inconsistencias se opera con Tab y Enter y abre con la primera fila elegida. El detalle de Comparar omite «Qué cambió» (lo dice la frase resumen) y los encabezados siguen el orden h1 → h2 → h3. Detalle en `docs/autonomo/registro.md`.
