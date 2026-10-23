"""Borrador revisado tal como lo consume la pantalla «Revisar antes de enviar»."""

from datetime import datetime
from typing import Literal

from argus.api.schemas.review import CamelModel, DecisionsResponse


class DraftAttachmentResponse(CamelModel):
    name: str
    size: int


class DraftResponse(CamelModel):
    file_name: str
    subject: str
    to: list[str]
    cc: list[str]
    body: str
    attachments: list[DraftAttachmentResponse]


class SendFixResponse(CamelModel):
    kind: str
    target: str
    replacement: str


class SendIssueResponse(CamelModel):
    number: int
    kind: str
    risk: str
    # Dónde se marca: el cuerpo, «Para» o «CC»; `marked_text` es el texto exacto que se marca.
    part: str
    marked_text: str
    params: dict[str, str]
    fix: SendFixResponse | None


class SendReviewResponse(CamelModel):
    id: str
    session_id: str | None
    created_at: datetime
    draft: DraftResponse
    issues: list[SendIssueResponse]
    decisions: DecisionsResponse


class SendDecisionBody(CamelModel):
    number: int
    # «Es un error» aplica la corrección a la copia del borrador.
    kind: Literal["correct", "error", "ignored"]
