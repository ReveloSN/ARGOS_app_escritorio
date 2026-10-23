"""Revisar un borrador de correo y sus adjuntos antes de enviarlo (mockup «Revisar antes de enviar»)."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum

from argus.domain.risk import RiskLevel
from argus.domain.validation import require_positive, require_text, require_time_zone


class DraftPart(StrEnum):
    """Dónde se marca el problema en el borrador."""

    BODY = "body"
    TO = "to"
    CC = "cc"


class SendIssueKind(StrEnum):
    # «Le comparto el informe de junio» y el adjunto es el de mayo.
    PERIOD_MISMATCH = "period_mismatch"
    # «Adjunto también la póliza» y ningún adjunto es una póliza.
    MISSING_ATTACHMENT = "missing_attachment"
    # Un destinatario que no aparece entre los contactos del expediente.
    FOREIGN_RECIPIENT = "foreign_recipient"


class SendFixKind(StrEnum):
    REPLACE_ATTACHMENT = "replace_attachment"
    ADD_ATTACHMENT = "add_attachment"
    REMOVE_RECIPIENT = "remove_recipient"


@dataclass(frozen=True)
class SendFix:
    """La corrección que ARGUS puede aplicar a la copia del borrador.

    `target` es el adjunto o el destinatario que cambia; `replacement`, el documento del
    expediente que entra en su lugar (vacío si solo se quita algo).
    """

    kind: SendFixKind
    target: str = ""
    replacement: str = ""


@dataclass(frozen=True)
class DraftAttachment:
    name: str
    size: int

    def __post_init__(self) -> None:
        require_text("El nombre del adjunto", self.name)


@dataclass(frozen=True)
class EmailDraft:
    """El borrador tal como lo ve el usuario: destinatarios, asunto, cuerpo y adjuntos."""

    file_name: str
    subject: str
    to: tuple[str, ...]
    cc: tuple[str, ...]
    body: str
    attachments: tuple[DraftAttachment, ...]

    def __post_init__(self) -> None:
        require_text("El nombre del borrador", self.file_name)

    @property
    def recipients(self) -> tuple[str, ...]:
        return (*self.to, *self.cc)


@dataclass(frozen=True)
class SendIssue:
    """Un problema del borrador: qué texto marcar, sus datos para el mensaje y su corrección."""

    number: int
    kind: SendIssueKind
    risk: RiskLevel
    part: DraftPart
    marked_text: str
    params: Mapping[str, str] = field(default_factory=dict)
    fix: SendFix | None = None

    def __post_init__(self) -> None:
        require_positive("El número del problema", self.number)
        require_text("El texto marcado", self.marked_text)


@dataclass(frozen=True)
class SendReview:
    """Un borrador revisado; `session_id` es el expediente contra el que se comparó, si había."""

    id: str
    session_id: str | None
    created_at: datetime
    draft: EmailDraft
    issues: tuple[SendIssue, ...]

    def __post_init__(self) -> None:
        require_time_zone("La fecha de la revisión", self.created_at)

    def issue(self, number: int) -> SendIssue | None:
        return next((issue for issue in self.issues if issue.number == number), None)
