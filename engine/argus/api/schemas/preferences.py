"""Ajustes del motor (Detección y Privacidad) y casos que no generan alerta."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field

from argus.api.schemas.review import CamelModel

type SensitivityValue = Literal["strict", "balanced", "permissive"]
type CategoryValue = Literal["identifiers", "dates", "amounts", "names", "periods"]


class SuppressionRuleResponse(CamelModel):
    id: int
    entity_type: str
    first_label: str
    second_label: str
    created_at: datetime


class PreferencesResponse(CamelModel):
    sensitivity: SensitivityValue
    compared_categories: list[CategoryValue]
    has_retention_limit: bool
    history_folder: str
    suppression_rules: list[SuppressionRuleResponse]


class PreferencesUpdate(CamelModel):
    sensitivity: SensitivityValue
    compared_categories: Annotated[list[CategoryValue], Field(min_length=1)]
    has_retention_limit: bool


class HistoryFolderRequest(CamelModel):
    path: str


class HistoryFolderResponse(CamelModel):
    history_folder: str
    # La carpeta nueva vale desde que el motor se reinicia.
    restart_required: bool


class SuppressionRequest(CamelModel):
    session_id: str
    alert_number: int
