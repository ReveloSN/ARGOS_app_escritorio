from dataclasses import dataclass
from typing import Protocol

from argus.application.text_comparison.change_explanation import ExplanationSubject


@dataclass(frozen=True)
class ExplanationPrompt:
    """Lo único que sale del equipo: el idioma, qué se explica, su tipo y los fragmentos."""

    locale: str
    subject: ExplanationSubject
    kind: str
    fragments: tuple[str, ...]


class ExplanationProvider(Protocol):
    """Un proveedor de modelo de lenguaje (Anthropic, DeepSeek…), detrás del mismo puerto."""

    def explain(self, api_key: str, prompt: ExplanationPrompt) -> str:
        """El texto de la explicación; ExplanationProviderError si no se pudo obtener."""
        ...
