from datetime import timedelta

from argus.domain.alert import Alert
from argus.domain.decision import Decision, DecisionKind
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.errors import UnreadableReason
from argus.domain.locations import LineLocation, PageLocation, SheetCellLocation
from argus.domain.ocr import ReadMethod
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary
from argus.domain.risk import RiskLevel
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_document_repository import SqliteDocumentRepository
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from tests.domain.alert_builders import candidate
from tests.infrastructure.persistence.conftest import STARTED, new_session

CONTRACT = Document(
    "contrato.pdf",
    DocumentFormat.PDF,
    (
        TextFragment("Contrato No. 4857 en Bogotá", PageLocation(1)),
        TextFragment("Canon 100% pagadero", PageLocation(2)),
    ),
)
SHEET = Document(
    "tarifas.xlsx",
    DocumentFormat.XLSX,
    (TextFragment("Tarifa junio", SheetCellLocation("Hoja1", "C12")),),
)
EMAIL = Document(
    "correo.eml",
    DocumentFormat.EML,
    (TextFragment("Adjunto tarifas", LineLocation(1)),),
    attachments=(SHEET,),
)
OUTCOMES = (
    DocumentReadOutcome("contrato.pdf", CONTRACT, None),
    DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT, page_count=4),
    DocumentReadOutcome("correo.eml", EMAIL, None),
)


def stored(database: SqliteDatabase) -> tuple[SqliteDocumentRepository, str]:
    session = new_session()
    SqliteSessionRepository(database).save(session)
    repository = SqliteDocumentRepository(database)
    repository.save_all(session.id, OUTCOMES)
    return repository, session.id


def test_read_summaries_are_listed_in_upload_order(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)

    assert repository.list_for(session_id) == (
        ReadSummary("contrato.pdf", None, 2),
        ReadSummary("escaneado.pdf", UnreadableReason.NO_TEXT, 0, page_count=4),
        ReadSummary("correo.eml", None, 2),
    )


def test_a_file_read_with_ocr_keeps_how_it_was_read(database: SqliteDatabase) -> None:
    session = new_session()
    SqliteSessionRepository(database).save(session)
    repository = SqliteDocumentRepository(database)

    ocr = DocumentReadOutcome("anexo_ocr.pdf", CONTRACT, None, ReadMethod.CLOUD_OCR, 2)
    repository.save_all(session.id, (ocr,))

    assert repository.list_for(session.id) == (
        ReadSummary("anexo_ocr.pdf", None, 2, ReadMethod.CLOUD_OCR, 2),
    )


def test_position_of_a_read_file_or_of_the_email_that_brings_it(
    database: SqliteDatabase,
) -> None:
    repository, session_id = stored(database)

    assert repository.position_of(session_id, "contrato.pdf") == 0
    assert repository.position_of(session_id, "tarifas.xlsx") == 2
    assert repository.position_of(session_id, "escaneado.pdf") is None


def test_fragments_are_found_by_their_folded_text_with_their_origin(
    database: SqliteDatabase,
) -> None:
    repository, session_id = stored(database)

    (match,) = repository.fragments_matching(session_id, "bogota", limit=5)
    (cell,) = repository.fragments_matching(session_id, "junio", limit=5)

    assert match.document_name == "contrato.pdf"
    assert match.fragment == TextFragment("Contrato No. 4857 en Bogotá", PageLocation(1))
    assert cell.document_name == "tarifas.xlsx"
    assert cell.fragment.location == SheetCellLocation("Hoja1", "C12")


def test_all_the_text_of_a_session_comes_back_in_reading_order(
    database: SqliteDatabase,
) -> None:
    repository, session_id = stored(database)

    fragments = repository.fragments_for(session_id)

    assert [named.document_name for named in fragments] == [
        "contrato.pdf",
        "contrato.pdf",
        "correo.eml",
        "tarifas.xlsx",
    ]
    assert fragments[3].fragment.location == SheetCellLocation("Hoja1", "C12")


def test_like_wildcards_in_the_query_are_taken_literally(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)

    assert len(repository.fragments_matching(session_id, "100%", limit=5)) == 1
    assert repository.fragments_matching(session_id, "_", limit=5) == ()


def test_deleting_a_session_deletes_everything_it_owns(database: SqliteDatabase) -> None:
    repository, session_id = stored(database)
    alerts = Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
    SqliteAlertRepository(database).save_all(session_id, [alerts])
    decisions = SqliteDecisionRepository(database)
    decisions.save(session_id, Decision(1, DecisionKind.CORRECT, STARTED))
    sessions = SqliteSessionRepository(database)

    sessions.delete(session_id)

    assert repository.list_for(session_id) == ()
    assert repository.fragments_matching(session_id, "contrato", limit=5) == ()
    assert SqliteAlertRepository(database).list_for(session_id) == ()
    assert decisions.list_for(session_id) == ()


def test_sessions_created_before_a_moment_are_listed(database: SqliteDatabase) -> None:
    sessions = SqliteSessionRepository(database)
    session = new_session()
    sessions.save(session)

    assert sessions.list_created_before(STARTED) == ()
    assert sessions.list_created_before(STARTED + timedelta(seconds=1)) == (session,)
