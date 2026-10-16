import os
import subprocess
import sys
from pathlib import Path

# Lanzadores de la aplicación predeterminada en Linux y macOS; en Windows se usa os.startfile.
LINUX_OPENER = "xdg-open"
MACOS_OPENER = "open"


class SystemFileOpener:
    """Abre un archivo con la aplicación que el sistema tiene asociada a su tipo."""

    def open(self, path: Path) -> None:
        if sys.platform == "win32":
            os.startfile(path)
            return
        opener = MACOS_OPENER if sys.platform == "darwin" else LINUX_OPENER
        # El lanzador termina enseguida y deja la aplicación abierta por su cuenta.
        subprocess.Popen([opener, str(path)], start_new_session=True)
