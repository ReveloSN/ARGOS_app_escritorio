from fastapi import APIRouter, Response

from argus.api.composition import EngineServices
from argus.api.schemas.preferences import (
    PreferencesResponse,
    PreferencesUpdate,
    SuppressionRequest,
    SuppressionRuleResponse,
)
from argus.domain.preferences import ComparedCategory, UserPreferences
from argus.domain.sensitivity import Sensitivity
from argus.domain.suppression import SuppressionRule

NO_CONTENT = 204


def build_preferences_router(services: EngineServices) -> APIRouter:
    router = APIRouter()
    storage = services.storage

    @router.get("/preferences")
    def get_preferences() -> PreferencesResponse:
        return _preferences_response(services)

    @router.put("/preferences")
    def update_preferences(body: PreferencesUpdate) -> PreferencesResponse:
        storage.preferences.save(
            UserPreferences(
                Sensitivity(body.sensitivity),
                frozenset(ComparedCategory(item) for item in body.compared_categories),
                body.has_retention_limit,
            )
        )
        return _preferences_response(services)

    return router


def build_suppression_rules_router(services: EngineServices) -> APIRouter:
    """«No alertar casos similares» desde una alerta, y «Quitar» en Ajustes > Detección."""
    router = APIRouter(prefix="/suppression-rules")
    storage = services.storage

    @router.post("")
    def suppress_similar(body: SuppressionRequest) -> SuppressionRuleResponse:
        return _rule(services.suppress_similar.execute(body.session_id, body.alert_number))

    @router.delete("/{rule_id}", status_code=NO_CONTENT)
    def delete_rule(rule_id: int) -> Response:
        storage.rules.delete(rule_id)
        return Response(status_code=NO_CONTENT)

    return router


def _preferences_response(services: EngineServices) -> PreferencesResponse:
    storage = services.storage
    preferences = storage.preferences.get()
    return PreferencesResponse(
        sensitivity=preferences.sensitivity.value,
        compared_categories=sorted(category.value for category in preferences.compared_categories),
        has_retention_limit=preferences.has_retention_limit,
        history_folder=str(services.data_directory),
        suppression_rules=[_rule(rule) for rule in storage.rules.list_all()],
    )


def _rule(rule: SuppressionRule) -> SuppressionRuleResponse:
    return SuppressionRuleResponse(
        id=rule.id,
        entity_type=rule.case.entity_type,
        first_label=rule.case.first_label,
        second_label=rule.case.second_label,
        created_at=rule.created_at,
    )
