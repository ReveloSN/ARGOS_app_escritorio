"""Repositorios y reloj en memoria: dobles de prueba de los puertos de persistencia."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path

from argus.application.ports.document_archive import ArchivedFile
from argus.domain.alert import Alert, NumberedAlert
from argus.domain.decision import Decision
from argus.domain.document import NamedFragment
from argus.domain.errors import ComparisonNotFoundError, SessionNotFoundError
from argus.domain.preferences import UserPreferences
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary
from argus.domain.review_session import ReviewSession
from argus.domain.suppression import SuppressedCase, SuppressionRule
from argus.domain.text_comparison.report import ComparisonReport
from argus.domain.text_search import fold_for_search

START = datetime(2026, 10, 13, 9, 42, tzinfo=UTC)


class SteppingClock:
    """Reloj que avanza un paso fijo en cada consulta, para medir duraciones de forma exacta."""

    def __init__(self, start: datetime = START, step: timedelta = timedelta(minutes=1)) -> None:
        self._current = start - step
        self._step = step

    def now(self) -> datetime:
        self._current += self._step
        return self._current


class InMemorySessionRepository:
    def __init__(self) -> None:
        self.sessions: dict[str, ReviewSession] = {}

    def save(self, session: ReviewSession) -> None:
        self.sessions[session.id] = session

    def get(self, session_id: str) -> ReviewSession:
        if session_id not in self.sessions:
            raise SessionNotFoundError(session_id)
        return self.sessions[session_id]

    def list_created_since(self, since: datetime) -> tuple[ReviewSession, ...]:
        return tuple(s for s in self.sessions.values() if s.created_at >= since)

    def list_created_before(self, moment: datetime) -> tuple[ReviewSession, ...]:
        return tuple(s for s in self.sessions.values() if s.created_at < moment)

    def delete(self, session_id: str) -> None:
        self.sessions.pop(session_id, None)


class InMemoryAlertRepository:
    def __init__(self) -> None:
        self.alerts: dict[str, tuple[NumberedAlert, ...]] = {}

    def save_all(self, session_id: str, alerts: Sequence[Alert]) -> tuple[NumberedAlert, ...]:
        numbered = tuple(NumberedAlert(n, alert) for n, alert in enumerate(alerts, start=1))
        self.alerts[session_id] = numbered
        return numbered

    def list_for(self, session_id: str) -> tuple[NumberedAlert, ...]:
        return self.alerts.get(session_id, ())


class InMemoryDecisionRepository:
    def __init__(self) -> None:
        self.decisions: dict[tuple[str, int], Decision] = {}

    def get(self, session_id: str, alert_number: int) -> Decision | None:
        return self.decisions.get((session_id, alert_number))

    def save(self, session_id: str, decision: Decision) -> None:
        self.decisions[(session_id, decision.alert_number)] = decision

    def delete(self, session_id: str, alert_number: int) -> None:
        self.decisions.pop((session_id, alert_number), None)

    def list_for(self, session_id: str) -> tuple[Decision, ...]:
        return tuple(d for (owner, _), d in sorted(self.decisions.items()) if owner == session_id)


class InMemoryDocumentRepository:
    def __init__(self) -> None:
        self.documents: dict[str, tuple[DocumentReadOutcome, ...]] = {}

    def save_all(self, session_id: str, documents: Sequence[DocumentReadOutcome]) -> None:
        self.documents[session_id] = tuple(documents)

    def list_for(self, session_id: str) -> tuple[ReadSummary, ...]:
        return tuple(outcome.summary for outcome in self.documents.get(session_id, ()))

    def position_of(self, session_id: str, document_name: str) -> int | None:
        return next(
            (
                position
                for position, outcome in enumerate(self.documents.get(session_id, ()))
                if document_name in _names_in(outcome)
            ),
            None,
        )

    def fragments_matching(
        self, session_id: str, folded_query: str, limit: int
    ) -> tuple[NamedFragment, ...]:
        fragments = [
            named
            for outcome in self.documents.get(session_id, ())
            if outcome.document is not None
            for named in outcome.document.named_fragments()
            if folded_query in fold_for_search(named.fragment.text)
        ]
        return tuple(fragments[:limit])


def _names_in(outcome: DocumentReadOutcome) -> set[str]:
    if outcome.document is None:
        return set()
    return {named.document_name for named in outcome.document.named_fragments()} | {outcome.name}


class InMemoryDocumentArchive:
    def __init__(self, root: Path = Path("archivo")) -> None:
        self.files: dict[tuple[str, int], ArchivedFile] = {}
        self._root = root

    def store(self, file: ArchivedFile) -> None:
        self.files[(file.session_id, file.position)] = file

    def path_of(self, session_id: str, position: int) -> Path | None:
        file = self.files.get((session_id, position))
        return None if file is None else self._root / session_id / file.source.name

    def delete_session(self, session_id: str) -> None:
        self.files = {key: file for key, file in self.files.items() if key[0] != session_id}


class RecordingFileOpener:
    def __init__(self) -> None:
        self.opened: list[Path] = []

    def open(self, path: Path) -> None:
        self.opened.append(path)


class InMemoryPreferencesRepository:
    def __init__(self, preferences: UserPreferences | None = None) -> None:
        self.preferences = preferences or UserPreferences()

    def get(self) -> UserPreferences:
        return self.preferences

    def save(self, preferences: UserPreferences) -> None:
        self.preferences = preferences


class InMemorySuppressionRuleRepository:
    def __init__(self) -> None:
        self.rules: list[SuppressionRule] = []

    def list_all(self) -> tuple[SuppressionRule, ...]:
        return tuple(reversed(self.rules))

    def add(self, case: SuppressedCase, created_at: datetime) -> SuppressionRule:
        existing = next((rule for rule in self.rules if rule.case == case), None)
        if existing is not None:
            return existing
        rule = SuppressionRule(len(self.rules) + 1, case, created_at)
        self.rules.append(rule)
        return rule

    def delete(self, rule_id: int) -> None:
        self.rules = [rule for rule in self.rules if rule.id != rule_id]


class InMemoryComparisonRepository:
    def __init__(self) -> None:
        self._reports: dict[str, ComparisonReport] = {}

    def save(self, report: ComparisonReport) -> None:
        self._reports[report.id] = report

    def get(self, comparison_id: str) -> ComparisonReport:
        try:
            return self._reports[comparison_id]
        except KeyError:
            raise ComparisonNotFoundError(comparison_id) from None
