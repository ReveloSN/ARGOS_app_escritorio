"""Construcción del informe exportable (ADR 023): maquetar en PDF o DOCX y guardar."""

from dataclasses import dataclass
from pathlib import Path

from argus.application.export_report import (
    ExportReport,
    OpenReport,
    ReportRenderer,
    ReportTools,
)
from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import FileOpener
from argus.application.ports.repositories import SessionRepository
from argus.domain.report_document import ReportFormat
from argus.infrastructure.reports.documents_report_folder import DocumentsReportFolder
from argus.infrastructure.reports.docx_report_renderer import DocxReportRenderer
from argus.infrastructure.reports.pdf_report_renderer import PdfReportRenderer


@dataclass(frozen=True)
class ReportServices:
    export: ExportReport
    open: OpenReport
    # Versión del motor: el pie del informe dice con qué versión de ARGUS se generó.
    version: str


@dataclass(frozen=True)
class ReportDependencies:
    sessions: SessionRepository
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
    return ReportServices(
        export=ExportReport(dependencies.sessions, tools),
        open=OpenReport(dependencies.sessions, folder, dependencies.opener),
        version=dependencies.version,
    )
