# 029 · Empaquetado multiplataforma: Windows, Linux (x64 y ARM64) y macOS

- **Estado:** propuesta · 03/11/2026 (pendiente de verificar con el workflow «Instaladores»)
- **Contexto:** el ADR 017 y el 027 generaban `.msi` (Windows) y `.deb`/`.AppImage` (Linux x64). Se pidió empaquetar ARGUS en todos los sistemas y formatos que sea posible, al estilo de las páginas de descargas de otros proyectos (un archivo por sistema y arquitectura).
- **Decisión:**
  - **Matriz del workflow «Instaladores»:**

    | Runner | Salida |
    |---|---|
    | `windows-latest` (x64) | `.msi`, instalador `-setup.exe` (NSIS) y zip portable |
    | `ubuntu-22.04` (x64) | `.deb`, `.rpm`, `.AppImage` |
    | `ubuntu-22.04-arm` (ARM64) | `.deb`, `.rpm`, `.AppImage` |
    | `macos-latest` (Apple silicon) | `.dmg` |
    | `macos-15-intel` (Intel) | `.dmg` |

  - **Compilación nativa en cada arquitectura**, no cruzada: el motor es un binario de PyInstaller y Tesseract se copia del sistema de compilación, así que cada combinación se genera en su propio runner.
  - **Zip portable de Windows:** `argus.exe` con `engine/`, `models/` y `tesseract/` al lado; en Windows Tauri busca los recursos junto al ejecutable, que es el mismo diseño que deja el instalador.
  - **Tesseract en macOS:** `bundle_tesseract.py` copia el Tesseract de Homebrew con todas sus `.dylib` no del sistema a `lib/`, reescribe sus rutas a `@loader_path` y `@executable_path/lib` y vuelve a firmar cada binario con firma ad hoc (`codesign -s -`), porque `install_name_tool` invalida la firma y en Apple silicon un binario sin firma no arranca.
  - **Llavero en macOS:** keyring usa el backend de Keychain, que ya viaja en `keyring.backends`; el spec no añade importaciones extra.
  - **Sumas SHA-256:** al publicar una versión se añade `SHA256SUMS.txt` con todos los archivos.
  - **Misma prueba de humo en cada sistema:** ningún instalador se genera si el motor empaquetado no arranca sin internet, no lee el escaneado con OCR o no carga keyring, anthropic y google-auth.
- **Fuera de alcance (y por qué):**
  - **Windows 32 bits y Linux 32 bits:** onnxruntime, spaCy y pypdfium2 no publican ruedas para 32 bits.
  - **Windows ARM64 y Linux ARM32:** onnxruntime y spaCy tienen ruedas para Windows ARM64, pero Tesseract (Chocolatey) y los runners no están disponibles de forma estable; ARM32 no tiene ruedas.
  - **Android e iOS:** Tauri móvil no puede ejecutar el motor Python (PyInstaller) como proceso hijo; exigiría reescribir el motor o llevarlo a un servidor, lo que rompe el principio de análisis local (CLAUDE.MD §1).
  - **Firma y notarización:** sin certificados por ahora. Windows muestra SmartScreen; macOS pide abrir la app desde Ajustes › Privacidad y seguridad (o `xattr -dr com.apple.quarantine`).
- **Consecuencias:**
  - CLAUDE.MD §1 y §12 hablaban de Windows y Linux; macOS y ARM64 se suman por pedido explícito del usuario.
  - Cada versión publica unos 12 archivos de varios cientos de MB; el tiempo de CI crece con cinco trabajos en paralelo.
  - Las partes nuevas (macOS, ARM64, `.rpm`, NSIS) no se habían probado antes de este ADR: el primer «Run workflow» decide si pasan a «aceptada».
