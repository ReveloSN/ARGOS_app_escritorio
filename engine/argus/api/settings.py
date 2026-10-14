from dataclasses import dataclass
from importlib.metadata import version

PACKAGE_NAME = "argus-engine"


@dataclass(frozen=True)
class EngineSettings:
    """Configuración del motor que se inyecta al construir la aplicación HTTP."""

    version: str

    @classmethod
    def from_installed_package(cls) -> "EngineSettings":
        return cls(version=version(PACKAGE_NAME))
