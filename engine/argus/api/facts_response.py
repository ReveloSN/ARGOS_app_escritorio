from argus.api.review_response import occurrence_response
from argus.api.schemas.facts import (
    AcceptedValueResponse,
    ContradictionResponse,
    FactResponse,
    FactsResponse,
    PendingFactResponse,
    VariantResponse,
)
from argus.api.schemas.review import OccurrenceResponse
from argus.application.check_confirmed_facts import CaseFileFacts
from argus.domain.alert import AlertSide
from argus.domain.fact_check import AcceptedByRule, FactCheck, FactContradiction
from argus.domain.pending_fact import PendingFact


def to_facts_response(facts: CaseFileFacts, can_undo: bool) -> FactsResponse:
    return FactsResponse(
        facts=[_fact(check) for check in facts.checks],
        pending=[_pending(item) for item in facts.pending],
        can_undo=can_undo,
    )


def _fact(check: FactCheck) -> FactResponse:
    fact = check.fact
    return FactResponse(
        id=fact.id,
        label=fact.label,
        entity_type=fact.value.entity_type,
        value=fact.value.raw_value,
        confirmed_at=fact.confirmed_at,
        retired_at=fact.retired_at,
        appearances=[occurrence_response(entity) for entity in check.appearances],
        variants=_variants(check),
        contradictions=[_contradiction(item) for item in check.contradictions],
        accepted=[_accepted(item) for item in check.accepted],
    )


def _variants(check: FactCheck) -> list[VariantResponse]:
    """Formas distintas de escribir el valor confirmado; los espacios no cuentan."""
    confirmed = "".join(check.fact.value.raw_value.split())
    found = {
        entity.raw_value: entity.occurrence.document_name
        for entity in check.appearances
        if "".join(entity.raw_value.split()) != confirmed
    }
    return [VariantResponse(value=value, document=document) for value, document in found.items()]


def _occurrences(side: AlertSide) -> list[OccurrenceResponse]:
    return [occurrence_response(entity) for entity in side.entities]


def _contradiction(item: FactContradiction) -> ContradictionResponse:
    return ContradictionResponse(
        value=item.side.representative.raw_value,
        risk=item.risk,
        difference_kind=item.difference.kind,
        occurrences=_occurrences(item.side),
    )


def _accepted(item: AcceptedByRule) -> AcceptedValueResponse:
    return AcceptedValueResponse(
        value=item.side.representative.raw_value,
        rule_created_at=item.rule.created_at,
        occurrences=_occurrences(item.side),
    )


def _pending(item: PendingFact) -> PendingFactResponse:
    return PendingFactResponse(entity_type=item.entity_type, values=list(item.values))
