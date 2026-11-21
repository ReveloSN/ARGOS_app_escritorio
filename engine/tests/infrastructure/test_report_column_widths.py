from argus.domain.report_document import ReportCell, ReportTable
from argus.infrastructure.reports.report_column_widths import CELL_PADDING, column_widths

AVAILABLE = 500.0
LONG_FILE = "contrato_prestacion_servicios_consultoria_ambiental_version_original_2026.txt"


def _width(text: str) -> float:
    return float(len(text))


def _evidence_table() -> ReportTable:
    row = (
        ReportCell("12"),
        ReportCell("Alto"),
        ReportCell("Identificador"),
        ReportCell("4587", f"{LONG_FILE} · Línea 1"),
        ReportCell("4857", f"{LONG_FILE} · Línea 1"),
    )
    return ReportTable(("#", "Riesgo", "Dato", "Valor A · origen", "Valor B · origen"), (row,))


def test_short_columns_fit_their_longest_word_and_the_rest_share_the_width() -> None:
    widths = column_widths(_evidence_table(), AVAILABLE, _width)

    assert widths[0] == len("12") + CELL_PADDING
    assert widths[1] == len("Riesgo") + CELL_PADDING
    assert widths[2] == len("Identificador") + CELL_PADDING
    assert widths[3] == widths[4]
    assert sum(widths) == AVAILABLE


def test_without_room_for_the_short_columns_every_column_gets_the_same_width() -> None:
    widths = column_widths(_evidence_table(), 30.0, _width)

    assert widths == [6.0] * 5


def test_when_every_column_is_short_they_grow_in_proportion_to_their_content() -> None:
    table = ReportTable(
        ("#", "Decisión", "Fecha"),
        ((ReportCell("1"), ReportCell("Es un error"), ReportCell("09/11/2026 00:40")),),
    )

    widths = column_widths(table, AVAILABLE, _width)

    assert sum(widths) == AVAILABLE
    assert widths[0] < widths[1] < widths[2]
