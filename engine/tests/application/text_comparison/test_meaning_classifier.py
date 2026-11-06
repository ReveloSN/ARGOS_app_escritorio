from collections.abc import Sequence

import pytest

from argus.application.text_comparison.meaning_classifier import (
    RuleAndSimilarityMeaningClassifier,
    changes_obligation,
)
from argus.application.text_comparison.segment_similarity import ScoreMatrix
from argus.domain.locations import ParagraphLocation
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.meaning import ChangeMeaning, MeaningSuggestion
from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin, TextSpan


class FixedSimilarity:
    def __init__(self, score: float) -> None:
        self._score = score

    def scores(self, first: Sequence[str], second: Sequence[str]) -> ScoreMatrix:
        return ((self._score,),)


def segment(text: str) -> Segment:
    origin = SegmentOrigin("Contrato.docx", ParagraphLocation(1), TextSpan(0, len(text)))
    return Segment(1, SegmentKind.PARAGRAPH, text, origin)


PAGO = segment("El arrendatario pagará el canon dentro de los cinco primeros días.")
PAGADO = segment("El canon será pagado por el arrendatario en los cinco primeros días.")
WORDING = frozenset({Materiality.WORDING})


def classify(
    score: float | None, kind: ChangeKind, materialities: frozenset[Materiality]
) -> MeaningSuggestion | None:
    similarity = None if score is None else FixedSimilarity(score)
    return RuleAndSimilarityMeaningClassifier(similarity).classify(
        kind, materialities, [PAGO, PAGADO]
    )


def test_a_substantive_change_is_a_change_of_meaning() -> None:
    suggestion = classify(0.99, ChangeKind.MODIFIED, frozenset({Materiality.NEGATION}))

    assert suggestion == MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, 0.9)


def test_a_change_of_form_only_is_reworded() -> None:
    suggestion = classify(0.4, ChangeKind.MODIFIED, frozenset({Materiality.CASE}))

    assert suggestion == MeaningSuggestion(ChangeMeaning.REWORDED, 0.95)


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (0.97, MeaningSuggestion(ChangeMeaning.REWORDED, 0.97)),
        (0.56, MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, 0.69)),
        (0.8, None),
    ],
)
def test_only_wording_is_decided_by_meaning_similarity(
    score: float, expected: MeaningSuggestion | None
) -> None:
    assert classify(score, ChangeKind.MODIFIED, WORDING) == expected


def test_without_the_model_only_wording_has_no_suggestion() -> None:
    assert classify(None, ChangeKind.MODIFIED, WORDING) is None


@pytest.mark.parametrize("kind", [ChangeKind.ADDED, ChangeKind.REMOVED, ChangeKind.MOVED])
@pytest.mark.parametrize(
    "materialities", [WORDING, frozenset({Materiality.AMOUNT}), frozenset({Materiality.CASE})]
)
def test_only_a_changed_pair_has_a_meaning_suggestion(
    kind: ChangeKind, materialities: frozenset[Materiality]
) -> None:
    # Regresión: una eliminación pura se etiquetaba «Cambio de sentido» sin tener dos textos.
    sides = [PAGO] if kind is not ChangeKind.MOVED else [PAGO, PAGO]

    assert RuleAndSimilarityMeaningClassifier(None).classify(kind, materialities, sides) is None


def test_may_becoming_must_changes_the_meaning_even_if_it_reads_the_same() -> None:
    may = segment("El arrendador podrá revisar el inmueble cada seis meses.")
    must = segment("El arrendador deberá revisar el inmueble cada seis meses.")

    suggestion = RuleAndSimilarityMeaningClassifier(FixedSimilarity(0.98)).classify(
        ChangeKind.MODIFIED, WORDING, [may, must]
    )

    assert suggestion == MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, 0.8)
    assert not changes_obligation(PAGO.text, PAGADO.text)
