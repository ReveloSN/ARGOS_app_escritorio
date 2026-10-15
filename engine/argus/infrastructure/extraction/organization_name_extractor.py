import re
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.infrastructure.extraction.normalization import normalize_name

NAME_WORD = r"[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&]*\.?"
CONNECTOR = r"(?:de|del|la|las|los|y)"
# S.A.S. antes que S.A.: la alternativa más larga debe probarse primero.
LEGAL_FORM = r"S\.\s?A\.\s?S\.?|SAS|S\.\s?A\.?|SA|LTDA\.?|Ltda\.?"
ORGANIZATION = re.compile(
    rf"(?P<name>{NAME_WORD}(?:\s+(?:{NAME_WORD}|{CONNECTOR})){{0,6}}?)"
    rf"\s+(?P<form>{LEGAL_FORM})(?!\w)"
)
NOT_A_LETTER = re.compile(r"[^A-Za-z]")


class OrganizationNameExtractor:
    """Reconoce razones sociales por su forma jurídica (S.A.S., S.A., Ltda.).

    La forma normalizada ignora puntos, tildes y mayúsculas: «Logística Andina S.A.S.» y
    «LOGISTICA ANDINA SAS» son la misma empresa escrita distinto (riesgo bajo, de formato).
    """

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in ORGANIZATION.finditer(text):
            legal_form = NOT_A_LETTER.sub("", match.group("form"))
            normalized = normalize_name(f"{match.group('name')} {legal_form}")
            yield EntityMatch(
                EntityType.ORGANIZATION_NAME,
                match.group(),
                normalized,
                match.start(),
                match.end(),
            )
