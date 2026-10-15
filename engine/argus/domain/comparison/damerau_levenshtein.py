"""Distancia de Damerau-Levenshtein sin restricciones (algoritmo de Lowrance-Wagner).

Se usa la versión completa y no la «optimal string alignment», más común, porque esa no
cumple la desigualdad triangular y el BK-tree la necesita para descartar ramas sin perder
resultados.
"""

TRANSPOSED_CHARACTERS = 2


class _DistanceTable:
    def __init__(self, first: str, second: str) -> None:
        self._first = first
        self._second = second
        unreachable = len(first) + len(second)
        self._cells = [[0] * (len(second) + 2) for _ in range(len(first) + 2)]
        self._cells[0] = [unreachable] * (len(second) + 2)
        for row in range(len(first) + 1):
            self._cells[row + 1][0] = unreachable
            self._cells[row + 1][1] = row
        self._cells[1][1:] = list(range(len(second) + 1))
        self._last_row_of: dict[str, int] = {}
        self._last_match_column = 0

    def compute(self) -> int:
        for row in range(1, len(self._first) + 1):
            self._last_match_column = 0
            for column in range(1, len(self._second) + 1):
                self._fill_cell(row, column)
            self._last_row_of[self._first[row - 1]] = row
        return self._cells[-1][-1]

    def _fill_cell(self, row: int, column: int) -> None:
        cells = self._cells
        swap_row = self._last_row_of.get(self._second[column - 1], 0)
        swap_column = self._last_match_column
        cost = 0 if self._first[row - 1] == self._second[column - 1] else 1
        if cost == 0:
            self._last_match_column = column
        cells[row + 1][column + 1] = min(
            cells[row][column] + cost,
            cells[row + 1][column] + 1,
            cells[row][column + 1] + 1,
            cells[swap_row][swap_column] + (row - swap_row - 1) + 1 + (column - swap_column - 1),
        )


def damerau_levenshtein(first: str, second: str) -> int:
    """Mínimo de inserciones, borrados, sustituciones y transposiciones de vecinos."""
    return _DistanceTable(first, second).compute()


def differing_positions(first: str, second: str) -> tuple[int, ...]:
    """Posiciones (base 1) donde difieren dos textos de igual longitud; vacío si no son iguales."""
    if len(first) != len(second):
        return ()
    return tuple(
        position
        for position, (left, right) in enumerate(zip(first, second, strict=True), start=1)
        if left != right
    )


def is_adjacent_transposition(first: str, second: str) -> bool:
    """«4857» frente a «4587»: dos caracteres vecinos intercambiados y nada más."""
    positions = differing_positions(first, second)
    if len(positions) != TRANSPOSED_CHARACTERS or positions[1] != positions[0] + 1:
        return False
    left, right = positions[0] - 1, positions[1] - 1
    return first[left] == second[right] and first[right] == second[left]
