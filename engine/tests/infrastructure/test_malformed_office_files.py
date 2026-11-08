import zipfile
from io import BytesIO

import pytest

from argus.application.ports.document_reader import DocumentSource
from argus.domain.errors import UnreadableDocumentError, UnreadableReason
from argus.infrastructure.readers.docx_reader import DocxDocumentReader
from argus.infrastructure.readers.html_text import html_to_text
from argus.infrastructure.readers.xlsx_reader import XlsxDocumentReader
from tests.infrastructure.conftest import fixture_source


def _with_broken_part(file_name: str, part_suffix: str) -> DocumentSource:
    """El mismo archivo de ejemplo, con el XML de una parte interna cortado a la mitad: el ZIP
    sigue siendo válido, así que solo falla al leer esa parte."""
    original = fixture_source(file_name)
    with zipfile.ZipFile(BytesIO(original.content)) as source:
        parts = [(item, source.read(item.filename)) for item in source.infolist()]
    rewritten = BytesIO()
    with zipfile.ZipFile(rewritten, "w") as target:
        for item, data in parts:
            broken = item.filename.endswith(part_suffix)
            target.writestr(item, data[: len(data) // 2] if broken else data)
    return DocumentSource(original.name, rewritten.getvalue())


def test_a_docx_with_malformed_internal_xml_is_unreadable_not_a_crash() -> None:
    """(Regresión) Antes se escapaba un XMLSyntaxError en vez de marcarse ilegible."""
    with pytest.raises(UnreadableDocumentError) as raised:
        DocxDocumentReader().read(_with_broken_part("Anexo_1_condiciones.docx", "document.xml"))

    assert raised.value.reason is UnreadableReason.CORRUPTED


def test_an_xlsx_whose_sheet_breaks_while_reading_is_unreadable_not_a_crash() -> None:
    """(Regresión) openpyxl lee las hojas al recorrerlas: el error llegaba después de abrir."""
    with pytest.raises(UnreadableDocumentError) as raised:
        XlsxDocumentReader().read(_with_broken_part("Anexo_2_tarifas.xlsx", "sheet1.xml"))

    assert raised.value.reason is UnreadableReason.CORRUPTED


def test_hidden_script_and_style_text_is_not_part_of_an_email() -> None:
    """(Regresión) Un «4587» escondido en un <script> no se lee como si estuviera en el correo."""
    html = "<style>p{color:red}</style><script>Contrato No. 4587</script><p>Contrato No. 4857</p>"

    text = html_to_text(html)

    assert "4587" not in text
    assert "color" not in text
    assert "Contrato No. 4857" in text
