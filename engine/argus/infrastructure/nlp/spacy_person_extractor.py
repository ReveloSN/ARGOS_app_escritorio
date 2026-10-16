import re
from collections.abc import Callable, Iterator
from functools import cache

import spacy
from spacy.language import Language

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.infrastructure.extraction.normalization import normalize_name

SPANISH_MODEL = "es_core_news_md"
# Solo se usa el reconocimiento de entidades: sin el análisis sintáctico, leer es más rápido.
UNUSED_COMPONENTS = ("morphologizer", "parser", "attribute_ruler", "lemmatizer")
PERSON_LABEL = "PER"
MIN_NAME_WORDS = 2
NAME_WORD = re.compile(r"^(?:[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+|[A-ZÁÉÍÓÚÑ]\.)$")


@cache
def load_spanish_pipeline() -> Language:
    """El modelo se carga una vez, la primera vez que se lee un documento."""
    return spacy.load(SPANISH_MODEL, exclude=list(UNUSED_COMPONENTS))


def looks_like_person_name(text: str) -> bool:
    """Dos o más palabras con mayúscula inicial (o iniciales): descarta títulos y frases."""
    words = text.split()
    return len(words) >= MIN_NAME_WORDS and all(NAME_WORD.match(word) for word in words)


class SpacyPersonNameExtractor:
    """Nombres de personas con el reconocimiento de entidades de spaCy (CLAUDE.md §8, capa 2).

    Va al final de la cadena: los nombres que ya reconoció la regla «Representante legal:»
    quedan reservados, y este extractor encuentra los que no tienen cargo delante.
    """

    def __init__(self, load_pipeline: Callable[[], Language] = load_spanish_pipeline) -> None:
        self._load_pipeline = load_pipeline

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for entity in self._load_pipeline()(text).ents:
            if entity.label_ == PERSON_LABEL and looks_like_person_name(entity.text):
                yield EntityMatch(
                    EntityType.PERSON_NAME,
                    entity.text,
                    normalize_name(entity.text),
                    entity.start_char,
                    entity.end_char,
                )
