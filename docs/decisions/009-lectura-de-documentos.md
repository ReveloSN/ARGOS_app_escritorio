# 009 · Modelo de lectura de documentos

- **Estado:** aceptada · 14/10/2026
- **Contexto:** la Fase 1 lee PDF, DOCX, XLSX, EML y texto. CLAUDE.md §7 exige rastrear cada valor a su archivo, página y fragmento, pero cada formato ubica el texto de forma distinta.
- **Decisión:**
  - **Ubicaciones por formato:** `PageLocation` (PDF), `ParagraphLocation` y `TableCellLocation` (DOCX), `SheetCellLocation` (XLSX), `EmailPartLocation` (EML) y `LineLocation` (texto). Se agrupan en la unión `SourceLocation` en vez de un registro con campos opcionales. Las posiciones son base 1. Un DOCX no guarda páginas (Word las calcula al mostrarlo), así que su origen es el párrafo o la celda.
  - **`DocumentSource` en bytes:** el puerto `DocumentReader` recibe nombre y bytes, no rutas. Los adjuntos de un correo se leen igual que un archivo, y solo `FileSourceLoader` toca el disco, con el límite de 10 MB de los mockups.
  - **Factory inmutable:** `DocumentReaderFactory` recibe los lectores desde `api/composition.py` y se extiende con `with_reader` (OCP). El lector de EML recibe una factory **sin** EML, de modo que un correo dentro de otro correo se informa como no compatible en lugar de leerse sin límite de profundidad.
  - **Motivos de error:** `UnreadableReason` (`no_text`, `encrypted`, `corrupted`, `too_large`, `not_found`, `unsupported_format`) viaja hasta la interfaz, que lo traduce al mensaje de 3 partes. Nunca se muestra el error interno de la librería.
  - **Adjuntos que fallan:** no impiden leer el correo. Quedan en `Document.attachment_failures` con su motivo.
  - **Fixtures:** `tests/fixtures/generate_fixtures.py` los genera con los datos del expediente de los mockups y quedan versionados. El PDF con texto se escribe a mano para no agregar otra dependencia.
- **Consecuencias:** las Fases 2 y 3 extraen y comparan sobre `TextFragment` sin conocer el formato. Los PDF escaneados quedan como `no_text` mientras el OCR esté fuera del alcance (ADR 005).
