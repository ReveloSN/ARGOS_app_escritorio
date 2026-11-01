"""Construcción del informe exportable (ADR 023): maquetar en PDF o DOCX y guardar."""

from dataclasses import dataclass
from pathlib import Path

from argus.application.export_report import (
    CaseFileNames,
    ComparisonCaseFileNames,
    ExportReport,
    OpenReport,
    ReportRenderer,
    ReportTools,
    SessionCaseFileNames,
)
from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import FileOpener
from argus.application.ports.repositories import ComparisonRepository, SessionRepository
from argus.domain.report_document import ReportFormat
from argus.infrastructure.reports.documents_report_folder import DocumentsReportFolder
from argus.infrastructure.reports.docx_report_renderer import DocxReportRenderer
from argus.infrastructure.reports.pdf_report_renderer import PdfReportRenderer


@dataclass(frozen=True)
class ReportChannel:
    """Exportar y abrir el informe de un tipo de elemento (expediente o comparación)."""

    export: ExportReport
    open: OpenReport


@dataclass(frozen=True)
class ReportServices:
    export: ExportReport
    open: OpenReport
    comparison: ReportChannel
    # Versión del motor: el pie del informe dice con qué versión de ARGUS se generó.
    version: str


@dataclass(frozen=True)
class ReportDependencies:
    sessions: SessionRepository
    comparisons: ComparisonRepository
    clock: Clock
    opener: FileOpener
    version: str


def build_report_services(dependencies: ReportDependencies, directory: Path) -> ReportServices:
    folder = DocumentsReportFolder(directory)
    renderers: dict[ReportFormat, ReportRenderer] = {
        ReportFormat.PDF: PdfReportRenderer(),
        ReportFormat.DOCX: DocxReportRenderer(),
    }
    tools = ReportTools(renderers, folder, dependencies.clock)
    sessions = SessionCaseFileNames(dependencies.sessions)
    comparisons = ComparisonCaseFileNames(dependencies.comparisons)

    def channel(names: CaseFileNames) -> ReportChannel:
        return ReportChannel(
            ExportReport(names, tools), OpenReport(names, folder, dependencies.opener)
        )

    sessions_channel = channel(sessions)
    return ReportServices(
        export=sessions_channel.export,
        open=sessions_channel.open,
        comparison=channel(comparisons),
        version=dependencies.version,
    )
