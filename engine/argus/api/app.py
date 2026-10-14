from fastapi import FastAPI

from argus.api.routes.health import build_health_router
from argus.api.settings import EngineSettings

API_TITLE = "ARGUS engine"


def create_app(settings: EngineSettings | None = None) -> FastAPI:
    """Raíz de composición: aquí se construyen e inyectan las dependencias del motor."""
    resolved_settings = settings or EngineSettings.from_installed_package()
    app = FastAPI(title=API_TITLE, version=resolved_settings.version)
    app.include_router(build_health_router(resolved_settings))
    return app
