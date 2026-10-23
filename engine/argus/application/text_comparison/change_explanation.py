"""«Explicar este cambio» (plan v0.1, Fase 6; ADR 024): plantillas locales y, si el usuario lo
activa, un modelo de lenguaje que solo recibe los dos fragmentos alineados del cambio."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol

from argus.application.alert_explanation import ExplanationPart
from argus.application.ports.repositories import ComparisonRepository
from argus.domain.errors import ComparisonItemNotFoundError
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.meaning import ChangeMeaning


class ExplanationSource(StrEnum):
    TEMPLATE = "template"
    AI = "ai"


class FallbackReason(StrEnum):
    """Por qué se usó la plantilla aunque la IA estaba activada (mensaje de 3 partes)."""

    NO_KEY = "no_key"
    KEYCHAIN_UNAVAILABLE = "keychain_unavailable"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    INVALID_KEY = "invalid_key"
    REFUSED = "refused"


@dataclass(frozen=True)
class ChangeExplanationRequest:
    change: Change
    # Idioma de la interfaz («es», «en»): el modelo responde en ese idioma.
    locale: str


@dataclass(frozen=True)
class ChangeExplanation:
    """La explicación: frases de plantilla (claves de i18n) o el texto que redactó la IA."""

    source: ExplanationSource
    parts: tuple[ExplanationPart, ...] = ()
    text: str = ""
    fallback_reason: FallbackReason | None = None


class ChangeExplainer(Protocol):
    def explain(self, request: ChangeExplanationRequest) -> ChangeExplanation: ...


# El primer tema que aplique decide la frase: lo sustantivo antes que la forma.
TOPIC_ORDER: tuple[Materiality, ...] = (
    Materiality.NEGATION,
    Materiality.AMOUNT,
    Materiality.DATE,
    Materiality.NUMBER,
    Materiality.PARTY,
    Materiality.CASE,
    Materiality.PUNCTUATION,
    Materiality.FORMAT,
)
KIND_TOPICS = {
    ChangeKind.ADDED: "added",
    ChangeKind.REMOVED: "removed",
    ChangeKind.MOVED: "moved",
}
MEANING_TOPICS = {
    ChangeMeaning.REWORDED: "reworded",
    ChangeMeaning.MEANING_CHANGE: "meaning_change",
}
DEFAULT_TOPIC = "wording"


def explanation_topic(change: Change) -> str:
    """De qué trata el cambio, en el orden de TOPIC_ORDER; si no, su tipo o su sentido."""
    topic = next((item for item in TOPIC_ORDER if item in change.materialities), None)
    if topic is not None:
        return str(topic)
    if change.kind in KIND_TOPICS:
        return KIND_TOPICS[change.kind]
    return MEANING_TOPICS[change.meaning.meaning] if change.meaning else DEFAULT_TOPIC


class TemplateChangeExplainer:
    """Explicación determinista: funciona sin internet ni claves (CLAUDE.md §8). El texto vive
    en los archivos de idioma (`changeExplanation.*`)."""

    def explain(self, request: ChangeExplanationRequest) -> ChangeExplanation:
        part = ExplanationPart(f"changeExplanation.{explanation_topic(request.change)}")
        return ChangeExplanation(ExplanationSource.TEMPLATE, (part,))


class ExplainChange:
    """Caso de uso: «Explicar este cambio» de una comparación guardada, en el idioma pedido."""

    def __init__(self, comparisons: ComparisonRepository, explainer: ChangeExplainer) -> None:
        self._comparisons = comparisons
        self._explainer = explainer

    def execute(self, comparison_id: str, number: int, locale: str) -> ChangeExplanation:
        report = self._comparisons.get(comparison_id)
        change = next(
            (item.change for item in report.numbered_changes if item.number == number), None
        )
        if change is None:
            raise ComparisonItemNotFoundError(comparison_id, number)
        return self._explainer.explain(ChangeExplanationRequest(change, locale))
