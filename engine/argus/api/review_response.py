from argus.api.schemas.review import (
    AlertResponse,
    AlertSideResponse,
    DecisionResponse,
    DecisionsResponse,
    DocumentResponse,
    ExplanationPartResponse,
    OccurrenceResponse,
    ReviewResponse,
    SessionResponse,
)
from argus.application.alert_explanation import AlertExplainer, Explanation
from argus.application.open_review import StoredReview
from argus.application.review_decisions import DecisionsState
from argus.application.run_review import ReviewOutcome
from argus.domain.alert import AlertSide, NumberedAlert
from argus.domain.comparison.damerau_levenshtein import differing_positions
from argus.domain.decision import Decision
from argus.domain.entity import Entity
from argus.domain.read_outcome import ReadSummary
from argus.domain.review_session import ReviewSession
from argus.infrastructure.persistence.alert_serialization import location_payload

NO_DECISIONS = DecisionsState((), can_undo=False)


def stored_review_of(outcome: ReviewOutcome) -> StoredReview:
    summaries = tuple(document.summary for document in outcome.documents)
    return StoredReview(outcome.session, summaries, outcome.alerts)


def to_review_response(
    review: StoredReview, decisions: DecisionsState, explainer: AlertExplainer
) -> ReviewResponse:
    explanations = explainer.explain([item.alert for item in review.alerts])
    return ReviewResponse(
        session=session_response(review.session),
        documents=[document_response(document) for document in review.documents],
        alerts=[
            _alert(item, explanation)
            for item, explanation in zip(review.alerts, explanations, strict=True)
        ],
        decisions=decisions_response(decisions),
    )


def session_response(session: ReviewSession) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        closed_at=session.closed_at,
    )


def document_response(summary: ReadSummary) -> DocumentResponse:
    return DocumentResponse(
        name=summary.name,
        status="read" if summary.is_read else "unreadable",
        reason=summary.reason,
        fragment_count=summary.fragment_count,
    )


def decisions_response(state: DecisionsState) -> DecisionsResponse:
    return DecisionsResponse(
        decisions=[_decision(decision) for decision in state.decisions],
        can_undo=state.can_undo,
    )


def _decision(decision: Decision) -> DecisionResponse:
    return DecisionResponse(
        alert_number=decision.alert_number,
        kind=decision.kind,
        correct_side=decision.correct_side,
        decided_at=decision.decided_at,
    )


def _explanation(explanation: Explanation) -> list[ExplanationPartResponse]:
    return [
        ExplanationPartResponse(key=part.key, params=dict(part.params), count=part.count)
        for part in explanation
    ]


def _alert(item: NumberedAlert, explanation: Explanation) -> AlertResponse:
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
        explanation=_explanation(explanation),
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
