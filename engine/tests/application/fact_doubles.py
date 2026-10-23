"""Extractores de prueba para los datos confirmados: reconocen contratos y montos sencillos."""

import re
from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType

CONTRACT = re.compile(r"Contrato No\. (?P<value>\d+)")
AMOUNT = re.compile(r"\$ (?P<value>[\d.]+)")


class PatternExtractor:
    def __init__(self, entity_type: EntityType, pattern: re.Pattern[str]) -> None:
        self._entity_type = entity_type
        self._pattern = pattern

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in self._pattern.finditer(text):
            value = match.group("value")
            normalized = value.replace(".", "")
            yield EntityMatch(self._entity_type, value, normalized, match.start(), match.end())


def fact_pipeline() -> EntityExtractionPipeline:
    return EntityExtractionPipeline(
        [
            PatternExtractor(EntityType.CONTRACT_ID, CONTRACT),
            PatternExtractor(EntityType.MONEY, AMOUNT),
        ]
    )
