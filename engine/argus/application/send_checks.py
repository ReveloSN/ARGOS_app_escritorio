"""Lo que se verifica en un borrador antes de enviarlo: periodo, adjuntos y destinatarios."""

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from typing import Protocol

from argus.application.ports.drafts import DraftContent
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendFix, SendIssueKind


@dataclass(frozen=True)
class SendContext:
    """El borrador y lo que se sabe del expediente (nada, si no hay uno abierto)."""

    content: DraftContent
    case_documents: tuple[str, ...] = ()
    contacts: frozenset[str] = frozenset()


@dataclass(frozen=True)
class FoundIssue:
    """Un problema antes de numerarlo."""

    kind: SendIssueKind
    risk: RiskLevel
    part: DraftPart
    marked_text: str
    params: Mapping[str, str] = field(default_factory=dict)
    fix: SendFix | None = None


class SendCheck(Protocol):
    def find(self, context: SendContext) -> Iterable[FoundIssue]: ...


def name_words(name: str) -> str:
    """El nombre de un archivo como texto: «Informe_gestion_mayo_2026.pdf» → «Informe gestion mayo 2026»."""
    stem = name.rsplit(".", 1)[0]
    return re.sub(r"[_\-.]+", " ", stem)
