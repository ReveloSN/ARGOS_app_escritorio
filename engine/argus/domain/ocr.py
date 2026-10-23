from dataclasses import dataclass
from enum import StrEnum

from argus.domain.errors import InvalidValueError


class ReadMethod(StrEnum):
    """Cómo se obtuvo el texto de un archivo; se muestra junto a «Leído»."""

    TEXT = "text"
    LOCAL_OCR = "local_ocr"
    CLOUD_OCR = "cloud_ocr"


class OcrProvider(StrEnum):
    """Quién hace el OCR que el usuario pidió: Tesseract en el equipo o Document AI."""

    LOCAL = "local"
    CLOUD = "cloud"


@dataclass(frozen=True)
class PageCount:
    """Avance del OCR: página que se terminó de leer y total del documento."""

    done: int
    total: int

    def __post_init__(self) -> None:
        if not 0 <= self.done <= self.total:
            raise InvalidValueError("Las páginas leídas no pueden pasar del total.")
