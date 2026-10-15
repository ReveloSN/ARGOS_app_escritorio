import pytest

from argus.application.document_reader_factory import DocumentReaderFactory
from argus.application.ports.document_reader import DocumentReader, DocumentSource
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import UnsupportedFormatError
from argus.domain.locations import LineLocation


class FixedTextReader:
    """Lector de prueba: devuelve siempre el mismo texto para el formato que simula."""

    def __init__(self, document_format: DocumentFormat) -> None:
        self._format = document_format

    def read(self, source: DocumentSource) -> Document:
        fragment = TextFragment(f"leído como {self._format}", LineLocation(1))
        return Document(source.name, self._format, (fragment,))


def factory_for(*formats: DocumentFormat) -> DocumentReaderFactory:
    readers: dict[DocumentFormat, DocumentReader] = {
        document_format: FixedTextReader(document_format) for document_format in formats
    }
    return DocumentReaderFactory(readers)


def test_factory_returns_the_reader_registered_for_the_extension() -> None:
    factory = factory_for(DocumentFormat.PDF, DocumentFormat.TEXT)

    document = factory.reader_for("Contrato_4857_v3.PDF").read(
        DocumentSource("Contrato_4857_v3.PDF", b"")
    )

    assert document.format is DocumentFormat.PDF


def test_known_extension_without_reader_is_unsupported() -> None:
    factory = factory_for(DocumentFormat.PDF)

    with pytest.raises(UnsupportedFormatError):
        factory.reader_for("Anexo_2_tarifas.xlsx")


def test_unknown_extension_is_unsupported() -> None:
    with pytest.raises(UnsupportedFormatError):
        factory_for(DocumentFormat.PDF).reader_for("Acta_comite_oct.pages")


def test_new_formats_are_added_without_modifying_the_original_factory() -> None:
    original = factory_for(DocumentFormat.PDF)

    extended = original.with_reader(DocumentFormat.EML, FixedTextReader(DocumentFormat.EML))

    assert extended.supported_formats == frozenset({DocumentFormat.PDF, DocumentFormat.EML})
    assert original.supported_formats == frozenset({DocumentFormat.PDF})


def test_factory_does_not_change_if_the_source_mapping_changes() -> None:
    readers: dict[DocumentFormat, DocumentReader] = {
        DocumentFormat.PDF: FixedTextReader(DocumentFormat.PDF)
    }
    factory = DocumentReaderFactory(readers)

    readers[DocumentFormat.TEXT] = FixedTextReader(DocumentFormat.TEXT)

    assert factory.supported_formats == frozenset({DocumentFormat.PDF})
