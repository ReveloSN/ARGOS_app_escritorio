"""Qué segmento de un documento corresponde a cuál del otro, y cuáles cambiaron de lugar."""

from bisect import bisect_left
from collections.abc import Sequence
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import cached_property

from argus.domain.text_comparison.segment import Segment, normalize_for_comparison

NO_PREVIOUS = -1


@dataclass(frozen=True)
class AlignedPair:
    first: Segment
    second: Segment
    # 1.0 cuando dicen lo mismo (misma huella); si no, la similitud con la que se alinearon.
    similarity: float

    @property
    def is_exact(self) -> bool:
        return self.first.fingerprint == self.second.fingerprint


@dataclass(frozen=True)
class Alignment:
    pairs: tuple[AlignedPair, ...]
    removed: tuple[Segment, ...]
    added: tuple[Segment, ...]

    @cached_property
    def _moved(self) -> frozenset[int]:
        """Segmentos (posición en el primer documento) fuera del orden que comparten los demás."""
        ordered = sorted(self.pairs, key=lambda pair: pair.first.position)
        kept = longest_increasing_run([pair.second.position for pair in ordered])
        return frozenset(
            pair.first.position for index, pair in enumerate(ordered) if index not in kept
        )

    def is_moved(self, pair: AlignedPair) -> bool:
        return pair.first.position in self._moved


def longest_increasing_run(values: Sequence[int]) -> set[int]:
    """Índices de una subsecuencia creciente más larga (O(n log n)).

    Los segmentos que la forman quedaron en su lugar; mover uno solo no hace que todos los que
    siguen parezcan movidos.
    """
    tail_values: list[int] = []
    tail_indices: list[int] = []
    previous: list[int] = []
    for index, value in enumerate(values):
        length = bisect_left(tail_values, value)
        previous.append(tail_indices[length - 1] if length else NO_PREVIOUS)
        if length == len(tail_values):
            tail_values.append(value)
            tail_indices.append(index)
        else:
            tail_values[length] = value
            tail_indices[length] = index
    return _chain_back(previous, tail_indices[-1] if tail_indices else NO_PREVIOUS)


def _chain_back(previous: Sequence[int], last: int) -> set[int]:
    chain: set[int] = set()
    while last != NO_PREVIOUS:
        chain.add(last)
        last = previous[last]
    return chain


def word_similarity(first: str, second: str) -> float:
    """Proporción de palabras en común y en el mismo orden (0 a 1), sin modelo de lenguaje."""
    first_words = normalize_for_comparison(first).split()
    second_words = normalize_for_comparison(second).split()
    return SequenceMatcher(None, first_words, second_words, autojunk=False).ratio()
