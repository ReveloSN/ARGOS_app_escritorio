from dataclasses import dataclass
from enum import StrEnum
from pathlib import PurePath

from argus.domain.errors import UnreadableReason, UnsupportedFormatError
from argus.domain.locations import SourceLocation
from argus.domain.validation import require_text


class DocumentFormat(StrEnum):
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"
    EML = "eml"
    TEXT = "text"

    @classmethod
    def from_file_name(cls, file_name: str) -> "DocumentFormat":
        extension = PurePath(file_name).suffix.lower()
        try:
            return _FORMAT_BY_EXTENSION[extension]
        except KeyError:
            raise UnsupportedFormatError(file_name) from None


_FORMAT_BY_EXTENSION: dict[str, DocumentFormat] = {
    ".pdf": DocumentFormat.PDF,
    ".docx": DocumentFormat.DOCX,
    ".xlsx": DocumentFormat.XLSX,
    ".eml": DocumentFormat.EML,
    ".txt": DocumentFormat.TEXT,
}


@dataclass(frozen=True)
class TextFragment:
    text: str
    location: SourceLocation

    def __post_init__(self) -> None:
        require_text("El fragmento", self.text)


@dataclass(frozen=True)
class AttachmentFailure:
    name: str
    reason: UnreadableReason


@dataclass(frozen=True)
class Document:
    """Texto leído de un archivo, fragmentado según dónde aparece cada parte."""

    name: str
    format: DocumentFormat
    fragments: tuple[TextFragment, ...]
    attachments: tuple["Document", ...] = ()
    attachment_failures: tuple[AttachmentFailure, ...] = ()

    def __post_init__(self) -> None:
        require_text("El nombre del documento", self.name)
