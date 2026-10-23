"""Construcción de «Revisar antes de enviar» (ADR 022): leer, verificar, decidir y corregir."""

from dataclasses import dataclass
from pathlib import Path

from argus.application.decision_history import DecisionHistories
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.draft_checks import ForeignRecipientCheck, MissingAttachmentCheck
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.period_mismatch_check import PeriodMismatchCheck
from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import DocumentArchive, FileOpener
from argus.application.ports.repositories import DocumentRepository, SessionRepository
from argus.application.review_before_sending import (
    CaseFileAccess,
    ReviewBeforeSending,
    SendReviewTools,
)
from argus.application.send_checks import SendCheck
from argus.application.send_decisions import CorrectionSources, OpenCorrectedDraft, SendDecisions
from argus.infrastructure.drafts.archived_case_file_library import ArchivedCaseFileLibrary
from argus.infrastructure.drafts.eml_draft_reader import EmlDraftReader
from argus.infrastructure.drafts.eml_draft_writer import EmlDraftWriter
from argus.infrastructure.drafts.file_system_draft_outbox import FileSystemDraftOutbox
from argus.infrastructure.persistence.sqlite_decision_repository import SqliteDecisionRepository
from argus.infrastructure.persistence.sqlite_send_review_repository import (
    SqliteSendReviewRepository,
)

# Las copias corregidas van junto al historial; el original del usuario nunca se toca.
CORRECTED_DRAFTS_FOLDER = "borradores_corregidos"


@dataclass(frozen=True)
class SendServices:
    review: ReviewBeforeSending
    decisions: SendDecisions
    open_corrected: OpenCorrectedDraft


@dataclass(frozen=True)
class SendStorage:
    sessions: SessionRepository
    documents: DocumentRepository
    reviews: SqliteSendReviewRepository
    decisions: SqliteDecisionRepository
    archive: DocumentArchive


@dataclass(frozen=True)
class SendDependencies:
    attachment_readers: DocumentReaderFactory
    values: EntityExtractionPipeline
    clock: Clock
    opener: FileOpener
    data_directory: Path


def build_send_checks(values: EntityExtractionPipeline) -> list[SendCheck]:
    return [PeriodMismatchCheck(values), MissingAttachmentCheck(), ForeignRecipientCheck()]


def build_send_services(storage: SendStorage, dependencies: SendDependencies) -> SendServices:
    library = ArchivedCaseFileLibrary(storage.documents, storage.archive)
    tools = SendReviewTools(
        EmlDraftReader(dependencies.attachment_readers),
        build_send_checks(dependencies.values),
        dependencies.clock,
    )
    outbox = FileSystemDraftOutbox(
        dependencies.data_directory / CORRECTED_DRAFTS_FOLDER, dependencies.opener
    )
    return SendServices(
        review=ReviewBeforeSending(
            tools, CaseFileAccess(storage.sessions, library), storage.reviews
        ),
        decisions=SendDecisions(
            storage.reviews, DecisionHistories(storage.decisions, dependencies.clock)
        ),
        open_corrected=OpenCorrectedDraft(
            CorrectionSources(storage.reviews, storage.decisions, library), EmlDraftWriter(), outbox
        ),
    )
