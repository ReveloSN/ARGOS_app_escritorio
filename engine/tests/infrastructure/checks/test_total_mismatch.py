from decimal import Decimal

from argus.domain.comparison.difference import DifferenceKind
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.locations import SheetCellLocation, TableCellLocation
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.infrastructure.checks.table_grid import cell_amount
from argus.infrastructure.checks.total_mismatch_source import TotalMismatchSource
from tests.application.analysis_builders import context_with
from tests.domain.alert_builders import second_side

SOURCE = TotalMismatchSource(RiskClassifier(DEFAULT_RISK_RULES))


def sheet(*cells: tuple[str, str], name: str = "Anexo_2_tarifas.xlsx") -> Document:
    fragments = tuple(
        TextFragment(text, SheetCellLocation("Tarifas", cell)) for cell, text in cells
    )
    return Document(name, DocumentFormat.XLSX, fragments)


def test_a_total_that_is_not_the_sum_of_its_cells_is_an_alert() -> None:
    rates = sheet(
        ("B1", "Concepto"), ("C1", "Valor"),
        ("B2", "Canon"), ("C2", "18450000"),
        ("B3", "Administración"), ("C3", "$ 1.200.000"),
        ("B4", "Total"), ("C4", "19.560.000"),
    )  # fmt: skip

    (alert,) = SOURCE.find(context_with([rates], []))

    assert alert.difference.kind is DifferenceKind.TOTAL_MISMATCH
    assert alert.risk is RiskLevel.HIGH
    assert alert.first.normalized_value == "COP:19560000"
    computed = second_side(alert).representative
    assert computed.normalized_value == "COP:19650000"
    assert computed.occurrence.location == SheetCellLocation("Tarifas", "C2:C3")
    assert computed.occurrence.excerpt == "18450000 + $ 1.200.000"


def test_a_correct_total_or_a_single_addend_is_not_checked() -> None:
    correct = sheet(
        ("B1", "10"), ("B2", "20"), ("A3", "TOTAL GENERAL"), ("B3", "30"), name="a.xlsx"
    )
    single = sheet(("B1", "Canon"), ("C1", "100"), ("B2", "Total"), ("C2", "90"), name="b.xlsx")
    subtotal = sheet(("C1", "10"), ("C2", "20"), ("B3", "Subtotal"), ("C3", "35"), name="c.xlsx")

    assert list(SOURCE.find(context_with([correct, single, subtotal], []))) == []


def test_word_tables_are_checked_too() -> None:
    cells = (
        ("Canon", 2, 1),
        ("100", 2, 2),
        ("Cuota", 3, 1),
        ("50", 3, 2),
        ("Total", 4, 1),
        ("140", 4, 2),
    )
    fragments = tuple(
        TextFragment(text, TableCellLocation(1, row, column)) for text, row, column in cells
    )
    contract = Document("Contrato.docx", DocumentFormat.DOCX, fragments)

    (alert,) = SOURCE.find(context_with([contract], []))

    assert second_side(alert).representative.occurrence.location == TableCellLocation(1, 2, 2)


def test_reads_amounts_written_by_people_or_by_excel() -> None:
    assert cell_amount("$ 18.450.000,50") == Decimal("18450000.50")
    assert cell_amount("18450000.5") == Decimal("18450000.5")
    assert cell_amount("COP 1.200") == Decimal(1200)
    assert cell_amount("Canon") is None
