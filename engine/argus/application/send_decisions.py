from dataclasses import dataclass

from argus.application.decision_history import DecisionHistories, DecisionRequest, DecisionsState
from argus.application.ports.drafts import (
    CaseFileLibrary,
    DraftCorrections,
    DraftOutbox,
    DraftWriter,
    SendReviewRepository,
)
from argus.application.ports.repositories import DecisionRepository
from argus.domain.decision import DecisionKind
from argus.domain.errors import SendIssueNotFoundError
from argus.domain.send_review import SendFix, SendFixKind, SendReview


class SendDecisions:
    """Por cada problema del borrador: corregirlo («Es un error»), «Es correcto» o «Ignorar»."""

    def __init__(self, reviews: SendReviewRepository, histories: DecisionHistories) -> None:
        self._reviews = reviews
        self._histories = histories

    def decide(self, review_id: str, request: DecisionRequest) -> DecisionsState:
        if self._reviews.get(review_id).issue(request.alert_number) is None:
            raise SendIssueNotFoundError(review_id, request.alert_number)
        self._histories.decide(review_id, request)
        return self.state(review_id)

    def undo(self, review_id: str) -> DecisionsState:
        self._reviews.get(review_id)
        self._histories.undo(review_id)
        return self.state(review_id)

    def state(self, review_id: str) -> DecisionsState:
        return DecisionsState(
            self._histories.decisions(review_id), self._histories.can_undo(review_id)
        )

    def review(self, review_id: str) -> SendReview:
        """El borrador revisado, para volver a abrirlo."""
        return self._reviews.get(review_id)


@dataclass(frozen=True)
class CorrectionSources:
    reviews: SendReviewRepository
    decisions: DecisionRepository
    library: CaseFileLibrary


def accepted_fixes(review: SendReview, decisions: DecisionRepository) -> list[SendFix]:
    """Las correcciones de los problemas que el usuario marcó como error."""
    errors = {
        decision.alert_number
        for decision in decisions.list_for(review.id)
        if decision.kind is DecisionKind.ERROR
    }
    return [issue.fix for issue in review.issues if issue.number in errors and issue.fix]


class OpenCorrectedDraft:
    """«Abrir en el correo»: una copia del borrador con las correcciones aceptadas.

    Sin correcciones aceptadas, la copia es igual al original. El original nunca se modifica.
    """

    def __init__(
        self, sources: CorrectionSources, writer: DraftWriter, outbox: DraftOutbox
    ) -> None:
        self._sources = sources
        self._writer = writer
        self._outbox = outbox

    def execute(self, review_id: str) -> None:
        review = self._sources.reviews.get(review_id)
        corrections = self._corrections(review, accepted_fixes(review, self._sources.decisions))
        content = self._writer.corrected(self._sources.reviews.original_of(review_id), corrections)
        self._outbox.deliver(review_id, review.draft.file_name, content)

    def _corrections(self, review: SendReview, fixes: list[SendFix]) -> DraftCorrections:
        def targets(kind: SendFixKind) -> frozenset[str]:
            return frozenset(fix.target for fix in fixes if fix.kind is kind)

        added = [fix.replacement for fix in fixes if fix.replacement]
        session_id = review.session_id
        sources = (
            tuple(self._sources.library.content_of(session_id, name) for name in added)
            if session_id
            else ()
        )
        return DraftCorrections(
            targets(SendFixKind.REMOVE_RECIPIENT), targets(SendFixKind.REPLACE_ATTACHMENT), sources
        )
