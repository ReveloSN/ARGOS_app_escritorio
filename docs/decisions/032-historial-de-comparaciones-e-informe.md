# 032 · Comparaciones en el Historial y su informe exportable

Estado: aceptada · rama `mejoras-autonomas`

## Contexto

Las comparaciones guardan en SQLite el texto completo de los documentos y no aparecían en el
Historial, no se borraban con la retención de 90 días ni se podían exportar. Además, una auditoría
y una prueba exploratoria encontraron lecturas silenciosamente equivocadas (montos con la moneda
detrás, texto UTF-16) y avisos que afirmaban que todo coincidía cuando no era cierto.

## Decisión

- **Retención:** `PurgeExpiredHistory` recibe un `ExpirableHistory` (sesiones, comparaciones y
  archivo) y borra también las comparaciones vencidas con sus decisiones (por cascada). Corre al
  iniciar el motor y al activar el límite en Ajustes (`PUT /preferences`), no solo en el arranque.
- **Historial:** `GET /history` devuelve además `comparisons` (id, nombre, modo, fecha, documentos,
  elementos por decidir y decididos). Las decisiones sobre comparaciones cuentan en las métricas
  de alertas resueltas y de errores reales; el tiempo medio sigue siendo solo de revisiones.
  La interfaz las lista bajo las sesiones y «Abrir comparación» la reabre con sus decisiones.
- **Informe de comparación:** la interfaz lo redacta (`comparisonReport.ts`: resumen, cambios con
  origen de cada valor y decisión, inconsistencias) y el motor solo lo maqueta, igual que el de
  revisiones (ADR 023). `ExportReport` y `OpenReport` dejaron de depender de `SessionRepository`
  y reciben un `CaseFileNames` (nombre del expediente o de la comparación). Nuevas rutas
  `/comparisons/{id}/report`. El control «Exportar informe» (PDF o Word) está en la cabecera de
  Comparar, no en «Opciones»: sirve a todas las pestañas.
- **Montos:** `MoneyExtractor` reconoce la moneda detrás del número («18.450.000 COP», «pesos»,
  «dólares») y el formato en inglés («USD 1,200.50»). Con tres cifras tras la coma se lee como
  miles; antes «USD 1,200.50» se normalizaba en silencio como 1,2.
- **Texto:** el lector acepta UTF-16 y UTF-32 con marca de orden de bytes y rechaza como
  corrupto un archivo con caracteres nulos, en lugar de aceptar un binario como texto.
- **Correo:** un `.eml` sin ningún encabezado de correo es `NotADraftEmailError`. Nueva familia de verificaciones `NearMissCheck`: un valor citado en el asunto o el cuerpo que no está en ningún adjunto pero se parece a uno que sí (una sustitución, una omisión o dos caracteres vecinos intercambiados, mínimo 4 caracteres) es un problema de riesgo alto sin corrección automática. Dos subclases: `IdentifierMismatchCheck` (número de contrato: 4587 frente a 4857) y `AmountMismatchCheck` (monto ya normalizado con su moneda: $ 18.450.000 frente a $ 18.540.000; otra moneda no se parece). Con valores sin parecido no se avisa: no se sabe si hablan de otra cosa. `DraftPart` gana `SUBJECT` para marcar el asunto.
- **Inconsistencias:** los datos confirmados del expediente abierto son la referencia de «Buscar inconsistencias»: se muestra el valor confirmado y se marca con ≠ el que lo contradice. Sin expediente abierto no hay referencia y se dice.
- **Honestidad de los avisos:** «No se encontraron inconsistencias» dice cuántos archivos no se
  leyeron; «Revisar antes de enviar» no dice «listo» si quedan problemas marcados como error sin
  corrección; el Historial y el borrado de sesión explican en 3 partes cuando fallan.

## Consecuencias

- Cambia el esquema de respuesta de `/history` (campo nuevo `comparisons`) y los constructores de
  `PurgeExpiredHistory`, `HistoryRepositories` y `ExportReport`; la interfaz y el motor se
  actualizan juntos.
- Un informe de comparación se guarda en `Documentos/ARGUS/<nombre de la comparación>`.
- No se hizo (decisión de producto o riesgo): tratar un número sin moneda como monto, comparar
  a la comparación de archivos sueltos con un expediente que no esté abierto, detectar en el
  correo fechas distintas a las del adjunto (se cubren el número de contrato y los montos) y agregar
  documentos a una revisión existente.

## Enmienda · lectura de filas y conflictos entre documentos

- **Extracción por fila:** `EntityExtractionPipeline` lee además cada fila de tabla u hoja como una frase, para reconocer «Contrato No.» | «4857»; solo se conservan los valores que cruzan celdas y se ubican en la celda donde termina el valor.
- **Conflicto entre documentos:** dos valores parecidos que aparecen exactamente en los mismos documentos (inicio y cuotas, en cada versión) ya no son una contradicción; sí lo sigue siendo un error dentro de un documento frente a otro que tiene el valor correcto.
- **Ubicación de filas:** un cambio en una fila de tabla o de hoja se cita por su fila, no por la columna o la celda de la primera celda.
