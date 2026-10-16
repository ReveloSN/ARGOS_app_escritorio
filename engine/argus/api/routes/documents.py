from typing import Annotated

from fastapi import APIRouter, Query, Response

from argus.api.composition import EngineServices
from argus.api.schemas.documents import DocumentMatchResponse, OpenDocumentRequest
from argus.application.document_access import DocumentMatch
from argus.infrastructure.persistence.alert_serialization import location_payload

NO_CONTENT = 204


def build_documents_router(services: EngineServices) -> APIRouter:
    router = APIRouter(prefix="/reviews/{session_id}")

    @router.get("/search")
    def search_documents(
        session_id: str, query: Annotated[str, Query(alias="q")]
    ) -> list[DocumentMatchResponse]:
        matches = services.search_documents.execute(session_id, query)
        return [_match_response(match) for match in matches]

    @router.post("/documents/open", status_code=NO_CONTENT)
    def open_document(session_id: str, body: OpenDocumentRequest) -> Response:
        services.open_document.execute(session_id, body.document)
        return Response(status_code=NO_CONTENT)

    return router


def _match_response(match: DocumentMatch) -> DocumentMatchResponse:
    return DocumentMatchResponse(
        document=match.document_name,
        location=location_payload(match.location),
        excerpt=match.excerpt.text,
        highlight_start=match.excerpt.highlight_start,
        highlight_end=match.excerpt.highlight_end,
    )
