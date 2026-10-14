from fastapi import APIRouter

from argus.api.schemas.health import HealthResponse
from argus.api.settings import EngineSettings

HEALTHY_STATUS = "ok"


def build_health_router(settings: EngineSettings) -> APIRouter:
    router = APIRouter()

    @router.get("/health")
    def read_health() -> HealthResponse:
        return HealthResponse(status=HEALTHY_STATUS, version=settings.version)

    return router
