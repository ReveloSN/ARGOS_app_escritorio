from typing import Protocol

from argus.domain.read_outcome import DocumentReadOutcome


class ReviewProgress(Protocol):
    """Observer: cómo avanza la lectura y el análisis, para mostrarlo archivo por archivo."""

    def document_started(self, position: int, name: str) -> None: ...

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None: ...

    def analysis_started(self) -> None: ...


class SilentReviewProgress:
    """Para revisiones que nadie observa: no avisa nada."""

    def document_started(self, position: int, name: str) -> None:
        pass

    def document_finished(self, position: int, outcome: DocumentReadOutcome) -> None:
        pass

    def analysis_started(self) -> None:
        pass


SILENT_PROGRESS = SilentReviewProgress()
