from dataclasses import dataclass
from typing import Protocol

from argus.domain.document import Document
from argus.domain.ocr import OcrProvider


@dataclass(frozen=True)
class DocumentSource:
    """Contenido de un archivo tal como llega al motor: nombre y bytes, sin rutas del sistema.

    Así los adjuntos de un correo se leen igual que un archivo del disco.
    """

    name: str
    content: bytes
    # El usuario pidió leer este archivo con OCR («Activar OCR») y con qué proveedor.
    ocr: OcrProvider | None = None


class DocumentReader(Protocol):
    def read(self, source: DocumentSource) -> Document:
        """Lee el documento o lanza UnreadableDocumentError con el motivo."""
        ...
