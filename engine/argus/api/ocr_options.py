"""«Activar OCR» en una revisión: qué archivos, con qué proveedor y qué lectura reemplaza."""

from dataclasses import dataclass, replace
from typing import Annotated

from fastapi import Form

from argus.application.ports.document_reader import DocumentSource
from argus.domain.ocr import OcrProvider


@dataclass(frozen=True)
class OcrOptions:
    file_names: frozenset[str]
    provider: OcrProvider
    replaces: str | None

    def apply(self, sources: tuple[DocumentSource, ...]) -> tuple[DocumentSource, ...]:
        return tuple(
            replace(source, ocr=self.provider) if source.name in self.file_names else source
            for source in sources
        )


def ocr_options(
    ocr: Annotated[list[str] | None, Form()] = None,
    ocr_provider: Annotated[OcrProvider, Form(alias="ocrProvider")] = OcrProvider.LOCAL,
    replaces: Annotated[str | None, Form()] = None,
) -> OcrOptions:
    """Por defecto, nada se lee con OCR: solo los archivos que el usuario pidió."""
    return OcrOptions(frozenset(ocr or ()), ocr_provider, replaces or None)
