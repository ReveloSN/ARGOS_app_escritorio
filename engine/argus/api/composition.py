"""Construcción de las dependencias del motor: el único lugar que conoce los adaptadores."""

from dataclasses import dataclass
from pathlib import Path

from argus.api.comparison_composition import (
    ComparisonDependencies,
    ComparisonRepositories,
    ComparisonServices,
    build_comparison_services,
)
from argus.api.report_composition import (
    ReportDependencies,
    ReportServices,
    build_report_services,
)
from argus.api.send_composition import (
    SendDependencies,
    SendServices,
    SendStorage,
    build_send_services,
)
from argus.api.settings import EngineSettings
from argus.application.alert_explanation import AlertExplainer, TemplateAlertExplainer
from argus.application.change_history_folder import ChangeHistoryFolder
from argus.application.check_confirmed_facts import CheckConfirmedFacts, FactCheckSources
from argus.application.confirmed_facts import ConfirmedFacts, FactRepositories
from argus.application.detect_inconsistencies import DetectInconsistencies
from argus.application.document_access import OpenDocument, SearchDocuments
from argus.application.document_loader import DocumentLoader
from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.embedding_similarity import EmbeddingTextSimilarity
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.fact_value_reader import FactValueReader
from argus.application.feedback_confidence import FeedbackAdjustingReviewAnalyzer
from argus.application.open_review import OpenReview, StoredReviewRepositories
from argus.application.out_of_pattern import AmountScaleSource, DateOutlierSource
from argus.application.ports.document_archive import DocumentArchive, FileOpener
from argus.application.ports.text_embedder import TextEmbedder
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
from argus.infrastructure.checks.amount_in_words_source import AmountInWordsSource
from argus.infrastructure.checks.blank_field_source import BlankFieldSource
from argus.infrastructure.checks.date_order_source import DateOrderSource
from argus.infrastructure.checks.impossible_date_source import ImpossibleDateSource
from argus.infrastructure.checks.total_mismatch_source import TotalMismatchSource
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
from argus.infrastructure.history_location import (
    ARCHIVE_FOLDER_NAME,
    DATABASE_FILE_NAME,
    FileSystemHistoryCopier,
    JsonHistoryPointer,
)
from argus.infrastructure.nlp.embedding_model import embedding_model_directory, is_model_available
from argus.infrastructure.nlp.onnx_text_embedder import OnnxTextEmbedder
from argus.infrastructure.nlp.spacy_person_extractor import SpacyPersonNameExtractor
from argus.infrastructure.persistence.sqlite_alert_repository import SqliteAlertRepository
from argus.infrastructure.persistence.sqlite_comparison_repository import (
    SqliteComparisonRepository,
)
from argus.infrastructure.persistence.sqlite_confirmed_fact_repository import (
    SqliteConfirmedFactRepository,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_decision_repository import (
    COMPARISON_DECISIONS,
    SEND_DECISIONS,
    SqliteDecisionRepository,
)
from argus.infrastructure.persistence.sqlite_decision_statistics import SqliteDecisionStatistics
from argus.infrastructure.persistence.sqlite_document_repository import SqliteDocumentRepository
from argus.infrastructure.persistence.sqlite_preference_repositories import (
    SqlitePreferencesRepository,
    SqliteSuppressionRuleRepository,
)
from argus.infrastructure.persistence.sqlite_send_review_repository import (
    SqliteSendReviewRepository,
)
from argus.infrastructure.persistence.sqlite_session_repository import SqliteSessionRepository
from argus.infrastructure.readers.docx_reader import DocxDocumentReader
from argus.infrastructure.readers.eml_reader import EmlDocumentReader
from argus.infrastructure.readers.pdf_reader import PdfDocumentReader
from argus.infrastructure.readers.text_reader import PlainTextReader
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader
from argus.infrastructure.system_clock import SystemClock


@dataclass(frozen=True)
class ReviewStorage:
    sessions: SqliteSessionRepository
    alerts: SqliteAlertRepository
    decisions: SqliteDecisionRepository
    documents: SqliteDocumentRepository
    preferences: SqlitePreferencesRepository
    rules: SqliteSuppressionRuleRepository
    statistics: SqliteDecisionStatistics
    comparisons: SqliteComparisonRepository
    comparison_decisions: SqliteDecisionRepository
    facts: SqliteConfirmedFactRepository
    send_reviews: SqliteSendReviewRepository
    send_decisions: SqliteDecisionRepository


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
    change_history_folder: ChangeHistoryFolder
    comparisons: ComparisonServices
    facts: ConfirmedFacts
    check_facts: CheckConfirmedFacts
    sending: SendServices
    reports: ReportServices
    storage: ReviewStorage
    data_directory: Path


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
        SqliteComparisonRepository(database),
        SqliteDecisionRepository(database, COMPARISON_DECISIONS),
        SqliteConfirmedFactRepository(database),
        SqliteSendReviewRepository(database),
        SqliteDecisionRepository(database, SEND_DECISIONS),
    )


def build_engine_services(settings: EngineSettings, opener: FileOpener) -> EngineServices:
    data_directory = settings.data_directory
    storage = build_review_storage(data_directory / DATABASE_FILE_NAME)
    archive = FileSystemDocumentArchive(data_directory / ARCHIVE_FOLDER_NAME)
    clock = SystemClock()
    apply_history_retention(storage, archive)
    embedder = build_text_embedder(settings.models_directory)
    values = build_entity_extraction_pipeline()
    analyzer = build_review_analyzer(storage, build_alert_sources(embedder), values)
    comparison = ComparisonDependencies(
        DocumentLoader(build_document_reader_factory()), values, embedder, analyzer
    )
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
        change_history_folder=ChangeHistoryFolder(
            data_directory,
            FileSystemHistoryCopier(data_directory),
            JsonHistoryPointer(settings.pointer_directory),
        ),
        comparisons=build_comparison_services(
            comparison,
            ComparisonRepositories(storage.comparisons, storage.comparison_decisions),
            clock,
        ),
        facts=ConfirmedFacts(
            FactRepositories(storage.sessions, storage.facts), FactValueReader(values), clock
        ),
        check_facts=build_fact_check(storage, values),
        sending=build_send_services(
            SendStorage(
                storage.sessions,
                storage.documents,
                storage.send_reviews,
                storage.send_decisions,
                archive,
            ),
            SendDependencies(build_attachment_readers(), values, clock, opener, data_directory),
        ),
        reports=build_report_services(
            ReportDependencies(storage.sessions, clock, opener, settings.version),
            settings.reports_directory,
        ),
        storage=storage,
        data_directory=data_directory,
    )


def apply_history_retention(storage: ReviewStorage, archive: DocumentArchive) -> int:
    """Al iniciar, borra las revisiones vencidas si el usuario limitó el historial a 90 días."""
    if not storage.preferences.get().has_retention_limit:
        return 0
    return PurgeExpiredHistory(storage.sessions, archive, SystemClock()).execute(HISTORY_RETENTION)


def build_attachment_readers() -> DocumentReaderFactory:
    """Los lectores de lo que puede venir adjunto a un correo (un correo dentro de otro, no)."""
    return DocumentReaderFactory(
        {
            DocumentFormat.PDF: PdfDocumentReader(),
            DocumentFormat.DOCX: DocxDocumentReader(),
            DocumentFormat.XLSX: XlsxDocumentReader(),
            DocumentFormat.TEXT: PlainTextReader(),
        }
    )


def build_document_reader_factory() -> DocumentReaderFactory:
    attachment_readers = build_attachment_readers()
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


def build_text_embedder(models_directory: Path) -> TextEmbedder | None:
    """El modelo local de embeddings, compartido por la revisión y la comparación; None si no
    está descargado (solo se omiten las capas semánticas)."""
    model = embedding_model_directory(models_directory)
    return OnnxTextEmbedder(model) if is_model_available(model) else None


def build_alert_sources(embedder: TextEmbedder | None) -> list[AlertSource]:
    """Capas de detección (CLAUDE.md §8): reglas, semántica (si está el modelo) y anomalías."""
    classifier = RiskClassifier(DEFAULT_RISK_RULES)
    semantic: list[AlertSource] = (
        [ReferencedPeriodSource(EmbeddingTextSimilarity(embedder), classifier)]
        if embedder is not None
        else []
    )
    return [
        InconsistencySource(build_inconsistency_detector),
        *semantic,
        DateOutlierSource(classifier),
        AmountScaleSource(classifier),
        *build_internal_checks(classifier),
    ]


def build_internal_checks(classifier: RiskClassifier) -> list[AlertSource]:
    """Verificaciones dentro de cada documento (ADR 022): cifras, totales, fechas y campos."""
    return [
        AmountInWordsSource(classifier),
        TotalMismatchSource(classifier),
        DateOrderSource(classifier),
        ImpossibleDateSource(classifier),
        BlankFieldSource(classifier),
    ]


def build_review_analyzer(
    storage: ReviewStorage, sources: list[AlertSource], values: EntityExtractionPipeline
) -> ReviewAnalyzer:
    analyzer = EntityReviewAnalyzer(values, sources, storage.preferences)
    suppressing = SuppressingReviewAnalyzer(analyzer, storage.rules)
    return FeedbackAdjustingReviewAnalyzer(suppressing, storage.statistics)


def build_fact_check(
    storage: ReviewStorage, values: EntityExtractionPipeline
) -> CheckConfirmedFacts:
    sources = FactCheckSources(
        storage.documents, storage.alerts, storage.preferences, storage.rules
    )
    return CheckConfirmedFacts(sources, values, RiskClassifier(DEFAULT_RISK_RULES))


def build_run_review(
    storage: ReviewStorage, archive: DocumentArchive, analyzer: ReviewAnalyzer
) -> RunReview:
    start_session = StartReviewSession(storage.sessions, storage.alerts, SystemClock())
    recorder = StoredReviewRecorder(start_session, storage.documents, archive)
    return RunReview(DocumentLoader(build_document_reader_factory()), analyzer, recorder)
