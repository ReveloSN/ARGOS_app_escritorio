from argus.api.composition import build_document_reader_factory
from argus.domain.document import DocumentFormat
from tests.infrastructure.conftest import fixture_source


def test_factory_supports_every_document_format() -> None:
    assert build_document_reader_factory().supported_formats == frozenset(DocumentFormat)


def test_email_attachments_are_read_with_the_registered_readers() -> None:
    source = fixture_source("Correo_remision_cliente.eml")

    document = build_document_reader_factory().reader_for(source.name).read(source)

    assert {attachment.format for attachment in document.attachments} == {
        DocumentFormat.XLSX,
        DocumentFormat.TEXT,
    }
