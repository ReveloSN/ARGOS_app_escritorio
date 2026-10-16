from collections.abc import Sequence

import pytest

from argus.application.period_mentions import Month, mentions_in, month_of, months_in
from argus.application.referenced_period import ReferencedPeriodSource, describe, names_in
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from tests.application.analysis_builders import context_with, found, text_document

RATES = text_document("Anexo_2_tarifas.xlsx", "Tarifas mayo 2026", "Canon $ 18.450.000")
NOTES = text_document("notas.txt", "Informe de gestión de junio 2026")
EMAIL = text_document(
    "correo.eml", "Adjunto el informe de junio con las tarifas.", attachments=[RATES, NOTES]
)
ENTITIES = [
    found(EntityType.PERIOD, ("junio", "XXXX-06"), "correo.eml"),
    found(EntityType.PERIOD, ("mayo 2026", "2026-05"), "Anexo_2_tarifas.xlsx"),
    found(EntityType.PERIOD, ("junio 2026", "2026-06"), "notas.txt"),
]


class FixedSimilarity:
    """Similitud de prueba: la misma para cualquier par y anota qué textos comparó."""

    def __init__(self, score: float) -> None:
        self.score = score
        self.compared: list[tuple[str, tuple[str, ...]]] = []

    def similarities(self, text: str, candidates: Sequence[str]) -> tuple[float, ...]:
        self.compared.append((text, tuple(candidates)))
        return tuple(self.score for _ in candidates)


def source_with(score: float) -> tuple[ReferencedPeriodSource, FixedSimilarity]:
    similarity = FixedSimilarity(score)
    return ReferencedPeriodSource(similarity, RiskClassifier(DEFAULT_RISK_RULES)), similarity


def test_email_citing_another_period_than_its_attachment_is_a_high_alert() -> None:
    source, similarity = source_with(0.62)

    (alert,) = source.find(context_with([EMAIL], ENTITIES))

    assert alert.difference.kind is DifferenceKind.REFERENCED_PERIOD
    assert alert.risk is RiskLevel.HIGH
    assert (alert.first.normalized_value, alert.second.normalized_value) == ("XXXX-06", "2026-05")
    assert alert.confidence == pytest.approx(0.85)
    text, excerpts = similarity.compared[0]
    assert text.startswith("Anexo 2 tarifas Tarifas mayo 2026")
    assert excerpts == ("…junio…",)


def test_an_attachment_on_another_topic_does_not_raise_an_alert() -> None:
    source, _ = source_with(0.3)

    assert list(source.find(context_with([EMAIL], ENTITIES))) == []


def test_documents_without_attachments_are_not_checked() -> None:
    source, similarity = source_with(0.9)

    assert list(source.find(context_with([RATES, NOTES], ENTITIES))) == []
    assert similarity.compared == []


@pytest.mark.parametrize(
    ("value", "month"),
    [
        ("2026-06", Month("2026", "06")),
        ("XXXX-06", Month("XXXX", "06")),
        ("2026-05-31", Month("2026", "05")),
    ],
)
def test_month_of_periods_and_dates(value: str, month: Month) -> None:
    assert month_of(value) == month


def test_durations_have_no_month() -> None:
    assert month_of("P36M") is None


def test_a_month_without_year_overlaps_the_same_month_of_any_year() -> None:
    assert Month("XXXX", "06").overlaps(Month("2026", "06"))
    assert not Month("2025", "06").overlaps(Month("2026", "06"))
    assert not Month("XXXX", "06").overlaps(Month("2026", "05"))


def test_attachment_months_include_its_dates_and_its_most_repeated_period() -> None:
    index = EntityIndex(
        [
            *ENTITIES,
            found(EntityType.PERIOD, ("mayo 2026", "2026-05"), "Anexo_2_tarifas.xlsx"),
            found(EntityType.PERIOD, ("abril 2026", "2026-04"), "Anexo_2_tarifas.xlsx"),
            found(EntityType.DATE, ("01/06/2026", "2026-06-01"), "Anexo_2_tarifas.xlsx"),
        ]
    )

    attached = months_in(index, frozenset({"Anexo_2_tarifas.xlsx"}))

    assert attached.dominant.normalized_value == "2026-05"
    assert attached.covers(Month("XXXX", "06"))
    assert [m.month for m in mentions_in(index, "correo.eml")] == [Month("XXXX", "06")]


def test_attachment_names_and_description() -> None:
    assert names_in(EMAIL) == frozenset({"correo.eml", "Anexo_2_tarifas.xlsx", "notas.txt"})
    assert describe(RATES) == "Anexo 2 tarifas Tarifas mayo 2026"
