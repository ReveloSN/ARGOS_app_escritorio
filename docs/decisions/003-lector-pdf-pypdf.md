# 003 · Lectura de PDF con pypdf

- **Estado:** aceptada · 14/10/2026 (se implementa en la Fase 1)
- **Contexto:** se necesita extraer texto por página para rastrear el origen de cada valor. PyMuPDF es AGPL, lo que obligaría a liberar el código de ARGUS.
- **Decisión:** usar **pypdf** (BSD) detrás del puerto `DocumentReader`.
- **Consecuencias:** sin restricciones de licencia y con conservación de la página de origen. Si la extracción de algún PDF no basta, el adaptador se puede reemplazar sin tocar el dominio.
