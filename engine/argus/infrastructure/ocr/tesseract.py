import os
import shutil
import subprocess
import sys
from pathlib import Path

from argus.domain.errors import OcrUnavailableError

EXECUTABLE_ENVIRONMENT = "ARGUS_TESSERACT"
BUNDLED_FOLDER = "tesseract"
TESSDATA_FOLDER = "tessdata"
LIBRARY_FOLDER = "lib"
LANGUAGES = "spa+eng"
# Una página de 300 ppp tarda pocos segundos; más de un minuto es un Tesseract colgado.
PAGE_TIMEOUT_SECONDS = 60


def bundled_tesseract_folder() -> Path:
    """Donde lo deja el instalador: junto al motor empaquetado (PyInstaller) o su ejecutable."""
    bundle = getattr(sys, "_MEIPASS", None)
    base = Path(bundle) if bundle else Path(sys.executable).parent
    return base / BUNDLED_FOLDER


class TesseractLocator:
    """Busca Tesseract: la ruta de ARGUS_TESSERACT, el incluido en el instalador o el del PATH."""

    def __init__(self, bundled_folder: Path | None = None) -> None:
        self._bundled_folder = bundled_folder or bundled_tesseract_folder()

    def locate(self) -> Path | None:
        configured = os.environ.get(EXECUTABLE_ENVIRONMENT)
        if configured and Path(configured).is_file():
            return Path(configured)
        bundled = shutil.which("tesseract", path=str(self._bundled_folder))
        found = bundled or shutil.which("tesseract")
        return Path(found) if found else None

    def is_available(self) -> bool:
        return self.locate() is not None


class TesseractCommand:
    """Reconoce una página con el programa Tesseract, en español e inglés (decidido con el
    usuario), pasándole la imagen por la entrada estándar."""

    def __init__(self, executable: Path) -> None:
        self._executable = executable

    def recognize(self, png: bytes) -> str:
        command = [str(self._executable), "stdin", "stdout", "-l", LANGUAGES]
        try:
            # Sin shell y con el ejecutable ya localizado: nada del documento llega a la orden.
            result = subprocess.run(
                command,
                input=png,
                capture_output=True,
                check=True,
                timeout=PAGE_TIMEOUT_SECONDS,
                env=self._environment(),
            )
        except (OSError, subprocess.SubprocessError):
            raise OcrUnavailableError("Tesseract no pudo leer la página.") from None
        return result.stdout.decode("utf-8", errors="replace")

    def _environment(self) -> dict[str, str]:
        # El Tesseract incluido trae sus idiomas y, en Linux, sus bibliotecas al lado; el del
        # sistema usa los suyos.
        environment = dict(os.environ)
        tessdata = self._executable.parent / TESSDATA_FOLDER
        if tessdata.is_dir():
            environment["TESSDATA_PREFIX"] = str(tessdata)
        libraries = self._executable.parent / LIBRARY_FOLDER
        if libraries.is_dir():
            inherited = environment.get("LD_LIBRARY_PATH")
            paths = [str(libraries), inherited] if inherited else [str(libraries)]
            environment["LD_LIBRARY_PATH"] = os.pathsep.join(paths)
        return environment
