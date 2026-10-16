"""Explicación de cada alerta (CLAUDE.md §8, capa 6), detrás del puerto AlertExplainer.

El motor decide qué decir y con qué datos; el texto vive en los archivos de idioma de la
interfaz (`explanation.*`), así la explicación sale en el idioma elegido. Un proveedor de IA
generativa podría reemplazar las plantillas sin tocar la interfaz.
"""

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol

from argus.application.feedback_confidence import DecisionStatistics
from argus.domain.alert import Alert
from argus.domain.comparison.damerau_levenshtein import differing_positions
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.feedback import NO_FEEDBACK, FeedbackCounts

SWAPPED_CHARACTERS = 2
# Un valor que aparece al menos dos veces frente a otro que aparece una sola.
MIN_REPEATED = 2

type ExplanationParams = Mapping[str, str | int]


@dataclass(frozen=True)
class ExplanationPart:
    """Una frase de la explicación: su clave de texto, sus datos y, si es plural, la cantidad."""

    key: str
    params: ExplanationParams = field(default_factory=dict)
    count: int | None = None


type Explanation = tuple[ExplanationPart, ...]


class AlertExplainer(Protocol):
    def explain(self, alerts: Sequence[Alert]) -> tuple[Explanation, ...]:
        """La explicación de cada alerta, en el mismo orden."""
        ...


def _first_document(alert: Alert, side: str) -> str:
    entities = alert.first.entities if side == "first" else alert.second.entities
    return entities[0].occurrence.document_name


def lead(alert: Alert) -> ExplanationPart:
    """Qué documentos citan valores distintos y de qué tipo de dato."""
    params = {"first": _first_document(alert, "first"), "second": _first_document(alert, "second")}
    return ExplanationPart(f"explanation.lead.{alert.entity_type}", params)


def _changed_characters(alert: Alert) -> list[str]:
    first = alert.first.representative.raw_value
    second = alert.second.representative.raw_value
    return [first[position - 1] for position in differing_positions(first, second)]


def _character_cause(alert: Alert) -> ExplanationPart:
    changed = _changed_characters(alert)
    if alert.difference.kind is DifferenceKind.TRANSPOSITION and len(changed) == SWAPPED_CHARACTERS:
        return ExplanationPart(
            "explanation.cause.transposition", {"a": changed[0], "b": changed[1]}
        )
    return ExplanationPart("explanation.cause.character_change", count=max(len(changed), 1))


def _referenced_cause(alert: Alert) -> ExplanationPart:
    params = {
        "mentioned": alert.first.representative.raw_value,
        "attached": alert.second.representative.raw_value,
        "attachment": _first_document(alert, "second"),
    }
    return ExplanationPart("explanation.cause.referenced_period", params)


CAUSE_BUILDERS: Mapping[DifferenceKind, Callable[[Alert], ExplanationPart]] = {
    DifferenceKind.TRANSPOSITION: _character_cause,
    DifferenceKind.CHARACTER_CHANGE: _character_cause,
    DifferenceKind.REFERENCED_PERIOD: _referenced_cause,
}


def cause(alert: Alert) -> ExplanationPart:
    """Por qué puede ser un error, según cómo difieren los valores."""
    builder = CAUSE_BUILDERS.get(alert.difference.kind)
    return (
        builder(alert) if builder else ExplanationPart(f"explanation.cause.{alert.difference.kind}")
    )


def majority(alert: Alert) -> ExplanationPart | None:
    """Si un valor se repite y el otro aparece una vez, el error suele estar en el segundo.

    No aplica al periodo citado en un correo: sus repeticiones son el asunto y el cuerpo del
    mismo mensaje, no documentos que coinciden.
    """
    if alert.difference.kind is DifferenceKind.REFERENCED_PERIOD:
        return None
    if alert.first.occurrence_count < MIN_REPEATED or alert.second.occurrence_count != 1:
        return None
    return ExplanationPart("explanation.majority", count=alert.first.occurrence_count)


class TemplateAlertExplainer:
    """Explicación determinista con plantillas: funciona sin internet ni claves (CLAUDE.md §8)."""

    def __init__(self, statistics: DecisionStatistics) -> None:
        self._statistics = statistics

    def explain(self, alerts: Sequence[Alert]) -> tuple[Explanation, ...]:
        counts = self._statistics.counts_by_kind()
        return tuple(_explain(alert, counts) for alert in alerts)


def _explain(alert: Alert, counts: FeedbackCounts) -> Explanation:
    parts = [lead(alert), cause(alert), majority(alert), feedback(alert, counts)]
    return tuple(part for part in parts if part is not None)


def feedback(alert: Alert, counts: FeedbackCounts) -> ExplanationPart | None:
    """Cómo decidió antes el usuario alertas parecidas (capa 5)."""
    found = counts.get((alert.entity_type, alert.difference.kind), NO_FEEDBACK)
    if found.total == 0:
        return None
    return ExplanationPart("explanation.feedback", {"errors": found.real_errors}, count=found.total)
