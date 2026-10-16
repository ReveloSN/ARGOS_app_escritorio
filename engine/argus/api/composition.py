"""Construcción de las dependencias del motor: el único lugar que conoce los adaptadores."""

from dataclasses import dataclass
from pathlib import Path

from platformdirs import user_data_path

from argus.api.settings import EngineSettings
from argus.application.alert_explanation import AlertExplainer, TemplateAlertExplainer
from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.document_access import OpenDocument, SearchDocuments
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.feedback_confidence import FeedbackAdjustingReviewAnalyzer
from argus.application.open_review import OpenReview, StoredReviewRepositories
from argus.application.out_of_pattern import AmountScaleSource, DateOutlierSource
from argus.application.ports.document_archive import DocumentArchive, FileOpener
from argus.application.referenced_period import ReferencedPeriodSource
from argus.application.review_analyzers import (
    AlertSource,
    EntityReviewAnalyzer,
    InconsistencySource,
    ReviewAnalyzer,
    SuppressingReviewAnalyzer,
)
from argus.application.review_decisions import DecisionRepositories, ReviewDecisions
from argus.application.review_history import (
    HistoryRepositories,
    PurgeExpiredHistory,
    ReviewHistory,
)
from argus.application.review_recording import StoredReviewRecorder
from argus.application.review_session_use_cases import CloseReviewSession, StartReviewSession
from argus.application.run_review import RunReview
from argus.application.suppress_similar_alerts import SuppressSimilarAlerts
from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.document import DocumentFormat
from argus.domain.preferences import HISTORY_RETENTION
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
from argus.infrastructure.file_system_document_archive import FileSystemDocumentArchive
from argus.infrastructure.nlp.embedding_model import embedding_model_directory, is_model_available
from argus.infrastructure.nlp.onnx_text_similarity import OnnxTextSimilarity
from argus.infrastructure.nlp.spacy_person_extractor import SpacyPersonNameExtractor
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_decision_statistics import SqliteDecisionStatistics
from argus.infrastructure.persistence.sqlite_document_repository import SqliteDocumentRepository
from argus.infrastructure.persistence.sqlite_preference_repositories import (
    SqlitePreferencesRepository,
    SqliteSuppressionRuleRepository,
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
ARCHIVE_FOLDER_NAME = "documents"


@dataclass(frozen=True)
class ReviewStorage:
    sessions: SqliteSessionRepository
    alerts: SqliteAlertRepository
    decisions: SqliteDecisionRepository
    documents: SqliteDocumentRepository
    preferences: SqlitePreferencesRepository
    rules: SqliteSuppressionRuleRepository
    statistics: SqliteDecisionStatistics


@dataclass(frozen=True)
class EngineServices:
    """Casos de uso ya construidos que las rutas HTTP reciben por inyección."""

    run_review: RunReview
    open_review: OpenReview
    close_review: CloseReviewSession
    decisions: ReviewDecisions
    history: ReviewHistory
    search_documents: SearchDocuments
    open_document: OpenDocument
    suppress_similar: SuppressSimilarAlerts
    explainer: AlertExplainer
    storage: ReviewStorage
    data_directory: Path


def default_data_directory() -> Path:
    """Carpeta de datos de la app según el sistema operativo (AppData, ~/.local/share…)."""
    return user_data_path(APP_NAME, appauthor=False)


def build_review_storage(database_path: Path) -> ReviewStorage:
    database = SqliteDatabase(database_path)
    database.migrate()
    return ReviewStorage(
        SqliteSessionRepository(database),
        SqliteAlertRepository(database),
        SqliteDecisionRepository(database),
        SqliteDocumentRepository(database),
        SqlitePreferencesRepository(database),
        SqliteSuppressionRuleRepository(database),
        SqliteDecisionStatistics(database),
    )


def build_engine_services(settings: EngineSettings, opener: FileOpener) -> EngineServices:
    data_directory = settings.data_directory
    storage = build_review_storage(data_directory / DATABASE_FILE_NAME)
    archive = FileSystemDocumentArchive(data_directory / ARCHIVE_FOLDER_NAME)
    clock = SystemClock()
    apply_history_retention(storage, archive)
    analyzer = build_review_analyzer(storage, build_alert_sources(settings.models_directory))
    return EngineServices(
        run_review=build_run_review(storage, archive, analyzer),
        open_review=OpenReview(
            StoredReviewRepositories(storage.sessions, storage.alerts, storage.documents)
        ),
        close_review=CloseReviewSession(storage.sessions, clock),
        decisions=ReviewDecisions(DecisionRepositories(storage.sessions, storage.decisions), clock),
        history=ReviewHistory(
            HistoryRepositories(storage.sessions, storage.alerts, storage.decisions)
        ),
        search_documents=SearchDocuments(storage.sessions, storage.documents),
        open_document=OpenDocument(storage.documents, archive, opener),
        suppress_similar=SuppressSimilarAlerts(storage.alerts, storage.rules, clock),
        explainer=TemplateAlertExplainer(storage.statistics),
        storage=storage,
        data_directory=data_directory,
    )


def apply_history_retention(storage: ReviewStorage, archive: DocumentArchive) -> int:
    """Al iniciar, borra las revisiones vencidas si el usuario limitó el historial a 90 días."""
    if not storage.preferences.get().has_retention_limit:
        return 0
    return PurgeExpiredHistory(storage.sessions, archive, SystemClock()).execute(HISTORY_RETENTION)


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
            SpacyPersonNameExtractor(),
        ]
    )


def build_alert_sources(models_directory: Path) -> list[AlertSource]:
    """Capas de detección (CLAUDE.md §8): reglas, semántica (si está el modelo) y anomalías."""
    classifier = RiskClassifier(DEFAULT_RISK_RULES)
    model = embedding_model_directory(models_directory)
    semantic: list[AlertSource] = (
        [ReferencedPeriodSource(OnnxTextSimilarity(model), classifier)]
        if is_model_available(model)
        else []
    )
    return [
        InconsistencySource(build_inconsistency_detector),
        *semantic,
        DateOutlierSource(classifier),
        AmountScaleSource(classifier),
    ]


def build_review_analyzer(storage: ReviewStorage, sources: list[AlertSource]) -> ReviewAnalyzer:
    analyzer = EntityReviewAnalyzer(
        build_entity_extraction_pipeline(), sources, storage.preferences
    )
    suppressing = SuppressingReviewAnalyzer(analyzer, storage.rules)
    return FeedbackAdjustingReviewAnalyzer(suppressing, storage.statistics)


def build_run_review(
    storage: ReviewStorage, archive: DocumentArchive, analyzer: ReviewAnalyzer
) -> RunReview:
    start_session = StartReviewSession(storage.sessions, storage.alerts, SystemClock())
    recorder = StoredReviewRecorder(start_session, storage.documents, archive)
    return RunReview(build_document_reader_factory(), analyzer, recorder)
