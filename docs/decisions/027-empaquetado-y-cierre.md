# 027 · Empaquetado de la v0.1: Tesseract incluido, arranque sin internet y cierre (Fase 9)

- **Estado:** aceptada · 23/10/2026
- **Contexto:** la Fase 9 del plan v0.1 cierra con instaladores que lleven el motor, los modelos y el OCR, que arranquen sin internet, un README y el progreso final. Venían pendientes de las Fases 6 y 8 dos cosas: Tesseract dentro de los instaladores y comprobar que PyInstaller empaquete las dependencias nuevas.
- **Decisión:**
  - **Tesseract incluido en los tres instaladores (decidido con el usuario).** El `.deb` y el AppImage salen de la misma compilación y comparten recursos. Por eso el `.deb` también lleva su copia y no declara `tesseract-ocr` como dependencia (cambia lo previsto en el ADR 026). Así funciona sin `apt` ni internet.
  - **`distribution/bundle_tesseract.py`** deja en `engine/dist/tesseract/`:
    - El programa. En Windows es la compilación de UB Mannheim (Chocolatey en CI) con sus DLL. En Linux es la de Ubuntu 22.04, con las bibliotecas que da `ldd` en `lib/`, sin la glibc, que pone cada sistema.
    - `tessdata/` con español e inglés de tessdata_fast 4.1.0, y la `LICENSE` de Tesseract (Apache 2.0, que exige acompañar cada copia). Las tres descargas se verifican por SHA-256 con el mismo `download_model` del modelo de embeddings.
  - **Rutas en ejecución:**
    - Tauri añade la carpeta como recurso (`tauri.bundle.conf.json`) y lanza el motor con `ARGUS_TESSERACT=recursos/tesseract/tesseract(.exe)`.
    - `TesseractCommand` usa el `tessdata` que está junto al programa (`TESSDATA_PREFIX`).
    - En Linux, además, antepone `lib/` a `LD_LIBRARY_PATH`.
  - **PyInstaller:** el spec incluye:
    - `pypdfium2` y `pypdfium2_raw`, que traen el binario de pdfium;
    - `certifi`, para el HTTPS de Anthropic y de Document AI;
    - los submódulos de `google.auth`, `google.oauth2` y `anthropic`;
    - los metadatos y backends de `keyring`, que elige el llavero por entry points: `win32ctypes` en Windows, `secretstorage` y `jeepney` en Linux.
  - **Prueba de humo ampliada:** el motor empaquetado arranca con un proxy inexistente (`HTTP(S)_PROXY=127.0.0.1:9`), así que cualquier intento de salir a internet falla en lugar de pasar inadvertido. Sin red debe:
    - revisar los archivos de ejemplo, con alertas de reglas, spaCy y embeddings;
    - responder Ajustes de IA y de OCR, lo que carga keyring, anthropic y google-auth, y encontrar el Tesseract incluido;
    - leer con OCR local un PDF escaneado real (`Anexo_4_escaneado.pdf`, una imagen sin capa de texto) y encontrar 4857 frente a 4587.

    Un instalador que no pase esta prueba no se genera.
  - **Publicación (decidido con el usuario):** en esta fase los instaladores quedan como artefactos del workflow «Instaladores» («Run workflow»). No se crea la etiqueta `v0.1.0` ni una Release pública.
  - **README** en español, con el uso, la privacidad, el desarrollo, el empaquetado y los componentes de terceros.
- **Consecuencias:**
  - Los instaladores crecen unos 40 MB por Tesseract y sus idiomas.
  - El modelo `es_core_news_md` de spaCy tiene licencia **GPL-3.0** y va dentro de los instaladores. La licencia que se elija para ARGUS debe ser compatible, o habrá que entrenar o elegir otro modelo de entidades. Hoy el repositorio no declara licencia.
  - Las DLL de Tesseract en Windows traen sus propias licencias (Leptonica, libpng, libtiff y otras, todas permisivas). Se citan en el README de forma general.
  - Sin firma de código, como en el ADR 017.
