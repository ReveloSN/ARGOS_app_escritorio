# 005 · Alcance: sin inicio de sesión y sin OCR por ahora

- **Estado:** aceptada · 14/10/2026
- **Contexto:** los mockups incluyen el mensaje «Su sesión expiró» y la acción «Activar OCR». ARGUS es local y monousuario, y el OCR exige Tesseract, un binario externo distinto en cada SO.
- **Decisión:** no hay cuentas ni inicio de sesión. El OCR queda fuera del alcance: un PDF escaneado se informa con el mensaje de 3 partes y la acción «Reemplazar archivo».
- **Consecuencias:** se retiran del catálogo de errores el de sesión expirada y el botón «Activar OCR». Si el OCR vuelve al alcance, entra como un adaptador más del puerto `DocumentReader`, con su propio ADR.
