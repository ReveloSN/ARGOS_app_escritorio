from dataclasses import dataclass

from argus.domain.document import Document
from argus.domain.errors import InvalidValueError, UnreadableReason


@dataclass(frozen=True)
class ReadSummary:
    """Cómo se leyó un archivo, sin su texto: lo que se guarda y se muestra en «Archivos»."""

    name: str
    reason: UnreadableReason | None
    fragment_count: int

    @property
    def is_read(self) -> bool:
        return self.reason is None


@dataclass(frozen=True)
class DocumentReadOutcome:
    """Cómo se leyó cada archivo: el documento leído o el motivo por el que no se pudo leer."""

    name: str
    document: Document | None
    reason: UnreadableReason | None

    def __post_init__(self) -> None:
        if (self.document is None) == (self.reason is None):
            raise InvalidValueError("Un archivo se lee o tiene un motivo por el que no se leyó.")

    @property
    def is_read(self) -> bool:
        return self.document is not None

    @property
    def fragment_count(self) -> int:
        return 0 if self.document is None else len(tuple(self.document.named_fragments()))

    @property
    def summary(self) -> ReadSummary:
        return ReadSummary(self.name, self.reason, self.fragment_count)
