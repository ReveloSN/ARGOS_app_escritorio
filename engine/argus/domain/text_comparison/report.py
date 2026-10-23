"""Resultado de una comparación: los cambios de cada par de documentos, con su origen."""

from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from itertools import count
from uuid import uuid4

from argus.domain.alert import Alert, NumberedAlert
from argus.domain.read_outcome import ReadSummary
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.text_comparison.segment import Segment
from argus.domain.validation import require_text, require_time_zone

FIRST_ITEM_NUMBER = 1
# Por debajo de esta proporción de segmentos en común, dos «versiones» parecen documentos
# distintos (mockup de estados: «Coinciden menos del 20 % del texto»).
UNRELATED_MATCH_RATIO = 0.2
FULL_MATCH = 1.0


@dataclass(frozen=True)
class ChangeSummary:
    """Cuántos cambios hay de cada tipo y de cada nivel de riesgo (resumen de la pantalla)."""

    by_kind: dict[ChangeKind, int]
    by_risk: dict[RiskLevel, int]

    @classmethod
    def of(cls, changes: tuple[Change, ...]) -> "ChangeSummary":
        kinds = Counter(change.kind for change in changes)
        risks = Counter(change.risk for change in changes)
        return cls(
            {kind: kinds[kind] for kind in ChangeKind},
            {risk: risks[risk] for risk in RiskLevel},
        )


@dataclass(frozen=True)
class PairComparison:
    """Los cambios de un par y el texto completo de cada lado, para mostrarlos en contexto."""

    first_document: str
    second_document: str
    changes: tuple[Change, ...]
    first_segments: tuple[Segment, ...] = ()
    second_segments: tuple[Segment, ...] = ()

    @property
    def summary(self) -> ChangeSummary:
        return ChangeSummary.of(self.changes)

    @property
    def match_ratio(self) -> float:
        """Proporción de segmentos que tienen pareja en el otro documento (de 0 a 1)."""
        longest = max(len(self.first_segments), len(self.second_segments))
        if not longest:
            return FULL_MATCH
        removed = sum(1 for change in self.changes if change.kind is ChangeKind.REMOVED)
        return (len(self.first_segments) - removed) / longest

    @property
    def seems_unrelated(self) -> bool:
        return self.match_ratio < UNRELATED_MATCH_RATIO


@dataclass(frozen=True)
class ComparisonContent:
    """Lo que produce una comparación antes de guardarse con su identificador y fecha.

    `inconsistencies` son las alertas de la revisión por entidades de los mismos archivos
    (pestaña «Buscar inconsistencias»).
    """

    name: str
    mode: ComparisonModeName
    documents: tuple[ReadSummary, ...]
    pairs: tuple[PairComparison, ...]
    inconsistencies: tuple[Alert, ...] = ()

    def __post_init__(self) -> None:
        require_text("El nombre de la comparación", self.name)


@dataclass(frozen=True)
class NumberedChange:
    number: int
    pair_index: int
    change: Change


@dataclass(frozen=True)
class ComparisonReport:
    """Una comparación guardada. Cambios e inconsistencias comparten una numeración (primero
    los cambios, par por par), así cada decisión se refiere a un solo elemento."""

    id: str
    created_at: datetime
    content: ComparisonContent

    def __post_init__(self) -> None:
        require_time_zone("La fecha de la comparación", self.created_at)

    @classmethod
    def start(cls, content: ComparisonContent, created_at: datetime) -> "ComparisonReport":
        return cls(uuid4().hex, created_at, content)

    @property
    def summary(self) -> ChangeSummary:
        return ChangeSummary.of(tuple(item.change for item in self.numbered_changes))

    @property
    def numbered_changes(self) -> tuple[NumberedChange, ...]:
        numbers = count(FIRST_ITEM_NUMBER)
        return tuple(
            NumberedChange(next(numbers), index, change)
            for index, pair in enumerate(self.content.pairs)
            for change in pair.changes
        )

    @property
    def numbered_inconsistencies(self) -> tuple[NumberedAlert, ...]:
        first = FIRST_ITEM_NUMBER + len(self.numbered_changes)
        return tuple(
            NumberedAlert(number, alert)
            for number, alert in enumerate(self.content.inconsistencies, start=first)
        )

    def has_item(self, number: int) -> bool:
        total = len(self.numbered_changes) + len(self.content.inconsistencies)
        return FIRST_ITEM_NUMBER <= number < FIRST_ITEM_NUMBER + total
