import re
from collections.abc import Iterator
from dataclasses import dataclass
from itertools import chain, groupby

from argus.domain.document import Document, TextFragment
from argus.domain.locations import SheetCellLocation, SourceLocation, TableCellLocation
from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin, TextSpan

# Encabezados que abren una cláusula: «CLÁUSULA PRIMERA», «Artículo 3», «Parágrafo», «2.1.».
CLAUSE_HEADING = (
    r"(?:cl[aá]usula|art[ií]culo|par[aá]grafo|secci[oó]n|cap[ií]tulo|clause|article|section)\b"
    r"|\d+(?:\.\d+)*[.)]\s"
)
CLAUSE_START = re.compile(rf"\s*(?:{CLAUSE_HEADING})", re.IGNORECASE)
# Dónde empieza otro bloque: una línea en blanco, una línea después de un punto final (o de
# «:» o «;») y una línea que abre una cláusula. Una línea cortada a mitad de frase sigue igual.
BLOCK_BREAK = re.compile(
    rf"\n[ \t]*\n\s*|(?<=[.;:])[ \t]*\n\s*|\n\s*(?=(?:{CLAUSE_HEADING}))", re.IGNORECASE
)
CELL_SEPARATOR = " | "
CELL_ROW = re.compile(r"\d+$")


@dataclass(frozen=True)
class _Block:
    kind: SegmentKind
    text: str
    origin: SegmentOrigin


def split_blocks(text: str) -> Iterator[TextSpan]:
    """Tramos de párrafo o cláusula dentro de un texto, sin los espacios de los bordes."""
    breaks = list(BLOCK_BREAK.finditer(text))
    starts = [0, *(match.end() for match in breaks)]
    ends = [*(match.start() for match in breaks), len(text)]
    for start, end in zip(starts, ends, strict=True):
        piece = text[start:end]
        if piece.strip():
            leading = len(piece) - len(piece.lstrip())
            yield TextSpan(start + leading, start + len(piece.rstrip()))


def _row_key(location: SourceLocation) -> tuple[str, int] | None:
    """Tabla (u hoja) y fila de una celda; None si el fragmento no es una celda."""
    if isinstance(location, TableCellLocation):
        return (f"tabla {location.table}", location.row)
    if isinstance(location, SheetCellLocation):
        row = CELL_ROW.search(location.cell)
        return (location.sheet, int(row.group())) if row else None
    return None


class DocumentSegmenter:
    """Divide un documento en párrafos, cláusulas y filas de tabla, en orden de lectura."""

    def segment(self, document: Document) -> tuple[Segment, ...]:
        blocks = self._blocks(document)
        return tuple(
            Segment(position, block.kind, block.text, block.origin)
            for position, block in enumerate(blocks, start=1)
        )

    def _blocks(self, document: Document) -> Iterator[_Block]:
        by_row = groupby(document.fragments, key=lambda fragment: _row_key(fragment.location))
        for row, fragments in by_row:
            if row is None:
                texts = (_text_blocks(document.name, fragment) for fragment in fragments)
                yield from chain.from_iterable(texts)
            else:
                yield _row_block(document.name, tuple(fragments))


def _text_blocks(document_name: str, fragment: TextFragment) -> Iterator[_Block]:
    for span in split_blocks(fragment.text):
        text = fragment.text[span.start : span.end]
        kind = SegmentKind.CLAUSE if CLAUSE_START.match(text) else SegmentKind.PARAGRAPH
        yield _Block(kind, text, SegmentOrigin(document_name, fragment.location, span))


def _row_block(document_name: str, cells: tuple[TextFragment, ...]) -> _Block:
    text = CELL_SEPARATOR.join(cell.text for cell in cells)
    return _Block(
        SegmentKind.TABLE_ROW, text, SegmentOrigin(document_name, cells[0].location, None)
    )
