"""Cifras escritas en letras en español: «dieciocho millones cuatrocientos cincuenta mil»."""

from collections.abc import Sequence
from dataclasses import dataclass

from argus.infrastructure.extraction.normalization import strip_accents

THOUSAND = 1_000
MILLION = 1_000_000

UNITS = {
    "cero": 0, "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10, "once": 11, "doce": 12,
    "trece": 13, "catorce": 14, "quince": 15, "dieciseis": 16, "diecisiete": 17,
    "dieciocho": 18, "diecinueve": 19, "veinte": 20, "veintiun": 21, "veintiuno": 21,
    "veintiuna": 21, "veintidos": 22, "veintitres": 23, "veinticuatro": 24,
    "veinticinco": 25, "veintiseis": 26, "veintisiete": 27, "veintiocho": 28,
    "veintinueve": 29, "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60,
    "setenta": 70, "ochenta": 80, "noventa": 90, "cien": 100, "ciento": 100,
    "doscientos": 200, "doscientas": 200, "trescientos": 300, "trescientas": 300,
    "cuatrocientos": 400, "cuatrocientas": 400, "quinientos": 500, "quinientas": 500,
    "seiscientos": 600, "seiscientas": 600, "setecientos": 700, "setecientas": 700,
    "ochocientos": 800, "ochocientas": 800, "novecientos": 900, "novecientas": 900,
}  # fmt: skip
MILLION_WORDS = frozenset({"millon", "millones"})
CONNECTOR = "y"
# Lo que suele seguir a la cifra y no la cambia: «… pesos m/cte», «… de pesos moneda corriente».
CURRENCY_WORDS = frozenset(
    {"de", "pesos", "peso", "m/cte", "m/cte.", "mcte", "moneda", "corriente"}
)

type Accumulated = tuple[int, int]


@dataclass(frozen=True)
class WrittenNumber:
    """Una cifra en letras: su valor y las palabras tal como están escritas."""

    value: int
    text: str


def _add_word(accumulated: Accumulated, word: str) -> Accumulated | None:
    total, current = accumulated
    if word in UNITS:
        return total, current + UNITS[word]
    if word == "mil":
        return total, max(current, 1) * THOUSAND
    if word in MILLION_WORDS:
        return total + max(current, 1) * MILLION, 0
    return accumulated if word == CONNECTOR else None


def parse_spanish_number(words: Sequence[str]) -> int | None:
    """El valor de las palabras (sin tildes ni mayúsculas), o None si alguna no es de una cifra."""
    if not words or words[0] == CONNECTOR:
        return None
    accumulated: Accumulated | None = (0, 0)
    for word in words:
        accumulated = None if accumulated is None else _add_word(accumulated, word)
    return None if accumulated is None else sum(accumulated)


def trailing_number(text: str) -> WrittenNumber | None:
    """La cifra más larga al final del texto: «la suma de dieciocho millones de pesos» → 18000000."""
    tokens = text.replace(",", " ").split()
    words = [strip_accents(token).casefold() for token in tokens]
    while words and words[-1] in CURRENCY_WORDS:
        words.pop()
    for start in range(len(words)):
        value = parse_spanish_number(words[start:])
        if value is not None:
            return WrittenNumber(value, " ".join(tokens[start : len(words)]))
    return None
