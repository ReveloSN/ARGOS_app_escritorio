"""Clasificación «reformulado» frente a «cambio de sentido» (plan v0.1, Fase 6; ADR 024)."""

from collections.abc import Sequence
from typing import Protocol

from argus.application.text_comparison.segment_similarity import SegmentSimilarity
from argus.domain.text_comparison.change import ChangeKind, Materiality
from argus.domain.text_comparison.meaning import ChangeMeaning, MeaningSuggestion
from argus.domain.text_comparison.segment import Segment
from argus.domain.text_search import fold_for_search

COSMETIC = frozenset({Materiality.CASE, Materiality.PUNCTUATION, Materiality.FORMAT})
SUBSTANTIVE = frozenset(
    {
        Materiality.AMOUNT,
        Materiality.DATE,
        Materiality.NUMBER,
        Materiality.PARTY,
        Materiality.NEGATION,
    }
)
# Solo cambia la forma: no hay otra lectura posible.
COSMETIC_CONFIDENCE = 0.95
# Cambia un monto, una fecha, un número, una parte o una negación: las reglas lo saben.
SUBSTANTIVE_CONFIDENCE = 0.9
# Texto que aparece o desaparece entero: casi siempre cambia lo que el documento permite u obliga.
WHOLE_SEGMENT_CONFIDENCE = 0.7
# Umbrales del benchmark del ADR 024 sobre los fixtures (MiniLM multilingüe).
REWORDED_FROM = 0.9
MEANING_CHANGE_BELOW = 0.75
# Un modificado tiene sus dos segmentos: el anterior y el nuevo.
PAIRED_SIDES = 2
# Palabras que deciden si algo se permite, se obliga o se limita. El embedder casi no distingue
# «podrá» de «deberá» (benchmark del ADR 024); si una de ellas aparece o desaparece, cambia el
# sentido aunque el resto de la frase sea igual.
OBLIGATION_WORDS = frozenset(
    {
        "podra", "podran", "puede", "pueden", "debera", "deberan", "debe", "deben",
        "obligado", "obligada", "obligados", "prohibido", "prohibida", "permitido", "permitida",
        "unicamente", "solo", "solamente", "exclusivamente",
    }
)  # fmt: skip
OBLIGATION_CONFIDENCE = 0.8
# La confianza de un cambio de sentido por similitud crece cuanto menos se parecen los textos.
SIMILARITY_CONFIDENCE_BASE = 0.5
SIMILARITY_CONFIDENCE_CAP = 0.85


class ChangeMeaningClassifier(Protocol):
    def classify(
        self, kind: ChangeKind, materialities: frozenset[Materiality], sides: Sequence[Segment]
    ) -> MeaningSuggestion | None:
        """La sugerencia, o None si no hay nada que sugerir (un movido sin cambios) o no se sabe."""
        ...


class EntailmentModel(Protocol):
    """Puerto listo para un clasificador NLI local (CLAUDE.md §15): ¿el texto B se deduce del A
    y viceversa? Todavía no tiene adaptador; cuando lo tenga reemplazará el umbral de similitud."""

    def entails(self, premise: str, hypothesis: str) -> float: ...


class RuleAndSimilarityMeaningClassifier:
    """Primero las reglas de materialidad; para el texto que solo cambia de palabras, la similitud
    de significado. Sin modelo de embeddings, ese último caso queda sin sugerencia."""

    def __init__(self, similarity: SegmentSimilarity | None) -> None:
        self._similarity = similarity

    def classify(
        self, kind: ChangeKind, materialities: frozenset[Materiality], sides: Sequence[Segment]
    ) -> MeaningSuggestion | None:
        if kind is ChangeKind.MOVED:
            return None
        if materialities & SUBSTANTIVE:
            return MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, SUBSTANTIVE_CONFIDENCE)
        if materialities and materialities <= COSMETIC:
            return MeaningSuggestion(ChangeMeaning.REWORDED, COSMETIC_CONFIDENCE)
        if kind is not ChangeKind.MODIFIED:
            return MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, WHOLE_SEGMENT_CONFIDENCE)
        return self._by_similarity(sides)

    def _by_similarity(self, sides: Sequence[Segment]) -> MeaningSuggestion | None:
        if len(sides) != PAIRED_SIDES:
            return None
        first, second = sides[0].text, sides[1].text
        if changes_obligation(first, second):
            return MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, OBLIGATION_CONFIDENCE)
        if self._similarity is None:
            return None
        ((score,),) = self._similarity.scores([first], [second])
        return _from_score(score)


def _words(text: str) -> set[str]:
    return set(fold_for_search(text).split())


def changes_obligation(first: str, second: str) -> bool:
    """Si una palabra de facultad, obligación o límite aparece o desaparece entre las versiones."""
    return bool((_words(first) ^ _words(second)) & OBLIGATION_WORDS)


def _from_score(score: float) -> MeaningSuggestion | None:
    if score >= REWORDED_FROM:
        return MeaningSuggestion(ChangeMeaning.REWORDED, round(score, 2))
    if score < MEANING_CHANGE_BELOW:
        gap = MEANING_CHANGE_BELOW - score
        confidence = min(SIMILARITY_CONFIDENCE_CAP, SIMILARITY_CONFIDENCE_BASE + gap)
        return MeaningSuggestion(ChangeMeaning.MEANING_CHANGE, round(confidence, 2))
    return None
