from collections.abc import Callable, Sequence

from argus.domain.report_document import ReportTable

type TextWidth = Callable[[str], float]

# Una columna es «compacta» si ninguno de sus textos pasa de este largo: «#», «Riesgo», una fecha.
COMPACT_TEXT_LENGTH = 18
# El relleno de la celda de reportlab (6 pt por lado) y un margen para la negrita del encabezado.
CELL_PADDING = 16.0


def _longest_word(text: str, width_of: TextWidth) -> float:
    return max((width_of(word) for word in text.split()), default=0.0)


def _texts(table: ReportTable, index: int) -> list[str]:
    return [table.columns[index], *(row[index].text for row in table.rows)]


def _is_compact(table: ReportTable, index: int) -> bool:
    return all(
        len(row[index].text) <= COMPACT_TEXT_LENGTH and not row[index].detail for row in table.rows
    )


def column_widths(table: ReportTable, available: float, width_of: TextWidth) -> Sequence[float]:
    """Anchos de columna en puntos que suman `available`.

    Las columnas compactas (número, riesgo, tipo de dato) miden lo que su palabra más larga, para
    que «Riesgo» o «12» no se partan letra a letra. El resto del ancho se reparte por igual entre
    las columnas de valores y origen, donde los nombres de archivo largos se parten en su celda.
    """
    count = len(table.columns)
    compact = {
        index: max(_longest_word(text, width_of) for text in _texts(table, index)) + CELL_PADDING
        for index in range(count)
        if _is_compact(table, index)
    }
    wide = count - len(compact)
    if sum(compact.values()) >= available:
        return [available / count] * count
    if wide == 0:
        # Todas cortas (la tabla de decisiones): cada una crece en proporción a lo que necesita.
        scale = available / sum(compact.values())
        return [compact[index] * scale for index in range(count)]
    rest = (available - sum(compact.values())) / wide
    return [compact.get(index, rest) for index in range(count)]
