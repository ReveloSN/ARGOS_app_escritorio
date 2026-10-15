from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from argus.api.access_token import AUTHORIZATION_HEADER, AccessTokenMiddleware
from argus.api.routes.health import build_health_router
from argus.api.settings import EngineSettings

API_TITLE = "ARGUS engine"
ALLOWED_METHODS = ["GET", "POST"]
ALLOWED_HEADERS = [AUTHORIZATION_HEADER, "content-type"]


def create_app(settings: EngineSettings) -> FastAPI:
    """Raíz de composición: aquí se construyen e inyectan las dependencias del motor."""
    app = FastAPI(title=API_TITLE, version=settings.version)
    app.include_router(build_health_router(settings))
    app.add_middleware(AccessTokenMiddleware, access_token=settings.access_token)
    # CORS se agrega al final para quedar por fuera: responde los preflight y también
    # marca los 401, de modo que la interfaz pueda leer el rechazo.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=ALLOWED_METHODS,
        allow_headers=ALLOWED_HEADERS,
    )
    return app
