from dataclasses import dataclass
from typing import Protocol

from argus.domain.document import Document


@dataclass(frozen=True)
class DocumentSource:
    """Contenido de un archivo tal como llega al motor: nombre y bytes, sin rutas del sistema.

    Así los adjuntos de un correo se leen igual que un archivo del disco.
    """

    name: str
    content: bytes


class DocumentReader(Protocol):
    def read(self, source: DocumentSource) -> Document:
        """Lee el documento o lanza UnreadableDocumentError con el motivo."""
        ...
