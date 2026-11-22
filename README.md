# ARGUS

Aplicación de escritorio para Windows, Linux y macOS (Apple silicon) que compara documentos, correos y archivos relacionados, y detecta inconsistencias antes de que usted firme o envíe. Por ejemplo, «Contrato No. 4857» en un archivo y «4587» en su anexo, o un correo que habla del «informe de junio» con un adjunto de mayo.

Cada alerta muestra los dos valores con el archivo, la página y el fragmento de donde salen. La decisión siempre es suya: «Es correcto», «Es un error» o «Ignorar», con opción de deshacer.

**La detección no depende de IA generativa ni de internet.** El análisis se hace en su equipo.

**[Descargar ARGUS 0.1.2 para Windows](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_x64-setup.exe)** · [Linux, macOS y otros formatos](#descargar) · [Última versión publicada](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/latest)

## Qué hace

- **Revisión de un expediente:** lee PDF, DOCX, XLSX, EML y texto pegado, y cruza contratos, montos, fechas, partes y periodos entre los archivos.
- **Comparar documentos:** dos versiones palabra por palabra (texto que falta, agregado, cambiado o movido) o una matriz para tres o más documentos.
- **Expediente:** datos confirmados como fuente de verdad, además de verificaciones internas como el monto en letras, los totales, las fechas imposibles y los campos vacíos.
- **Revisar antes de enviar:** un borrador de correo y sus adjuntos, con una copia corregida que abre su programa de correo.
- **Informe** en PDF o DOCX y un **historial** con métricas de uso.
- **OCR** para PDF escaneados, con Tesseract en el equipo. Opcionalmente se puede usar Google Document AI, que pide su permiso antes de cada envío.
- **IA opcional:** «Explicar este cambio» y «Explicar esta alerta» con Claude (Anthropic) o DeepSeek, a elección. Viene apagada, cada proveedor guarda su clave en el llavero del sistema y cada explicación se rotula «Sugerencia de IA» con la cita de su origen.
- **Asistente de IA:** el ojo de ARGUS en la barra lateral, con un estado que sale de datos reales del motor.
- **Cuenta opcional:** correo y contraseña para identificarse al abrir la app, con Supabase Auth. No sincroniza nada ni protege los datos del equipo, y siempre puede continuar sin cuenta (ADR 033; configuración en [docs/configurar-supabase.md](docs/configurar-supabase.md)).

## Descargar

<!-- Al publicar una versión, cambie la versión de esta sección y del enlace de arriba: los nombres de los archivos la incluyen. -->

Versión publicada: **0.1.2**. La más reciente está siempre en [Releases](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/latest).

**¿No sabe cuál elegir?** Si su PC tiene Windows y procesador Intel o AMD, descargue el [instalador para Windows](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_x64-setup.exe). «x64», «x86-64», «x86_64» y «amd64» son lo mismo: un procesador Intel o AMD de 64 bits. «x86» a secas suele significar 32 bits.

| Su equipo | Requisito | Descarga |
|---|---|---|
| **Windows, Intel o AMD** (x64) | Windows 10 u 11 de 64 bits | [Instalador (recomendado)](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_x64-setup.exe) · [portable, sin instalar](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_x64_portable.zip) · [msi para empresas](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_x64_en-US.msi) |
| **Linux, Intel o AMD** (x64) | glibc 2.35 o posterior (Ubuntu 22.04, Debian 12, Fedora 36) | [deb](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_amd64.deb) · [rpm](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS-0.1.2-1.x86_64.rpm) · [AppImage](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_amd64.AppImage) |
| **Linux, ARM de 64 bits** (ARM64) | glibc 2.35 o posterior | [deb](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_arm64.deb) · [rpm](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS-0.1.2-1.aarch64.rpm) · [AppImage](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_aarch64.AppImage) |
| **Mac con Apple silicon** (M1 o posterior) | macOS 26. Con macOS 14 o 15 no está probado y es probable que el OCR no funcione | [dmg](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/ARGUS_0.1.2_aarch64.dmg) |

En Linux, use `.deb` en Debian, Ubuntu y derivadas; `.rpm` en Fedora, openSUSE y derivadas; `.AppImage` en las demás.

Para saber qué procesador tiene: en Windows, Configuración › Sistema › Información › «Tipo de sistema»; en Mac, menú Apple › Acerca de este Mac; en Linux, `uname -m`.

**Equipos sin descarga**

| Equipo | Por qué | Qué puede hacer |
|---|---|---|
| Windows con procesador ARM (Snapdragon) | Dos componentes del motor (`blis` y `cryptography`) no publican versión para él | En Windows 11 puede probar el instalador x64, que se ejecuta emulado (no está probado) |
| Windows o Linux de 32 bits (x86) | La IA local (spaCy, ONNX Runtime) no existe para 32 bits | Usar un equipo de 64 bits |
| Mac con procesador Intel | `onnxruntime` y `cryptography`, en las versiones que usa ARGUS, solo publican versión para Apple silicon | Usar un equipo con Windows, Linux o Apple silicon |
| Mac con macOS 13 o anterior | `onnxruntime` exige macOS 14 | Actualizar macOS |
| Android, iPhone y iPad | El motor de análisis no puede ejecutarse en móviles | Usar un computador |

Cada descarga pesa entre 200 y 360 MB. Para verificarla, use [SHA256SUMS.txt](https://github.com/ReveloSN/ARGOS_app_escritorio/releases/download/v0.1.2/SHA256SUMS.txt). Los detalles están en el [ADR 029](docs/decisions/029-empaquetado-multiplataforma.md).

Desde la versión 0.1.2, ARGUS trae una cuenta opcional. Por ahora no verifica el correo ni permite recuperar la contraseña; siempre puede continuar sin cuenta.

### Instalar

Los instaladores se generan en GitHub Actions, en el workflow «Instaladores». Llevan el motor, los modelos de lenguaje y Tesseract con español e inglés, así que **funcionan sin internet desde la primera vez**. No tienen firma de código: Windows muestra SmartScreen al instalar («Más información › Ejecutar de todas formas») y macOS pide abrir la app desde Ajustes › Privacidad y seguridad («Abrir de todos modos»).

En Windows, desde la 0.1.3 el programa se instala en `%LOCALAPPDATA%\Programs\ARGUS` y el historial sigue en `%LOCALAPPDATA%\ARGUS`. Para actualizar, instale encima: el historial se conserva. **No borre `%LOCALAPPDATA%\ARGUS` para reinstalar**, porque ahí están sus revisiones (ADR 034).

## Privacidad

- Los archivos se leen y comparan en su equipo. Ningún contenido sale de él sin que usted lo active en Ajustes y confirme cada envío.
- Si usa la cuenta opcional, van a Supabase su correo, su contraseña, el nombre si lo escribe, los códigos y los tokens de sesión. La cuenta nunca envía documentos, fragmentos ni nombres de archivo, y la contraseña no se guarda en el equipo: el token de renovación de la sesión queda en el llavero del sistema (ADR 033).
- Las claves de Anthropic, DeepSeek y Google Cloud se guardan en el llavero del sistema operativo: el Administrador de credenciales en Windows, Keychain en macOS y Secret Service en Linux. Nunca van a archivos ni al historial.
- El historial se guarda en su carpeta de datos, o en la que usted elija en Ajustes. Opcionalmente se borra a los 90 días.

## Desarrollo

Requisitos: [uv](https://docs.astral.sh/uv/) (Python 3.12), Node.js 24, y Rust con las [dependencias de Tauri 2](https://tauri.app/start/prerequisites/). En Windows, Rust necesita las Build Tools de Visual Studio.

```bash
uv sync --project engine
```

```bash
uv run --project engine python -m argus.infrastructure.nlp.embedding_model
```

```bash
npm --prefix app ci
```

```bash
npm --prefix app run tauri dev
```

El segundo comando descarga una vez el modelo de embeddings (unos 118 MB, verificado por SHA-256); sin él solo se omite la comparación semántica. Para el OCR local en desarrollo, instale Tesseract con los idiomas `spa` y `eng`, o indique su ruta con `ARGUS_TESSERACT`.

### Pruebas y calidad

```bash
uv run --project engine pytest
```

```bash
npm --prefix app test
```

El motor también exige `ruff check`, `black --check` y `mypy` (estricto). La interfaz exige `npm run lint`, `lint:css`, `format:check` y `typecheck`. El CI repite todo en Ubuntu y Windows.

### Empaquetar

Desde `engine/`:

```bash
uv run pyinstaller distribution/argus-engine.spec --noconfirm
```

```bash
uv run python distribution/bundle_tesseract.py
```

```bash
uv run python distribution/smoke_test.py
```

La prueba de humo arranca el motor empaquetado sin internet y comprueba reglas, spaCy, embeddings, OCR y ajustes. Después, desde `app/`:

```bash
npm run tauri -- build --config src-tauri/tauri.bundle.conf.json
```

## Arquitectura

- `engine/`: motor en Python con FastAPI y arquitectura hexagonal (`domain`, `application`, `infrastructure`, `api`), persistencia en SQLite y NLP local con spaCy, ONNX Runtime y rapidfuzz.
- `app/`: interfaz en Tauri 2, React y TypeScript estricto, con design tokens en tres niveles, Atomic Design e i18n en español e inglés.
- `docs/decisions/`: decisiones de arquitectura (ADR 001 a 034).
- `docs/progreso.md`: el estado de cada fase.
- `docs/mockups/`: la fuente de verdad visual.

## Componentes de terceros incluidos en los instaladores

| Componente | Uso | Licencia |
|---|---|---|
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | OCR local | Apache 2.0 (su `LICENSE` va en la carpeta `tesseract/`) |
| [tessdata_fast](https://github.com/tesseract-ocr/tessdata_fast) 4.1.0 | Idiomas español e inglés del OCR | Apache 2.0 |
| [paraphrase-multilingual-MiniLM-L12-v2](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) | Similitud semántica | Apache 2.0 |
| [spaCy](https://spacy.io) y `es_core_news_md` | Entidades | MIT y GPL-3.0 |
| [pdfium](https://pdfium.googlesource.com/pdfium/) (pypdfium2) | Páginas a imagen para el OCR | BSD-3 y Apache 2.0 |
