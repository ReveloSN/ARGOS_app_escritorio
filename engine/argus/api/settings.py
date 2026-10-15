from dataclasses import dataclass
from importlib.metadata import version
from pathlib import Path

PACKAGE_NAME = "argus-engine"

# Orígenes desde los que la interfaz de Tauri llama al motor: WebView2 (Windows),
# WebKitGTK (Linux) y el servidor de desarrollo de Vite.
TAURI_ORIGINS: tuple[str, ...] = (
    "http://tauri.localhost",
    "tauri://localhost",
    "http://localhost:1420",
)


@dataclass(frozen=True)
class EngineSettings:
    """Configuración del motor que se inyecta al construir la aplicación HTTP."""

    version: str
    access_token: str
    database_path: Path
    allowed_origins: tuple[str, ...] = TAURI_ORIGINS

    @classmethod
    def from_installed_package(cls, access_token: str, database_path: Path) -> "EngineSettings":
        return cls(
            version=version(PACKAGE_NAME), access_token=access_token, database_path=database_path
        )
