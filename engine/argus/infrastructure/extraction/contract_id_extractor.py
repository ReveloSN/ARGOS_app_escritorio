import re
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.domain.values import ContractId

# «Contrato No. 4857», «contrato número 3921», «Contrato de prestación de servicios No. 3921».
CONTRACT_PATTERN = re.compile(
    r"\bcontrato"
    r"(?:\s+de\s+[^\W\d_]+(?:\s+[^\W\d_]+){0,4})?"
    r"\s+(?:n[úu]mero|nro\.?|no\.?|n\.?\s*[°º])"
    r"\s*(?P<value>[a-z0-9]+(?:-[a-z0-9]+)*)",
    re.IGNORECASE,
)


class ContractIdExtractor:
    """Reconoce números de contrato solo cuando van después de la palabra «contrato»."""

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in CONTRACT_PATTERN.finditer(text):
            value = match.group("value")
            if any(character.isdigit() for character in value):
                normalized = ContractId(value.upper()).value
                yield EntityMatch(
                    EntityType.CONTRACT_ID, value, normalized, match.start(), match.end()
                )
