"""Datos confirmados del expediente tal como los consume la pestaña «Datos confirmados»."""

from datetime import datetime
from typing import Annotated

from pydantic import Field

from argus.api.schemas.review import CamelModel, OccurrenceResponse
from argus.domain.entity import EntityType


class ContradictionResponse(CamelModel):
    value: str
    risk: str
    difference_kind: str
    occurrences: list[OccurrenceResponse]


class AcceptedValueResponse(CamelModel):
    """Un valor distinto que no se marca por una regla «No alertar casos similares»."""

    value: str
    rule_created_at: datetime
    occurrences: list[OccurrenceResponse]


class VariantResponse(CamelModel):
    """El mismo valor escrito de otra forma («36,9 millones»), aceptado como igual."""

    value: str
    document: str


class FactResponse(CamelModel):
    id: int
    label: str
    entity_type: str
    value: str
    confirmed_at: datetime
    retired_at: datetime | None
    appearances: list[OccurrenceResponse]
    variants: list[VariantResponse]
    contradictions: list[ContradictionResponse]
    accepted: list[AcceptedValueResponse]


class PendingFactResponse(CamelModel):
    entity_type: str
    values: list[str]


class FactsResponse(CamelModel):
    facts: list[FactResponse]
    pending: list[PendingFactResponse]
    can_undo: bool


class FactBody(CamelModel):
    label: Annotated[str, Field(min_length=1)]
    entity_type: EntityType
    value: Annotated[str, Field(min_length=1)]


class FactValueBody(CamelModel):
    value: Annotated[str, Field(min_length=1)]
