from collections.abc import Iterator
from dataclasses import dataclass

from argus.application.text_comparison.change_facts import ChangeFactsReader
from argus.application.text_comparison.meaning_classifier import ChangeMeaningClassifier
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import RuleChainClassifier
from argus.domain.text_comparison.alignment import Alignment
from argus.domain.text_comparison.change import Change, ChangeKind
from argus.domain.text_comparison.materiality import ChangeFacts
from argus.domain.text_comparison.segment import Segment
from argus.domain.text_comparison.text_diff import WordEdit, diff_words

# Las reglas de materialidad cubren todos los tipos de cambio; esto solo es el respaldo.
FALLBACK_RISK = RiskLevel.LOW


@dataclass(frozen=True)
class _ChangeDraft:
    kind: ChangeKind
    first: Segment | None
    second: Segment | None
    edits: tuple[WordEdit, ...] = ()
    is_moved: bool = False


class ChangeDetector:
    """Convierte una alineación en cambios: agregados, eliminados, modificados y movidos.

    Cada cambio lleva el diff por palabra y por carácter y el riesgo que deciden las reglas de
    materialidad.
    """

    def __init__(
        self,
        facts: ChangeFactsReader,
        classifier: RuleChainClassifier[ChangeFacts],
        meaning: ChangeMeaningClassifier | None = None,
    ) -> None:
        self._facts = facts
        self._classifier = classifier
        self._meaning = meaning

    def detect(self, alignment: Alignment) -> tuple[Change, ...]:
        drafts = [
            *_pair_drafts(alignment),
            *(_ChangeDraft(ChangeKind.REMOVED, segment, None) for segment in alignment.removed),
            *(_ChangeDraft(ChangeKind.ADDED, None, segment) for segment in alignment.added),
        ]
        changes = (self._classified(draft) for draft in drafts)
        return tuple(sorted(changes, key=_reading_order))

    def _classified(self, draft: _ChangeDraft) -> Change:
        facts = self._facts.facts_of(draft.kind, draft.first, draft.second)
        risk = self._classifier.classify(facts) or FALLBACK_RISK
        materialities = tuple(sorted(facts.materialities))
        sides = [side for side in (draft.first, draft.second) if side is not None]
        meaning = (
            None
            if self._meaning is None
            else self._meaning.classify(draft.kind, frozenset(materialities), sides)
        )
        return Change(
            draft.kind,
            risk,
            materialities,
            draft.first,
            draft.second,
            draft.edits,
            draft.is_moved,
            meaning,
        )


def _pair_drafts(alignment: Alignment) -> Iterator[_ChangeDraft]:
    for pair in alignment.pairs:
        is_moved = alignment.is_moved(pair)
        if not pair.is_exact:
            edits = diff_words(pair.first.text, pair.second.text)
            yield _ChangeDraft(ChangeKind.MODIFIED, pair.first, pair.second, edits, is_moved)
        elif is_moved:
            yield _ChangeDraft(ChangeKind.MOVED, pair.first, pair.second, is_moved=True)


def _reading_order(change: Change) -> tuple[int, int]:
    """Orden aproximado de lectura: por el documento nuevo y, lo eliminado, por el anterior.

    Lo eliminado va antes que lo que ocupa su misma posición en el documento nuevo.
    """
    if change.second is not None:
        return (change.second.position, 0)
    return (change.first.position if change.first else 0, -1)
