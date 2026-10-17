# Motor de ARGUS empaquetado como carpeta (onedir) para incluirlo como recurso de Tauri (ADR 017).
# Uso, desde engine/:  uv run pyinstaller packaging/argus-engine.spec --noconfirm
# Los modelos de embeddings NO van aquí: Tauri los incluye aparte y los indica con
# ARGUS_MODELS_DIR. El modelo de spaCy sí, porque es un paquete de Python.

from PyInstaller.utils.hooks import collect_all, collect_submodules, copy_metadata

datas, binaries, hiddenimports = [], [], []
# spaCy y su modelo cargan componentes por nombre (registros y entry points), así que se
# incluyen completos; lo mismo con los lectores de documentos que usan datos propios.
for package in ("spacy", "es_core_news_md", "thinc", "srsly", "onnxruntime", "tokenizers", "docx", "openpyxl", "pypdf"):
    package_datas, package_binaries, package_hidden = collect_all(package)
    datas += package_datas
    binaries += package_binaries
    hiddenimports += package_hidden
# La versión que informa /health sale de los metadatos del paquete instalado.
datas += copy_metadata("argus-engine")
# uvicorn elige su bucle y protocolos en tiempo de ejecución.
hiddenimports += collect_submodules("uvicorn") + ["multipart", "python_multipart"]

analysis = Analysis(
    ["entry.py"],
    pathex=[".."],
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
