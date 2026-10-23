from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import PurePath
from uuid import uuid4

from argus.application.ports.clock import Clock
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.drafts import (
    CaseFileLibrary,
    DraftContent,
    DraftReader,
    SendReviewRepository,
)
from argus.application.ports.repositories import SessionRepository
from argus.application.send_checks import FoundIssue, SendCheck, SendContext
from argus.domain.errors import NotADraftEmailError
from argus.domain.send_review import SendIssue, SendReview

DRAFT_EXTENSION = ".eml"
FIRST_ISSUE_NUMBER = 1


@dataclass(frozen=True)
class SendRequest:
    """El borrador elegido y el expediente abierto contra el que se compara (si hay uno)."""

    source: DocumentSource
    session_id: str | None = None


@dataclass(frozen=True)
class CaseFileAccess:
    sessions: SessionRepository
    library: CaseFileLibrary


@dataclass(frozen=True)
class SendReviewTools:
    reader: DraftReader
    checks: Sequence[SendCheck]
    clock: Clock


def _numbered(found: Sequence[FoundIssue]) -> tuple[SendIssue, ...]:
    return tuple(
        SendIssue(number, item.kind, item.risk, item.part, item.marked_text, item.params, item.fix)
        for number, item in enumerate(found, start=FIRST_ISSUE_NUMBER)
    )


class ReviewBeforeSending:
    """Caso de uso: lee el borrador, lo compara con el expediente y guarda lo que encontró.

    ARGUS nunca envía el correo: solo señala los problemas y, si el usuario quiere, arma una
    copia corregida que abre en su cliente de correo.
    """

    def __init__(
        self, tools: SendReviewTools, case_file: CaseFileAccess, reviews: SendReviewRepository
    ) -> None:
        self._tools = tools
        self._case_file = case_file
        self._reviews = reviews

    def execute(self, request: SendRequest) -> SendReview:
        if PurePath(request.source.name).suffix.lower() != DRAFT_EXTENSION:
            raise NotADraftEmailError(request.source.name)
        content = self._tools.reader.read(request.source)
        context = self._context(content, request.session_id)
        found = [issue for check in self._tools.checks for issue in check.find(context)]
        review = SendReview(
            uuid4().hex,
            request.session_id,
            self._tools.clock.now(),
            content.draft,
            _numbered(found),
        )
        self._reviews.save(review, request.source.content)
        return review

    def _context(self, content: DraftContent, session_id: str | None) -> SendContext:
        if session_id is None:
            return SendContext(content)
        self._case_file.sessions.get(session_id)
        library = self._case_file.library
        return SendContext(
            content, library.document_names(session_id), library.contacts(session_id)
        )
