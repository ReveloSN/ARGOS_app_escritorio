from fastapi import APIRouter

from argus.api.composition import EngineServices
from argus.api.facts_response import to_facts_response
from argus.api.schemas.facts import FactBody, FactsResponse, FactValueBody
from argus.application.confirmed_facts import FactRequest, FactsState

FACTS_PREFIX = "/reviews/{session_id}/facts"


def facts_response(services: EngineServices, session_id: str, state: FactsState) -> FactsResponse:
    """Cada respuesta trae los datos ya comparados: un cambio marca al instante lo que contradice."""
    checked = services.check_facts.execute(session_id, state.facts)
    return to_facts_response(checked, state.can_undo)


def build_facts_router(services: EngineServices) -> APIRouter:
    """«Datos confirmados» del expediente: verlos, agregar uno y deshacer el último cambio."""
    router = APIRouter(prefix=FACTS_PREFIX)
    facts = services.facts

    @router.get("")
    def list_facts(session_id: str) -> FactsResponse:
        return facts_response(services, session_id, facts.state(session_id))

    @router.post("")
    def add_fact(session_id: str, body: FactBody) -> FactsResponse:
        request = FactRequest(body.label.strip(), body.entity_type, body.value)
        return facts_response(services, session_id, facts.add(session_id, request))

    @router.post("/undo")
    def undo_fact(session_id: str) -> FactsResponse:
        return facts_response(services, session_id, facts.undo(session_id))

    return router


def build_fact_changes_router(services: EngineServices) -> APIRouter:
    """Editar, retirar y restaurar un dato ya confirmado."""
    router = APIRouter(prefix=FACTS_PREFIX)
    facts = services.facts

    @router.put("/{fact_id}")
    def edit_fact(session_id: str, fact_id: int, body: FactValueBody) -> FactsResponse:
        return facts_response(services, session_id, facts.edit(session_id, fact_id, body.value))

    @router.post("/{fact_id}/retire")
    def retire_fact(session_id: str, fact_id: int) -> FactsResponse:
        return facts_response(services, session_id, facts.retire(session_id, fact_id))

    @router.post("/{fact_id}/restore")
    def restore_fact(session_id: str, fact_id: int) -> FactsResponse:
        return facts_response(services, session_id, facts.restore(session_id, fact_id))

    return router
