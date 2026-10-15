from dataclasses import dataclass
from enum import StrEnum

from argus.domain.locations import SourceLocation
from argus.domain.validation import require_text


class EntityType(StrEnum):
    CONTRACT_ID = "contract_id"
    DATE = "date"
    MONEY = "money"
    TAX_ID = "tax_id"
    PERSON_NAME = "person_name"
    ORGANIZATION_NAME = "organization_name"
    PERIOD = "period"


@dataclass(frozen=True)
class Occurrence:
    """Origen de un valor: archivo, ubicación y el fragmento donde se leyó."""

    document_name: str
    location: SourceLocation
    excerpt: str

    def __post_init__(self) -> None:
        require_text("El documento de la aparición", self.document_name)
        require_text("El fragmento de la aparición", self.excerpt)


@dataclass(frozen=True)
class Entity:
    """Valor extraído de un documento: cómo aparece, cómo se compara y de dónde salió."""

    type: EntityType
    raw_value: str
    normalized_value: str
    occurrence: Occurrence

    def __post_init__(self) -> None:
        require_text("El valor original", self.raw_value)
        require_text("El valor normalizado", self.normalized_value)
