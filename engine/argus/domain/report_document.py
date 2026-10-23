"""Informe exportable (mockup «ARGUS Informe»): su contenido ya redactado, listo para maquetar.

La interfaz redacta el informe en el idioma elegido con los datos reales del motor; el motor
solo lo maqueta en PDF o DOCX y lo guarda. Así ningún texto vive fuera de los archivos de idioma.
"""

from dataclasses import dataclass
from enum import StrEnum

from argus.domain.errors import InvalidValueError
from argus.domain.validation import require_text

PAGE_PLACEHOLDER = "{page}"
TOTAL_PLACEHOLDER = "{total}"


class ReportFormat(StrEnum):
    PDF = "pdf"
    DOCX = "docx"


@dataclass(frozen=True)
class ReportMetric:
    """Un número del resumen: «9 alertas», «4 errores reales»."""

    value: str
    label: str


@dataclass(frozen=True)
class ReportCell:
    """Un valor de la tabla y, debajo, su detalle (el origen: archivo y ubicación)."""

    text: str
    detail: str = ""


@dataclass(frozen=True)
class ReportTable:
    columns: tuple[str, ...]
    rows: tuple[tuple[ReportCell, ...], ...]

    def __post_init__(self) -> None:
        if any(len(row) != len(self.columns) for row in self.rows):
            raise InvalidValueError("Cada fila del informe necesita una celda por columna.")


@dataclass(frozen=True)
class ReportSection:
    heading: str
    paragraphs: tuple[str, ...] = ()
    metrics: tuple[ReportMetric, ...] = ()
    table: ReportTable | None = None

    def __post_init__(self) -> None:
        require_text("El título de la sección", self.heading)


@dataclass(frozen=True)
class ReportDocument:
    """El informe completo; `page_label` lleva {page} y {total} («Página {page} de {total}»)."""

    title: str
    subtitles: tuple[str, ...]
    brand: str
    sections: tuple[ReportSection, ...]
    footer: str
    page_label: str

    def __post_init__(self) -> None:
        require_text("El título del informe", self.title)

    def page_text(self, page: int, total: int) -> str:
        return self.page_label.replace(PAGE_PLACEHOLDER, str(page)).replace(
            TOTAL_PLACEHOLDER, str(total)
        )
