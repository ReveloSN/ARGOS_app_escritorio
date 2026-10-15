from argus.api.schemas.review import (
    AlertResponse,
    AlertSideResponse,
    DocumentResponse,
    OccurrenceResponse,
    ReviewResponse,
    SessionResponse,
)
from argus.application.run_review import DocumentReadOutcome, ReviewOutcome
from argus.domain.alert import AlertSide, NumberedAlert
from argus.domain.comparison.damerau_levenshtein import differing_positions
from argus.domain.entity import Entity
from argus.infrastructure.persistence.alert_serialization import location_payload


def to_review_response(outcome: ReviewOutcome) -> ReviewResponse:
    session = outcome.session
    return ReviewResponse(
        session=SessionResponse(id=session.id, name=session.name, created_at=session.created_at),
        documents=[_document(document) for document in outcome.documents],
        alerts=[_alert(item) for item in outcome.alerts],
    )


def _document(outcome: DocumentReadOutcome) -> DocumentResponse:
    return DocumentResponse(
        name=outcome.name,
        status="read" if outcome.is_read else "unreadable",
        reason=outcome.reason,
        fragment_count=outcome.fragment_count,
    )


def _alert(item: NumberedAlert) -> AlertResponse:
    alert = item.alert
    first_raw = alert.first.representative.raw_value
    second_raw = alert.second.representative.raw_value
    return AlertResponse(
        number=item.number,
        risk=alert.risk,
        entity_type=alert.entity_type,
        difference_kind=alert.difference.kind,
        confidence=alert.confidence,
        highlight_positions=list(differing_positions(first_raw, second_raw)),
        first=_side(alert.first),
        second=_side(alert.second),
    )


def _side(side: AlertSide) -> AlertSideResponse:
    return AlertSideResponse(
        value=side.representative.raw_value,
        normalized_value=side.normalized_value,
        occurrences=[_occurrence(entity) for entity in side.entities],
    )


def _occurrence(entity: Entity) -> OccurrenceResponse:
    occurrence = entity.occurrence
    return OccurrenceResponse(
        document=occurrence.document_name,
        location=location_payload(occurrence.location),
        excerpt=occurrence.excerpt,
    )
