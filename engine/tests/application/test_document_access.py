from pathlib import Path

import pytest

from argus.application.document_access import OpenDocument, SearchDocuments
from argus.application.ports.document_archive import ArchivedFile
from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import (
    ArchivedFileMissingError,
    DocumentNotFoundError,
    SessionNotFoundError,
    UnreadableReason,
)
from argus.domain.locations import LineLocation, PageLocation
from argus.domain.read_outcome import DocumentReadOutcome
from argus.domain.review_session import NewReviewSession, ReviewSession
from tests.application.in_memory_repositories import (
    START,
    InMemoryDocumentArchive,
    InMemoryDocumentRepository,
    InMemorySessionRepository,
    RecordingFileOpener,
)

LONG_CLAUSE = (
    "El arrendador entrega en arriendo la bodega comercial ubicada en la Calle 17 No. 96G-45, "
    "Fontibón, Bogotá D.C., que se regirá por las siguientes cláusulas y por la ley aplicable."
)
CONTRACT = Document(
    "contrato.pdf", DocumentFormat.PDF, (TextFragment(LONG_CLAUSE, PageLocation(2)),)
)
ATTACHMENT = Document(
    "tarifas.txt", DocumentFormat.TEXT, (TextFragment("Tarifa de junio", LineLocation(1)),)
)
EMAIL = Document(
    "correo.eml",
    DocumentFormat.EML,
    (TextFragment("Adjunto tarifas", LineLocation(1)),),
    attachments=(ATTACHMENT,),
)
OUTCOMES = (
    DocumentReadOutcome("contrato.pdf", CONTRACT, None),
    DocumentReadOutcome("correo.eml", EMAIL, None),
    DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT),
)


def stored_review() -> tuple[InMemorySessionRepository, InMemoryDocumentRepository, str]:
    sessions, documents = InMemorySessionRepository(), InMemoryDocumentRepository()
    names = tuple(outcome.name for outcome in OUTCOMES)
    session = ReviewSession.start(NewReviewSession("Expediente", names, 0), START)
    sessions.save(session)
    documents.save_all(session.id, OUTCOMES)
    return sessions, documents, session.id


def test_search_finds_text_without_caring_about_case_or_accents() -> None:
    sessions, documents, session_id = stored_review()

    (match,) = SearchDocuments(sessions, documents).execute(session_id, "  BOGOTA ")

    assert match.document_name == "contrato.pdf"
    assert match.location == PageLocation(2)
    excerpt = match.excerpt
    assert excerpt.text[excerpt.highlight_start : excerpt.highlight_end] == "Bogotá"
    assert excerpt.text.startswith("…")


def test_search_reports_the_attachment_where_the_text_is() -> None:
    sessions, documents, session_id = stored_review()

    (match,) = SearchDocuments(sessions, documents).execute(session_id, "junio")

    assert match.document_name == "tarifas.txt"


def test_queries_too_short_to_help_return_nothing() -> None:
    sessions, documents, session_id = stored_review()

    assert SearchDocuments(sessions, documents).execute(session_id, "a") == ()


def test_search_in_an_unknown_review_fails_explicitly() -> None:
    sessions, documents, _ = stored_review()

    with pytest.raises(SessionNotFoundError):
        SearchDocuments(sessions, documents).execute("no-existe", "contrato")


def archived(session_id: str) -> InMemoryDocumentArchive:
    archive = InMemoryDocumentArchive(Path("historial"))
    archive.store(ArchivedFile(session_id, 0, DocumentSource("contrato.pdf", b"%PDF")))
    archive.store(ArchivedFile(session_id, 1, DocumentSource("correo.eml", b"From:")))
    return archive


def test_opening_a_document_opens_its_stored_copy() -> None:
    _, documents, session_id = stored_review()
    opener = RecordingFileOpener()

    OpenDocument(documents, archived(session_id), opener).execute(session_id, "contrato.pdf")

    assert opener.opened == [Path("historial") / session_id / "contrato.pdf"]


def test_an_attachment_is_opened_from_the_email_that_brings_it() -> None:
    _, documents, session_id = stored_review()
    opener = RecordingFileOpener()

    OpenDocument(documents, archived(session_id), opener).execute(session_id, "tarifas.txt")

    assert opener.opened == [Path("historial") / session_id / "correo.eml"]


def test_a_document_that_was_not_read_cannot_be_opened() -> None:
    _, documents, session_id = stored_review()
    open_document = OpenDocument(documents, archived(session_id), RecordingFileOpener())

    with pytest.raises(DocumentNotFoundError):
        open_document.execute(session_id, "escaneado.pdf")


def test_a_missing_copy_is_reported() -> None:
    _, documents, session_id = stored_review()
    open_document = OpenDocument(documents, InMemoryDocumentArchive(), RecordingFileOpener())

    with pytest.raises(ArchivedFileMissingError):
        open_document.execute(session_id, "contrato.pdf")
