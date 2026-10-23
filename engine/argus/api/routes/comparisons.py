from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from argus.api.comparison_events import comparison_events
from argus.api.comparison_response import to_comparison_response
from argus.api.composition import EngineServices
from argus.api.review_response import decisions_response
from argus.api.schemas.comparison import ComparisonDecisionBody, ComparisonResponse
from argus.api.schemas.review import DecisionsResponse
from argus.api.uploads import event_stream_response, uploaded_sources
from argus.application.decision_history import DecisionRequest
from argus.application.text_comparison.run_comparison import ComparisonRequest
from argus.domain.decision import CorrectSide, DecisionKind
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
        events = comparison_events(services.comparisons.run, request, services.explainer)
        return event_stream_response(events)

    @router.get("/{comparison_id}")
    def get_comparison(comparison_id: str) -> ComparisonResponse:
        report = services.comparisons.open.execute(comparison_id)
        decisions = services.comparisons.decisions.state(comparison_id)
        return to_comparison_response(report, decisions, services.explainer)

    @router.post("/{comparison_id}/decisions")
    def decide(comparison_id: str, body: ComparisonDecisionBody) -> DecisionsResponse:
        correct_side = CorrectSide(body.correct_side) if body.correct_side else None
        request = DecisionRequest(body.number, DecisionKind(body.kind), correct_side)
        return decisions_response(services.comparisons.decisions.decide(comparison_id, request))

    @router.post("/{comparison_id}/decisions/undo")
    def undo_decision(comparison_id: str) -> DecisionsResponse:
        return decisions_response(services.comparisons.decisions.undo(comparison_id))

    return router
