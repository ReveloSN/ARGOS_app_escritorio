import codecs

from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document, DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import LineLocation
from argus.infrastructure.readers.fragments import build_fragments, require_text_found

PREFERRED_ENCODING = "utf-8-sig"
# Codificación habitual de los .txt guardados con programas antiguos de Windows en español.
LEGACY_ENCODING = "cp1252"
# El Bloc de notas guarda como «Unicode» en UTF-16; la marca de orden de bytes lo delata.
# UTF-32 va primero porque su marca de little endian empieza igual que la de UTF-16.
WIDE_ENCODINGS = (
    (codecs.BOM_UTF32_LE, "utf-32"),
    (codecs.BOM_UTF32_BE, "utf-32"),
    (codecs.BOM_UTF16_LE, "utf-16"),
    (codecs.BOM_UTF16_BE, "utf-16"),
)
# Un carácter nulo nunca aparece en texto: es la huella de un archivo binario.
NULL_CHARACTER = "\x00"
FIRST_LINE = 1


def decode_text(content: bytes) -> str:
    for byte_order_mark, encoding in WIDE_ENCODINGS:
        if content.startswith(byte_order_mark):
            return content.decode(encoding, errors="replace")
    try:
        return content.decode(PREFERRED_ENCODING)
    except UnicodeDecodeError:
        return content.decode(LEGACY_ENCODING, errors="replace")


class PlainTextReader:
    """Lee archivos de texto y texto pegado; un fragmento por línea con contenido."""

    def read(self, source: DocumentSource) -> Document:
        text = decode_text(source.content)
        if NULL_CHARACTER in text:
            raise UnreadableDocumentError(source.name, UnreadableReason.CORRUPTED)
        lines = text.splitlines()
        texts = ((line, LineLocation(number)) for number, line in enumerate(lines, FIRST_LINE))
        fragments = require_text_found(source.name, build_fragments(texts))
        return Document(source.name, DocumentFormat.TEXT, fragments)
