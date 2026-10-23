from dataclasses import dataclass

import pytest

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.text_comparison.change_detector import ChangeDetector
from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.segment_aligner import SegmentAligner
from argus.application.text_comparison.segment_similarity import LexicalSegmentSimilarity
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.materiality import MATERIALITY_CLASSIFIER
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from argus.infrastructure.extraction.date_extractor import DateExtractor
from argus.infrastructure.extraction.money_extractor import MoneyExtractor
from argus.infrastructure.extraction.organization_name_extractor import (
    OrganizationNameExtractor,
)
from tests.domain.text_comparison.segment_builders import segments_of

THRESHOLD = 0.5


@dataclass(frozen=True)
class Expected:
    materiality: Materiality
    risk: RiskLevel


def detect(first: tuple[str, ...], second: tuple[str, ...]) -> tuple[Change, ...]:
    values = EntityExtractionPipeline(
        [ContractIdExtractor(), DateExtractor(), MoneyExtractor(), OrganizationNameExtractor()]
    )
    alignment = SegmentAligner(LexicalSegmentSimilarity()).align(
        segments_of("v1.docx", *first), segments_of("v2.docx", *second), THRESHOLD
    )
    detector = ChangeDetector(ChangeFactsReader(values), MATERIALITY_CLASSIFIER)
    return detector.detect(alignment)


def only_change(first: str, second: str) -> Change:
    (change,) = detect(("Objeto del contrato", first), ("Objeto del contrato", second))
    return change


@pytest.mark.parametrize(
    ("first", "second", "expected"),
    [
        (
            "Contrato de arrendamiento No. 4857 entre las partes",
            "Contrato de arrendamiento No. 4587 entre las partes",
            Expected(Materiality.NUMBER, RiskLevel.HIGH),
        ),
        (
            "El canon mensual es de $ 18.450.000 pagaderos por mes",
            "El canon mensual es de $ 18.540.000 pagaderos por mes",
            Expected(Materiality.AMOUNT, RiskLevel.HIGH),
        ),
        (
            "La entrega será el 15 de marzo de 2026 en la bodega",
            "La entrega será el 15 de abril de 2026 en la bodega",
            Expected(Materiality.DATE, RiskLevel.HIGH),
        ),
        (
            "Las partes podrán ceder el contrato a terceros",
            "Las partes no podrán ceder el contrato a terceros",
            Expected(Materiality.NEGATION, RiskLevel.HIGH),
        ),
        (
            "El arrendatario es Logística Andina S.A.S. desde hoy",
            "El arrendatario es Transportes del Sur S.A.S. desde hoy",
            Expected(Materiality.PARTY, RiskLevel.MEDIUM),
        ),
        # Plan de la Fase 1: palabra eliminada y sinónimo son cambios de redacción, riesgo bajo.
        (
            "La bodega se entrega limpia y en buen estado de conservación",
            "La bodega se entrega limpia y en estado de conservación",
            Expected(Materiality.WORDING, RiskLevel.LOW),
        ),
        (
            "La bodega se entrega limpia y en buen estado",
            "La bodega se entrega limpia y en perfecto estado",
            Expected(Materiality.WORDING, RiskLevel.LOW),
        ),
    ],
)
def test_each_modified_segment_gets_its_materiality_and_risk(
    first: str, second: str, expected: Expected
) -> None:
    change = only_change(first, second)

    assert change.kind is ChangeKind.MODIFIED
    assert change.materialities == (expected.materiality,)
    assert change.risk is expected.risk
    assert change.edits
    assert change.first is not None
    assert change.second is not None


@pytest.mark.parametrize(
    ("first", "second", "materiality"),
    [
        ("El arrendatario recibe la bodega", "EL ARRENDATARIO recibe la bodega", Materiality.CASE),
        (
            "Logística Andina S.A.S. firma hoy",
            "Logística Andina SAS firma hoy",
            Materiality.PUNCTUATION,
        ),
        ("El canon se paga\ncada mes", "El canon se paga cada mes", Materiality.FORMAT),
    ],
)
def test_case_punctuation_and_format_changes_are_reported_as_low_risk(
    first: str, second: str, materiality: Materiality
) -> None:
    change = only_change(first, second)

    assert (change.kind, change.materialities, change.risk) == (
        ChangeKind.MODIFIED,
        (materiality,),
        RiskLevel.LOW,
    )


def test_a_clause_that_changed_place_is_moved_without_edits() -> None:
    changes = detect(
        ("Objeto", "Canon de arrendamiento", "Plazo de doce meses", "Multas por retraso"),
        ("Objeto", "Multas por retraso", "Canon de arrendamiento", "Plazo de doce meses"),
    )

    (moved,) = changes
    assert (moved.kind, moved.risk, moved.edits) == (ChangeKind.MOVED, RiskLevel.LOW, ())
    assert moved.materialities == ()
    assert moved.first is not None
    assert moved.first.text == "Multas por retraso"


def test_added_and_removed_segments_are_reported_with_what_they_contain() -> None:
    changes = detect(
        ("Objeto", "Confidencialidad entre las partes"),
        ("Objeto", "Cláusula penal por $ 5.000.000 en caso de retraso"),
    )

    by_kind = {change.kind: change for change in changes}
    assert by_kind[ChangeKind.REMOVED].risk is RiskLevel.MEDIUM
    assert by_kind[ChangeKind.ADDED].risk is RiskLevel.HIGH
    assert by_kind[ChangeKind.ADDED].materialities == (Materiality.AMOUNT,)
    assert by_kind[ChangeKind.ADDED].first is None


def test_identical_documents_have_no_changes() -> None:
    assert detect(("Objeto", "Canon"), ("Objeto", "Canon")) == ()
