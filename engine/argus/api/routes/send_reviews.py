from typing import Annotated

from fastapi import APIRouter, File, Form, Response, UploadFile

from argus.api.composition import EngineServices
from argus.api.review_response import decisions_response
from argus.api.schemas.review import DecisionsResponse
from argus.api.schemas.send_review import SendDecisionBody, SendReviewResponse
from argus.api.send_review_response import to_send_review_response
from argus.api.uploads import uploaded_sources
from argus.application.decision_history import DecisionRequest
from argus.application.review_before_sending import SendRequest
from argus.domain.decision import DecisionKind

NO_CONTENT = 204


def build_send_reviews_router(services: EngineServices) -> APIRouter:
    """«Revisar antes de enviar»: un borrador .eml frente al expediente abierto."""
    router = APIRouter(prefix="/send-reviews")
    sending = services.sending

    @router.post("")
    async def review_draft(
        file: Annotated[UploadFile, File()],
        session_id: Annotated[str | None, Form(alias="sessionId")] = None,
    ) -> SendReviewResponse:
        (source,) = await uploaded_sources([file])
        review = sending.review.execute(SendRequest(source, session_id or None))
        return to_send_review_response(review, sending.decisions.state(review.id))

    @router.get("/{review_id}")
    def get_review(review_id: str) -> SendReviewResponse:
        decisions = sending.decisions.state(review_id)
        return to_send_review_response(sending.decisions.review(review_id), decisions)

    @router.post("/{review_id}/open", status_code=NO_CONTENT)
    def open_corrected(review_id: str) -> Response:
        sending.open_corrected.execute(review_id)
        return Response(status_code=NO_CONTENT)

    return router


def build_send_decisions_router(services: EngineServices) -> APIRouter:
    """Corregir, «Es correcto» o «Ignorar» cada problema del borrador, con deshacer (Ctrl Z)."""
    router = APIRouter(prefix="/send-reviews")
    sending = services.sending

    @router.post("/{review_id}/decisions")
    def decide(review_id: str, body: SendDecisionBody) -> DecisionsResponse:
        request = DecisionRequest(body.number, DecisionKind(body.kind))
        return decisions_response(sending.decisions.decide(review_id, request))

    @router.post("/{review_id}/decisions/undo")
    def undo(review_id: str) -> DecisionsResponse:
        return decisions_response(sending.decisions.undo(review_id))

    return router
