import re
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.infrastructure.extraction.normalization import only_digits

NUMBER_LABEL = r"\s*:?\s*(?:no\.?\s*)?"
NIT_PATTERN = re.compile(
    r"\bN\.?\s?I\.?\s?T\b\.?" + NUMBER_LABEL + r"(?P<number>\d{1,3}(?:\.?\d{3}){2,3})"
    r"(?:\s*-\s*(?P<check>\d))?",
    re.IGNORECASE,
)
CITIZEN_ID_PATTERN = re.compile(
    r"\b(?:C\.\s?C\b\.?|CC\b|c[ée]dula(?:\s+de\s+ciudadan[íi]a)?)"
    + NUMBER_LABEL
    + r"(?P<number>\d{1,3}(?:\.?\d{3}){1,3})\b",
    re.IGNORECASE,
)
NIT_PREFIX = "NIT"
CITIZEN_ID_PREFIX = "CC"


class TaxIdExtractor:
    """Reconoce NIT y cédulas por su etiqueta; el prefijo evita comparar un NIT con una cédula."""

    def extract(self, text: str) -> Iterator[EntityMatch]:
        yield from (_nit_match(match) for match in NIT_PATTERN.finditer(text))
        yield from (_citizen_id_match(match) for match in CITIZEN_ID_PATTERN.finditer(text))


def _nit_match(match: re.Match[str]) -> EntityMatch:
    number = only_digits(match.group("number"))
    check_digit = match.group("check")
    normalized = f"{NIT_PREFIX}:{number}-{check_digit}" if check_digit else f"{NIT_PREFIX}:{number}"
    raw = match.string[match.start("number") : match.end()]
    return EntityMatch(EntityType.TAX_ID, raw, normalized, match.start(), match.end())


def _citizen_id_match(match: re.Match[str]) -> EntityMatch:
    normalized = f"{CITIZEN_ID_PREFIX}:{only_digits(match.group('number'))}"
    return EntityMatch(
        EntityType.TAX_ID, match.group("number"), normalized, match.start(), match.end()
    )
