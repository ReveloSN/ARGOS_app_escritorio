# 011 · Comparación, reglas de riesgo y prioridad de alertas

- **Estado:** aceptada · 15/10/2026 (con dos puntos pendientes de validar, al final)
- **Contexto:** la Fase 3 convierte el índice de entidades en alertas. Un mismo documento contiene legítimamente muchos valores distintos (varias fechas, varios montos), así que no basta con encontrar valores diferentes: hay que encontrar valores *casi iguales* que probablemente son el mismo dato mal escrito.
- **Decisión:**
  - **Damerau-Levenshtein completa (Lowrance-Wagner)**, no la variante restringida (OSA): solo la completa es una métrica, y el BK-tree la necesita para podar ramas sin perder resultados. Una prueba verifica la desigualdad triangular sobre todas las combinaciones de un conjunto de valores.
  - **BK-tree** para generar pares candidatos por tipo de entidad, sin comparar todos contra todos. Cada comparador indica su radio de búsqueda.
  - **Comparadores (Strategy)**, uno por tipo, en `domain/comparison`:
    - `EditDistanceComparator` para contratos, NIT/cédulas y periodos. Distingue transposición de vecinos (4857 frente a 4587) de cambio de carácter e informa las posiciones.
    - `MoneyComparator` compara cifras solo dentro de la misma moneda.
    - `DateComparator` alerta si cambia un solo componente o si día y mes están intercambiados.
    - `NameComparator` usa similitud relativa; su radio garantiza no perder nombres más largos que la consulta.
  - **Solo se cruzan valores de documentos distintos:** dos fechas dentro del mismo contrato (inicio y primer pago) no son un error.
  - **Valor A** es el que más se repite, como en el detalle de alerta de los mockups.
  - **Reglas de riesgo (Specification)** componibles con `&`, `|` y `~` (`ContractIdTransposition`, `AmountMismatch`…). `RiskClassifier` aplica la primera regla que se cumple (cadena). Formato → BAJO. Identificadores, montos y fechas → ALTO. Nombres y periodos → MEDIO (CLAUDE.md §7).
  - **Cola de prioridad** con `heapq`: riesgo, luego confianza, luego orden de hallazgo.
  - **Sensibilidad:** Estricta (2 ediciones, similitud de nombres 0,7, compara años, informa formato), Equilibrada (1, 0,8, sin formato, que es la predeterminada) y Permisiva (1, 0,9, sin formato).
- **Resultado sobre el expediente de ejemplo:** 4 alertas. Contrato 4587/4857 (ALTO, transposición en las posiciones 2 y 3), canon $ 18.450.000/$ 18.540.000 (ALTO), representante «Rojas Peña»/«Rojas Pérez» (MEDIO) y periodo mayo/junio 2026 entre los adjuntos del correo (MEDIO).
- **Pendientes de validar (CLAUDE.md y los mockups no coinciden):**
  1. En los mockups, «Fecha de inicio distinta» y «Dígito de verificación del NIT» son de riesgo **medio**. CLAUDE.md dice que identificadores y fechas contractuales son **alto**. Se siguió CLAUDE.md.
  2. Los mockups describen Equilibrada como «no alerta diferencias solo de formato», pero la lista de resultados muestra alertas de riesgo bajo de formato. Se siguió el texto de Ajustes: el formato se informa solo en Estricta.
- **Consecuencias:** la explicación en lenguaje natural de cada alerta (con plantillas) y la comparación semántica («informe de junio» sin año frente al adjunto de mayo) quedan para la Fase 7, detrás de sus puertos.
