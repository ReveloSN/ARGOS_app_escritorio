"""Construcción de las dependencias del motor: el único lugar que conoce los adaptadores."""

from dataclasses import dataclass
from pathlib import Path

from platformdirs import user_data_path

from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.review_session_use_cases import StartReviewSession
from argus.application.run_review import EntityReviewAnalyzer, RunReview
from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.document import DocumentFormat
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.domain.sensitivity import DEFAULT_SENSITIVITY, Sensitivity
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from argus.infrastructure.extraction.date_extractor import DateExtractor
from argus.infrastructure.extraction.money_extractor import MoneyExtractor
from argus.infrastructure.extraction.organization_name_extractor import (
    OrganizationNameExtractor,
)
from argus.infrastructure.extraction.period_extractor import PeriodExtractor
from argus.infrastructure.extraction.person_name_extractor import PersonNameExtractor
from argus.infrastructure.extraction.tax_id_extractor import TaxIdExtractor
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from argus.infrastructure.readers.docx_reader import DocxDocumentReader
from argus.infrastructure.readers.eml_reader import EmlDocumentReader
from argus.infrastructure.readers.pdf_reader import PdfDocumentReader
from argus.infrastructure.readers.text_reader import PlainTextReader
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader
from argus.infrastructure.system_clock import SystemClock

APP_NAME = "ARGUS"
DATABASE_FILE_NAME = "argus.sqlite3"


@dataclass(frozen=True)
class ReviewStorage:
    sessions: SqliteSessionRepository
    alerts: SqliteAlertRepository
    decisions: SqliteDecisionRepository


def default_database_path() -> Path:
    """Carpeta de datos de la app según el sistema operativo (AppData, ~/.local/share…)."""
    return user_data_path(APP_NAME, appauthor=False) / DATABASE_FILE_NAME


def build_review_storage(database_path: Path) -> ReviewStorage:
    database = SqliteDatabase(database_path)
    database.migrate()
    return ReviewStorage(
        SqliteSessionRepository(database),
        SqliteAlertRepository(database),
        SqliteDecisionRepository(database),
    )


def build_document_reader_factory() -> DocumentReaderFactory:
    attachment_readers = DocumentReaderFactory(
        {
            DocumentFormat.PDF: PdfDocumentReader(),
            DocumentFormat.DOCX: DocxDocumentReader(),
            DocumentFormat.XLSX: XlsxDocumentReader(),
            DocumentFormat.TEXT: PlainTextReader(),
        }
    )
    return attachment_readers.with_reader(DocumentFormat.EML, EmlDocumentReader(attachment_readers))


def build_inconsistency_detector(
    sensitivity: Sensitivity = DEFAULT_SENSITIVITY,
) -> DetectInconsistencies:
    policy = sensitivity.policy
    return DetectInconsistencies(
        comparators_for(policy),
        RiskClassifier(DEFAULT_RISK_RULES),
        reports_format_differences=policy.reports_format_differences,
    )


def build_entity_extraction_pipeline() -> EntityExtractionPipeline:
    # Orden de prioridad (ADR 010): primero los valores con etiqueta explícita, luego los que
    # podrían contener a otros (una fecha contiene un mes) y al final los nombres.
    return EntityExtractionPipeline(
        [
            TaxIdExtractor(),
            ContractIdExtractor(),
            DateExtractor(),
            MoneyExtractor(),
            PeriodExtractor(),
            OrganizationNameExtractor(),
            PersonNameExtractor(),
        ]
    )


def build_run_review(storage: ReviewStorage) -> RunReview:
    analyzer = EntityReviewAnalyzer(
        build_entity_extraction_pipeline(), build_inconsistency_detector()
    )
    start_session = StartReviewSession(storage.sessions, storage.alerts, SystemClock())
    return RunReview(build_document_reader_factory(), analyzer, start_session)
