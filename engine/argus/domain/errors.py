from enum import StrEnum


class ArgusDomainError(Exception):
    """Base de los errores del dominio de ARGUS."""


class InvalidValueError(ArgusDomainError):
    """Un value object o entidad recibió un valor que viola sus invariantes."""


class UnreadableReason(StrEnum):
    """Por qué no se pudo leer un documento; la interfaz lo traduce a un mensaje de 3 partes."""

    NO_TEXT = "no_text"
    ENCRYPTED = "encrypted"
    CORRUPTED = "corrupted"
    TOO_LARGE = "too_large"
    NOT_FOUND = "not_found"
    UNSUPPORTED_FORMAT = "unsupported_format"


class UnreadableDocumentError(ArgusDomainError):
    def __init__(self, document_name: str, reason: UnreadableReason) -> None:
        super().__init__(f"No se pudo leer «{document_name}» ({reason}).")
        self.document_name = document_name
        self.reason = reason


class UnsupportedFormatError(UnreadableDocumentError):
    def __init__(self, document_name: str) -> None:
        super().__init__(document_name, UnreadableReason.UNSUPPORTED_FORMAT)
