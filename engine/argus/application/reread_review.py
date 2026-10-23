from argus.application.review_history import DiscardUnreviewedSession
from argus.application.review_progress import SILENT_PROGRESS, ReviewProgress
from argus.application.run_review import ReviewOutcome, ReviewRequest, ReviewRunner


class RereadReview:
    """Decorator de RunReview: con «Activar OCR» la revisión se lee de nuevo y la lectura
    anterior, aún sin revisar, se descarta solo cuando la nueva ya quedó guardada."""

    def __init__(self, run_review: ReviewRunner, discard: DiscardUnreviewedSession) -> None:
        self._run_review = run_review
        self._discard = discard

    def execute(
        self, request: ReviewRequest, progress: ReviewProgress = SILENT_PROGRESS
    ) -> ReviewOutcome:
        outcome = self._run_review.execute(request, progress)
        if request.replaces is not None:
            self._discard.execute(request.replaces)
        return outcome
