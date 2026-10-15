from io import BytesIO

from pypdf import PasswordType, PdfReader
from pypdf.errors import PyPdfError

from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document, DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import PageLocation
from argus.infrastructure.readers.fragments import build_fragments, require_text_found

FIRST_PAGE = 1


class PdfDocumentReader:
    """Lee el texto de cada página con pypdf (ADR 003); un fragmento por página."""

    def read(self, source: DocumentSource) -> Document:
        try:
            pdf = self._open(source)
            texts = [
                (page.extract_text(), PageLocation(number))
                for number, page in enumerate(pdf.pages, start=FIRST_PAGE)
            ]
        except PyPdfError:
            raise UnreadableDocumentError(source.name, UnreadableReason.CORRUPTED) from None
        fragments = require_text_found(source.name, build_fragments(texts))
        return Document(source.name, DocumentFormat.PDF, fragments)

    def _open(self, source: DocumentSource) -> PdfReader:
        pdf = PdfReader(BytesIO(source.content))
        if pdf.is_encrypted and not _opens_without_password(pdf):
            raise UnreadableDocumentError(source.name, UnreadableReason.ENCRYPTED)
        return pdf


def _opens_without_password(pdf: PdfReader) -> bool:
    # Muchos PDF solo tienen contraseña de propietario (impide editar, no leer).
    try:
        return pdf.decrypt("") != PasswordType.NOT_DECRYPTED
    except PyPdfError:
        return False
