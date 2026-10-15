import re
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.infrastructure.extraction.normalization import normalize_name

ROLE_OR_TITLE = r"(?i:representante\s+legal|se[ñn]ora?|sra?\.)"
CAPITALIZED_WORD = r"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+"
INITIAL = r"[A-ZÁÉÍÓÚÑ]\."
PERSON = re.compile(
    rf"\b{ROLE_OR_TITLE}\s*:?\s*"
    rf"(?P<name>{CAPITALIZED_WORD}(?:\s+(?:{CAPITALIZED_WORD}|{INITIAL})){{1,4}})"
)


class PersonNameExtractor:
    """Reconoce nombres de personas después de un cargo o tratamiento («Representante legal:»).

    Es la capa determinista; el reconocimiento de nombres con spaCy llega en la Fase 7 como
    otro extractor de la misma cadena.
    """

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in PERSON.finditer(text):
            name = match.group("name")
            yield EntityMatch(
                EntityType.PERSON_NAME, name, normalize_name(name), match.start(), match.end()
            )
