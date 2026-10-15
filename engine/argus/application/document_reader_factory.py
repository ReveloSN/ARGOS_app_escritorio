from collections.abc import Mapping
from types import MappingProxyType

from argus.application.ports.document_reader import DocumentReader
from argus.domain.document import DocumentFormat
from argus.domain.errors import UnsupportedFormatError


class DocumentReaderFactory:
    """Factory: elige el lector según la extensión del archivo.

    Los lectores se registran desde la raíz de composición; un formato nuevo se agrega con
    `with_reader`, sin modificar esta clase (abierta a extensión, cerrada a modificación).
    """

    def __init__(self, readers: Mapping[DocumentFormat, DocumentReader]) -> None:
        self._readers: Mapping[DocumentFormat, DocumentReader] = MappingProxyType(dict(readers))

    @property
    def supported_formats(self) -> frozenset[DocumentFormat]:
        return frozenset(self._readers)

    def reader_for(self, file_name: str) -> DocumentReader:
        document_format = DocumentFormat.from_file_name(file_name)
        reader = self._readers.get(document_format)
        if reader is None:
            raise UnsupportedFormatError(file_name)
        return reader

    def with_reader(
        self, document_format: DocumentFormat, reader: DocumentReader
    ) -> "DocumentReaderFactory":
        return DocumentReaderFactory({**self._readers, document_format: reader})
