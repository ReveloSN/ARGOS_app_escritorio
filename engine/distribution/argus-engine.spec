# Motor de ARGUS empaquetado como carpeta (onedir) para incluirlo como recurso de Tauri (ADR 017).
# Uso, desde engine/:  uv run pyinstaller distribution/argus-engine.spec --noconfirm
# Los modelos de embeddings NO van aquí: Tauri los incluye aparte y los indica con
# ARGUS_MODELS_DIR. El modelo de spaCy sí, porque es un paquete de Python.

import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules, copy_metadata

datas, binaries, hiddenimports = [], [], []
# spaCy y su modelo cargan componentes por nombre (registros y entry points), así que se
# incluyen completos; lo mismo con los lectores de documentos que usan datos propios.
for package in ("spacy", "es_core_news_md", "thinc", "srsly", "onnxruntime", "tokenizers", "docx", "openpyxl", "pypdf"):
    package_datas, package_binaries, package_hidden = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden
# OCR (ADR 026): pypdfium2 trae pdfium como binario propio; google-auth firma la cuenta de
# servicio de Document AI. La IA opcional (ADR 024) usa anthropic, y los certificados de
# certifi validan las conexiones HTTPS de ambas.
for package in ("pypdfium2", "pypdfium2_raw", "certifi"):
    package_datas, package_binaries, package_hidden = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden
hiddenimports += (
    collect_submodules("google.auth")
    + collect_submodules("google.oauth2")
    + collect_submodules("anthropic")
)
# keyring elige el llavero del sistema por entry points: sus metadatos y sus backends deben
# viajar con el motor (Administrador de credenciales en Windows, Secret Service en Linux).
datas += copy_metadata("keyring")
hiddenimports += collect_submodules("keyring.backends")
hiddenimports += ["win32ctypes.core"] if sys.platform == "win32" else ["secretstorage", "jeepney"]
# La versión que informa /health sale de los metadatos del paquete instalado.
datas += copy_metadata("argus-engine")
# uvicorn elige su bucle y protocolos en tiempo de ejecución.
hiddenimports += collect_submodules("uvicorn") + ["multipart", "python_multipart"]

analysis = Analysis(
    ["entry.py"],
    # SPECPATH lo define PyInstaller: la carpeta de este archivo; su padre es engine/.
    pathex=[str(Path(SPECPATH).parent)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["torch", "tkinter", "matplotlib", "IPython", "pytest"],
    noarchive=False,
)
pyz = PYZ(analysis.pure)
executable = EXE(
    pyz,
    analysis.scripts,
    [],
    exclude_binaries=True,
    name="argus-engine",
    console=True,
    upx=False,
)
COLLECT(executable, analysis.binaries, analysis.datas, name="argus-engine", upx=False)
