from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse

from argus.api.composition import EngineServices
from argus.api.review_events import review_events
from argus.api.review_response import (
    decisions_response,
    session_response,
    to_review_response,
)
from argus.api.schemas.review import (
    DecisionRequestBody,
    DecisionsResponse,
    ReviewResponse,
    SessionResponse,
)
from argus.api.uploads import event_stream_response, uploaded_sources
from argus.application.decision_history import DecisionRequest
from argus.application.run_review import ReviewRequest
from argus.domain.decision import CorrectSide, DecisionKind


def build_reviews_router(services: EngineServices) -> APIRouter:
    router = APIRouter(prefix="/reviews")

    @router.post("")
    async def create_review(
        name: Annotated[str, Form(min_length=1)],
        files: Annotated[list[UploadFile], File()],
    ) -> StreamingResponse:
        request = ReviewRequest(name.strip(), await uploaded_sources(files))
        return event_stream_response(
            review_events(services.run_review, request, services.explainer)
        )

    @router.get("/{session_id}")
    def get_review(session_id: str) -> ReviewResponse:
        review = services.open_review.execute(session_id)
        decisions = services.decisions.state(session_id)
        return to_review_response(review, decisions, services.explainer)

    @router.post("/{session_id}/close")
    def close_review(session_id: str) -> SessionResponse:
        return session_response(services.close_review.execute(session_id))

    return router


def build_decisions_router(services: EngineServices) -> APIRouter:
    """«Es correcto», «Es un error» e «Ignorar», con deshacer (Ctrl Z)."""
    router = APIRouter(prefix="/reviews")

    @router.post("/{session_id}/decisions")
    def decide(session_id: str, body: DecisionRequestBody) -> DecisionsResponse:
        correct_side = CorrectSide(body.correct_side) if body.correct_side else None
        request = DecisionRequest(body.alert_number, DecisionKind(body.kind), correct_side)
        return decisions_response(services.decisions.decide(session_id, request))

    @router.post("/{session_id}/decisions/undo")
    def undo_decision(session_id: str) -> DecisionsResponse:
        return decisions_response(services.decisions.undo(session_id))

    return router
