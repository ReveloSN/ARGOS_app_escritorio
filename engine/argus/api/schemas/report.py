"""Informe exportable: el contenido ya redactado por la interfaz y dónde quedó guardado."""

from typing import Annotated

from pydantic import Field

from argus.api.schemas.review import CamelModel
from argus.domain.report_document import (
    ReportCell,
    ReportDocument,
    ReportFormat,
    ReportMetric,
    ReportSection,
    ReportTable,
)

Text = Annotated[str, Field(max_length=4000)]


class ReportCellBody(CamelModel):
    text: Text
    detail: Text = ""


class ReportTableBody(CamelModel):
    columns: list[Text]
    rows: list[list[ReportCellBody]]


class ReportMetricBody(CamelModel):
    value: Text
    label: Text


class ReportSectionBody(CamelModel):
    heading: Annotated[str, Field(min_length=1, max_length=200)]
    paragraphs: list[Text] = Field(default_factory=list)
    metrics: list[ReportMetricBody] = Field(default_factory=list)
    table: ReportTableBody | None = None


class ReportDocumentBody(CamelModel):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    subtitles: list[Text]
    brand: Text
    sections: list[ReportSectionBody]
    footer: Text
    page_label: Text

    def to_document(self) -> ReportDocument:
        return ReportDocument(
            self.title,
            tuple(self.subtitles),
            self.brand,
            tuple(_section(section) for section in self.sections),
            self.footer,
            self.page_label,
        )


def _section(body: ReportSectionBody) -> ReportSection:
    table = None
    if body.table is not None:
        rows = tuple(
            tuple(ReportCell(cell.text, cell.detail) for cell in row) for row in body.table.rows
        )
        table = ReportTable(tuple(body.table.columns), rows)
    metrics = tuple(ReportMetric(metric.value, metric.label) for metric in body.metrics)
    return ReportSection(body.heading, tuple(body.paragraphs), metrics, table)


class ExportReportBody(CamelModel):
    format: ReportFormat
    document: ReportDocumentBody


class OpenReportBody(CamelModel):
    file_name: Annotated[str, Field(min_length=1)]


class ReportLocationResponse(CamelModel):
    """Dónde se guarda el informe del expediente y con qué nombre (sin la extensión)."""

    folder: str
    file_name: str


class ReportPlanResponse(ReportLocationResponse):
    """Antes de exportar: además, la versión de ARGUS que firma el pie del informe."""

    version: str
