from collections.abc import Mapping

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.domain.confirmed_fact import FactValue
from argus.domain.entity import EntityType
from argus.domain.errors import UnrecognizedFactValueError

# Algunos extractores solo reconocen el valor después de su etiqueta («Contrato No. 4857»,
# «NIT 900.482.315-7»); el usuario escribe solo el valor, así que se prueba también con ella.
LABEL_PREFIXES: Mapping[EntityType, str] = {
    EntityType.CONTRACT_ID: "Contrato No. ",
    EntityType.TAX_ID: "NIT ",
}


class FactValueReader:
    """Lee el valor que escribe el usuario con los mismos extractores que los documentos.

    Así un dato confirmado se normaliza igual que los valores con los que se compara:
    «$ 18.450.000» y «18450000 pesos» son el mismo monto.
    """

    def __init__(self, pipeline: EntityExtractionPipeline) -> None:
        self._pipeline = pipeline

    def read(self, entity_type: EntityType, text: str) -> FactValue:
        written = text.strip()
        for candidate in (written, LABEL_PREFIXES.get(entity_type, "") + written):
            normalized = self._normalized(entity_type, candidate)
            if normalized is not None:
                return FactValue(entity_type, written, normalized)
        raise UnrecognizedFactValueError(entity_type, written)

    def _normalized(self, entity_type: EntityType, text: str) -> str | None:
        return next(
            (
                match.normalized_value
                for match in self._pipeline.matches(text)
                if match.type is entity_type
            ),
            None,
        )
