from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from argus.api.comparison_events import comparison_events
from argus.api.comparison_response import to_comparison_response
from argus.api.composition import EngineServices
from argus.api.schemas.comparison import ComparisonResponse
from argus.api.uploads import event_stream_response, uploaded_sources
from argus.application.text_comparison.run_comparison import ComparisonRequest
from argus.domain.text_comparison.modes import ComparisonModeName


def build_comparisons_router(services: EngineServices) -> APIRouter:
    """Comparar documentos bajo demanda: versiones, correo y adjunto, contrato y anexos."""
    router = APIRouter(prefix="/comparisons")

    @router.post("")
    async def create_comparison(
        name: Annotated[str, Form(min_length=1)],
        mode: Annotated[ComparisonModeName, Form()],
        files: Annotated[list[UploadFile], File()],
    ) -> StreamingResponse:
        comparison_mode = services.comparisons.modes.mode_for(mode)
        request = ComparisonRequest(name.strip(), comparison_mode, await uploaded_sources(files))
        return event_stream_response(comparison_events(services.comparisons.run, request))

    @router.get("/{comparison_id}")
    def get_comparison(comparison_id: str) -> ComparisonResponse:
        return to_comparison_response(services.comparisons.open.execute(comparison_id))

    return router
