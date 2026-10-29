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
