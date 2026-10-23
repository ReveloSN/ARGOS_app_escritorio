from dataclasses import dataclass, field
from importlib.metadata import version
from pathlib import Path

from argus.infrastructure.history_location import default_data_directory
from argus.infrastructure.nlp.embedding_model import default_models_directory
from argus.infrastructure.reports.documents_report_folder import default_reports_directory

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
    # Carpeta del historial: la base de datos y la copia de los archivos leídos.
    data_directory: Path
    allowed_origins: tuple[str, ...] = TAURI_ORIGINS
    # Modelos de IA locales (embeddings); sin ellos se omite solo la comparación semántica.
    models_directory: Path = field(default_factory=default_models_directory)
    # Donde se recuerda la carpeta elegida por el usuario (siempre la del sistema).
    pointer_directory: Path = field(default_factory=default_data_directory)
    # Informes exportados: Documentos/ARGUS, una carpeta por expediente (mockup Informe).
    reports_directory: Path = field(default_factory=default_reports_directory)

    @classmethod
    def from_installed_package(cls, access_token: str, data_directory: Path) -> "EngineSettings":
        return cls(
            version=version(PACKAGE_NAME), access_token=access_token, data_directory=data_directory
        )
