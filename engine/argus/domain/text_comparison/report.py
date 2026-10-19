"""Resultado de una comparación: los cambios de cada par de documentos, con su origen."""

from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from uuid import uuid4

from argus.domain.read_outcome import ReadSummary
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind
from argus.domain.text_comparison.modes import ComparisonModeName
from argus.domain.validation import require_text, require_time_zone


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
    first_document: str
    second_document: str
    changes: tuple[Change, ...]

    @property
    def summary(self) -> ChangeSummary:
        return ChangeSummary.of(self.changes)


@dataclass(frozen=True)
class ComparisonContent:
    """Lo que produce una comparación antes de guardarse con su identificador y fecha."""

    name: str
    mode: ComparisonModeName
    documents: tuple[ReadSummary, ...]
    pairs: tuple[PairComparison, ...]

    def __post_init__(self) -> None:
        require_text("El nombre de la comparación", self.name)


@dataclass(frozen=True)
class ComparisonReport:
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
        return ChangeSummary.of(
            tuple(change for pair in self.content.pairs for change in pair.changes)
        )
