from argus.api.review_response import decisions_response
from argus.api.schemas.send_review import (
    DraftAttachmentResponse,
    DraftResponse,
    SendFixResponse,
    SendIssueResponse,
    SendReviewResponse,
)
from argus.application.decision_history import DecisionsState
from argus.domain.send_review import EmailDraft, SendFix, SendIssue, SendReview


def to_send_review_response(review: SendReview, decisions: DecisionsState) -> SendReviewResponse:
    return SendReviewResponse(
        id=review.id,
        session_id=review.session_id,
        created_at=review.created_at,
        draft=_draft(review.draft),
        issues=[_issue(issue) for issue in review.issues],
        decisions=decisions_response(decisions),
    )


def _draft(draft: EmailDraft) -> DraftResponse:
    return DraftResponse(
        file_name=draft.file_name,
        subject=draft.subject,
        to=list(draft.to),
        cc=list(draft.cc),
        body=draft.body,
        attachments=[
            DraftAttachmentResponse(name=item.name, size=item.size) for item in draft.attachments
        ],
    )


def _fix(fix: SendFix | None) -> SendFixResponse | None:
    if fix is None:
        return None
    return SendFixResponse(kind=fix.kind, target=fix.target, replacement=fix.replacement)


def _issue(issue: SendIssue) -> SendIssueResponse:
    return SendIssueResponse(
        number=issue.number,
        kind=issue.kind,
        risk=issue.risk,
        part=issue.part,
        marked_text=issue.marked_text,
        params=dict(issue.params),
        fix=_fix(issue.fix),
    )
