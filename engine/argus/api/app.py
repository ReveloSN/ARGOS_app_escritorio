from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from argus.api.access_token import AUTHORIZATION_HEADER, AccessTokenMiddleware
from argus.api.composition import build_engine_services
from argus.api.error_handlers import register_error_handlers
from argus.api.ocr_composition import ExternalAdapters, default_external_adapters
from argus.api.routes.ai import build_ai_settings_router, build_change_explanation_router
from argus.api.routes.comparisons import build_comparisons_router
from argus.api.routes.documents import build_documents_router
from argus.api.routes.facts import build_fact_changes_router, build_facts_router
from argus.api.routes.health import build_health_router
from argus.api.routes.history import build_history_router
from argus.api.routes.ocr import build_ocr_credentials_router, build_ocr_settings_router
from argus.api.routes.preferences import (
    build_preferences_router,
    build_suppression_rules_router,
)
from argus.api.routes.reports import build_reports_router
from argus.api.routes.reviews import build_decisions_router, build_reviews_router
from argus.api.routes.send_reviews import (
    build_send_decisions_router,
    build_send_reviews_router,
)
from argus.api.settings import EngineSettings
from argus.application.ports.document_archive import FileOpener
from argus.infrastructure.system_file_opener import SystemFileOpener

API_TITLE = "ARGUS engine"
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]
ALLOWED_HEADERS = [AUTHORIZATION_HEADER, "content-type"]


def create_app(
    settings: EngineSettings,
    file_opener: FileOpener | None = None,
    external: ExternalAdapters | None = None,
) -> FastAPI:
    """Raíz de composición: aquí se construyen e inyectan las dependencias del motor."""
    app = FastAPI(title=API_TITLE, version=settings.version)
    services = build_engine_services(
        settings, file_opener or SystemFileOpener(), external or default_external_adapters()
    )
    app.include_router(build_health_router(settings))
    routers = (
        build_reviews_router,
        build_decisions_router,
        build_documents_router,
        build_history_router,
        build_preferences_router,
        build_suppression_rules_router,
        build_comparisons_router,
        build_facts_router,
        build_fact_changes_router,
        build_send_reviews_router,
        build_send_decisions_router,
        build_reports_router,
        build_change_explanation_router,
        build_ai_settings_router,
        build_ocr_settings_router,
        build_ocr_credentials_router,
    )
    for build_router in routers:
        app.include_router(build_router(services))
    register_error_handlers(app)
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
