# 010 · Extracción de entidades: cadena con prioridad e índice invertido

- **Estado:** aceptada · 15/10/2026
- **Contexto:** la Fase 2 reconoce contratos, NIT y cédulas, fechas, montos, periodos y nombres en el texto de cada fragmento. Un mismo tramo puede parecerse a varios tipos: un NIT tiene dígitos como un monto, y «1 de julio de 2026» contiene el mes «julio de 2026».
- **Decisión:**
  - **Cadena con prioridad:** `EntityExtractionPipeline` aplica los extractores en el orden que fija `api/composition.py`: NIT/cédula → contrato → fecha → monto → periodo → organización → persona. El tramo que reconoce uno queda reservado y los siguientes no lo vuelven a leer. Cada `EntityMatch` cubre también su etiqueta («Contrato No. 4857»).
  - **Extractores deterministas en `infrastructure/extraction`:** expresiones regulares detrás del puerto `EntityExtractor`. El reconocimiento con spaCy de la Fase 7 será un extractor más de la misma cadena.
  - **Valores normalizados comparables:** contrato en mayúsculas (`4857`), NIT y cédula con prefijo (`NIT:900482315-7`, `CC:79123456`) para no comparar uno con otro, fecha ISO (`2026-07-01`), monto con moneda (`COP:18450000`, incluido «36,9 millones»), mes (`2026-06`; sin año, `XXXX-06`), duración ISO 8601 (`P36M`) y nombres sin tildes, puntuación ni mayúsculas (`logistica andina sas`).
  - **Tipo nuevo `ORGANIZATION_NAME`:** los mockups separan el nombre del representante (riesgo medio) de la razón social, cuyas diferencias suelen ser de formato (S.A.S. frente a SAS, riesgo bajo).
  - **Índice invertido:** `EntityIndex` agrupa `tipo → valor normalizado → entidades` y responde en O(1) qué documentos mencionan un valor. Guarda la entidad completa y no solo la `Occurrence`, porque la forma original es la que distingue un error de una diferencia de formato.
  - **Fragmento de contexto:** 80 caracteres a cada lado del valor, con «…» donde se recorta.
- **Limitaciones conocidas:** el formato numérico y el orden día/mes son los de es-CO hasta que exista la configuración regional. Un número sin moneda, como el `18540000` de una celda de Excel, no se toma como monto porque sin contexto no se distingue de una cantidad. Los nombres de persona se reconocen solo después de un cargo o tratamiento. Las tres quedan para revisar en las Fases 3 y 7.
