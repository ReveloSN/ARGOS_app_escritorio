from collections.abc import Callable, Iterable
from dataclasses import dataclass, field


@dataclass
class _Node:
    word: str
    children: dict[int, "_Node"] = field(default_factory=dict)


class BKTree:
    """Árbol de Burkhard-Keller para buscar valores casi iguales (CLAUDE.md §6).

    Cada hijo cuelga de su padre según la distancia entre ambos. Por la desigualdad
    triangular, al buscar con radio r desde un nodo a distancia d solo pueden servir los hijos
    con arista en [d - r, d + r]: el resto se descarta sin calcular su distancia.
    """

    def __init__(self, words: Iterable[str], distance: Callable[[str, str], int]) -> None:
        self._distance = distance
        self._root: _Node | None = None
        self._size = 0
        for word in words:
            self._add(word)

    def __len__(self) -> int:
        return self._size

    def search(self, query: str, radius: int) -> list[tuple[str, int]]:
        """Palabras a distancia ≤ radio de la consulta, con su distancia."""
        found: list[tuple[str, int]] = []
        pending = [self._root] if self._root else []
        while pending:
            node = pending.pop()
            distance = self._distance(query, node.word)
            if distance <= radius:
                found.append((node.word, distance))
            pending.extend(
                child
                for edge, child in node.children.items()
                if distance - radius <= edge <= distance + radius
            )
        return found

    def _add(self, word: str) -> None:
        if self._root is None:
            self._root = _Node(word)
            self._size = 1
            return
        node = self._root
        while (distance := self._distance(word, node.word)) != 0:
            child = node.children.get(distance)
            if child is None:
                node.children[distance] = _Node(word)
                self._size += 1
                return
            node = child
