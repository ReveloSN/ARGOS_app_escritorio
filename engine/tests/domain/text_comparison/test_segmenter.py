import pytest

from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import InvalidValueError
from argus.domain.locations import (
    EmailPart,
    EmailPartLocation,
    PageLocation,
    ParagraphLocation,
    SheetCellLocation,
    TableCellLocation,
)
from argus.domain.text_comparison.segment import (
    Segment,
    SegmentKind,
    SegmentOrigin,
    TextSpan,
    normalize_for_comparison,
)
from argus.domain.text_comparison.segmenter import DocumentSegmenter

CONTRACT_PAGE = """CONTRATO DE ARRENDAMIENTO No. 4857

CLÁUSULA PRIMERA. OBJETO. El arrendador entrega la bodega
ubicada en Fontibón.
CLÁUSULA SEGUNDA. CANON. El canon mensual es de $ 18.450.000.
El pago se hace el día 5 de cada mes.
1. Las partes no podrán ceder el contrato."""


def document_with(*fragments: TextFragment) -> Document:
    return Document("Contrato_v2.pdf", DocumentFormat.PDF, fragments)


def segment_texts(segments: tuple[Segment, ...]) -> list[str]:
    return [segment.text for segment in segments]


def test_a_page_is_split_into_paragraphs_and_clauses() -> None:
    page = TextFragment(CONTRACT_PAGE, PageLocation(1))

    segments = DocumentSegmenter().segment(document_with(page))

    assert segment_texts(segments) == [
        "CONTRATO DE ARRENDAMIENTO No. 4857",
        "CLÁUSULA PRIMERA. OBJETO. El arrendador entrega la bodega\nubicada en Fontibón.",
        "CLÁUSULA SEGUNDA. CANON. El canon mensual es de $ 18.450.000.",
        "El pago se hace el día 5 de cada mes.",
        "1. Las partes no podrán ceder el contrato.",
    ]
    assert [segment.kind for segment in segments] == [
        SegmentKind.PARAGRAPH,
        SegmentKind.CLAUSE,
        SegmentKind.CLAUSE,
        SegmentKind.PARAGRAPH,
        SegmentKind.CLAUSE,
    ]
    assert [segment.position for segment in segments] == [1, 2, 3, 4, 5]


def test_every_segment_points_back_to_its_place_in_the_file() -> None:
    page = TextFragment(CONTRACT_PAGE, PageLocation(2))

    segments = DocumentSegmenter().segment(document_with(page))

    for segment in segments:
        span = segment.origin.span
        assert span is not None
        assert CONTRACT_PAGE[span.start : span.end] == segment.text
        assert segment.origin.document_name == "Contrato_v2.pdf"
        assert segment.origin.location == PageLocation(2)


def test_word_paragraphs_and_email_bodies_keep_their_own_location() -> None:
    body = EmailPartLocation(EmailPart.BODY)
    document = document_with(
        TextFragment("Adjunto el contrato firmado.", ParagraphLocation(3)),
        TextFragment("Buenos días.\n\nQuedo atento a sus comentarios.", body),
    )

    segments = DocumentSegmenter().segment(document)

    assert [(segment.text, segment.origin.location) for segment in segments] == [
        ("Adjunto el contrato firmado.", ParagraphLocation(3)),
        ("Buenos días.", body),
        ("Quedo atento a sus comentarios.", body),
    ]


def test_cells_of_the_same_table_row_form_one_segment() -> None:
    document = document_with(
        TextFragment("Concepto", TableCellLocation(1, 1, 1)),
        TextFragment("Valor", TableCellLocation(1, 1, 2)),
        TextFragment("Canon", TableCellLocation(1, 2, 1)),
        TextFragment("$ 18.450.000", TableCellLocation(1, 2, 2)),
    )

    segments = DocumentSegmenter().segment(document)

    assert segment_texts(segments) == ["Concepto | Valor", "Canon | $ 18.450.000"]
    assert {segment.kind for segment in segments} == {SegmentKind.TABLE_ROW}
    assert segments[1].origin == SegmentOrigin("Contrato_v2.pdf", TableCellLocation(1, 2, 1), None)


def test_spreadsheet_cells_are_grouped_by_sheet_and_row() -> None:
    document = document_with(
        TextFragment("Tarifa", SheetCellLocation("Mayo", "A2")),
        TextFragment("1.200", SheetCellLocation("Mayo", "B2")),
        TextFragment("Tarifa", SheetCellLocation("Junio", "A2")),
    )

    segments = DocumentSegmenter().segment(document)

    assert segment_texts(segments) == ["Tarifa | 1.200", "Tarifa"]


def test_only_the_exact_same_text_has_the_same_fingerprint() -> None:
    assert normalize_for_comparison("  El CANON\nmensual ") == "el canon mensual"
    first = Segment(1, SegmentKind.PARAGRAPH, "El canon mensual", origin_of("a.txt"))
    same = Segment(7, SegmentKind.PARAGRAPH, "El canon mensual", origin_of("b.txt"))
    upper = Segment(1, SegmentKind.PARAGRAPH, "EL CANON MENSUAL", origin_of("b.txt"))

    # Un cambio de mayúsculas o de espacios también se informa (Comparar decide si se ve).
    assert first.fingerprint == same.fingerprint != upper.fingerprint


def origin_of(name: str) -> SegmentOrigin:
    return SegmentOrigin(name, ParagraphLocation(1), TextSpan(0, 1))


@pytest.mark.parametrize(("start", "end"), [(-1, 3), (4, 4), (5, 2)])
def test_a_span_must_cover_some_text(start: int, end: int) -> None:
    with pytest.raises(InvalidValueError):
        TextSpan(start, end)
