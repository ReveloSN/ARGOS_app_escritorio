import pytest

from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import DocumentFormat
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.domain.locations import LineLocation
from argus.infrastructure.readers.text_reader import PlainTextReader
from tests.infrastructure.conftest import fixture_source


@pytest.mark.parametrize("file_name", ["notas_utf8.txt", "notas_windows.txt"])
def test_lines_keep_their_number_and_accents(file_name: str) -> None:
    document = PlainTextReader().read(fixture_source(file_name))

    texts = {fragment.location: fragment.text for fragment in document.fragments}
    assert document.format is DocumentFormat.TEXT
    assert texts[LineLocation(1)] == "Notas de la remisión"
    assert LineLocation(2) not in texts
    assert texts[LineLocation(3)] == "Informe de gestión de junio 2026"


def test_utf8_byte_order_mark_is_not_part_of_the_text() -> None:
    source = DocumentSource("texto_pegado.txt", "﻿Contrato No. 4857".encode())

    document = PlainTextReader().read(source)

    assert document.fragments[0].text == "Contrato No. 4857"


def test_text_without_content_is_reported() -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        PlainTextReader().read(DocumentSource("vacio.txt", b"  \n\n "))

    assert raised.value.reason is UnreadableReason.NO_TEXT


@pytest.mark.parametrize("encoding", ["utf-16", "utf-16-be-with-bom", "utf-32"])
def test_unicode_text_saved_by_notepad_is_decoded(encoding: str) -> None:
    text = "Contrato No. 4857\nPago de $ 18.450.000"
    content = {
        "utf-16": text.encode("utf-16"),
        "utf-16-be-with-bom": b"\xfe\xff" + text.encode("utf-16-be"),
        "utf-32": text.encode("utf-32"),
    }[encoding]

    document = PlainTextReader().read(DocumentSource("notas.txt", content))

    assert [fragment.text for fragment in document.fragments] == [
        "Contrato No. 4857",
        "Pago de $ 18.450.000",
    ]


def test_a_binary_file_is_not_accepted_as_text() -> None:
    with pytest.raises(UnreadableDocumentError) as raised:
        PlainTextReader().read(DocumentSource("falso.txt", b"\x00\x01\x02\xff\xfe\x00data"))

    assert raised.value.reason is UnreadableReason.CORRUPTED
