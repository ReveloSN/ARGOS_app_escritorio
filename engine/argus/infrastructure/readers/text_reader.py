from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document, DocumentFormat
from argus.domain.locations import LineLocation
from argus.infrastructure.readers.fragments import build_fragments, require_text_found

PREFERRED_ENCODING = "utf-8-sig"
# Codificación habitual de los .txt guardados con programas antiguos de Windows en español.
LEGACY_ENCODING = "cp1252"
FIRST_LINE = 1


def decode_text(content: bytes) -> str:
    try:
        return content.decode(PREFERRED_ENCODING)
    except UnicodeDecodeError:
        return content.decode(LEGACY_ENCODING, errors="replace")


class PlainTextReader:
    """Lee archivos de texto y texto pegado; un fragmento por línea con contenido."""

    def read(self, source: DocumentSource) -> Document:
        lines = decode_text(source.content).splitlines()
        texts = ((line, LineLocation(number)) for number, line in enumerate(lines, FIRST_LINE))
        fragments = require_text_found(source.name, build_fragments(texts))
        return Document(source.name, DocumentFormat.TEXT, fragments)
