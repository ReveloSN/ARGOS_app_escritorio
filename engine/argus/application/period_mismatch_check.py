import re
from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.send_checks import FoundIssue, SendContext, name_words
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendFix, SendFixKind, SendIssueKind
from argus.domain.text_search import fold_for_search

MONTH_PERIOD = re.compile(r"^(?:XXXX|\d{4})-\d{2}$")
UNKNOWN_YEAR = "XXXX"


def _same_period(mentioned: str, found: str) -> bool:
    """Mismo mes; el año solo cuenta si los dos lo dicen («junio» vale para junio de 2026)."""
    mentioned_year, mentioned_month = mentioned.split("-")
    found_year, found_month = found.split("-")
    years_match = UNKNOWN_YEAR in (mentioned_year, found_year) or mentioned_year == found_year
    return mentioned_month == found_month and years_match


class PeriodMismatchCheck:
    """«Le comparto el informe de junio» con el informe de mayo adjunto (caso guía, CLAUDE.md §1)."""

    def __init__(self, pipeline: EntityExtractionPipeline) -> None:
        self._pipeline = pipeline

    def find(self, context: SendContext) -> Iterator[FoundIssue]:
        attached = self._attachment_periods(context)
        if not attached:
            return
        for raw, period in self._periods(context.content.draft.body):
            if not any(_same_period(period, found) for found in attached.values()):
                yield self._issue(context, raw, (period, next(iter(attached))))

    def _periods(self, text: str) -> list[tuple[str, str]]:
        return [
            (match.raw_value, match.normalized_value)
            for match in self._pipeline.matches(text)
            if match.type is EntityType.PERIOD and MONTH_PERIOD.match(match.normalized_value)
        ]

    def _attachment_periods(self, context: SendContext) -> dict[str, str]:
        found = {}
        for attachment in context.content.attachments:
            texts = [name_words(attachment.name), *(f.text for f in attachment.fragments)]
            period = next((p for text in texts for _, p in self._periods(text)), None)
            if period is not None:
                found[attachment.name] = period
        return found

    def _issue(self, context: SendContext, raw: str, found: tuple[str, str]) -> FoundIssue:
        period, attachment = found
        suggestion = self._replacement(context, attachment, period)
        fix = (
            SendFix(SendFixKind.REPLACE_ATTACHMENT, attachment, suggestion) if suggestion else None
        )
        marked = re.search(rf"(?:[^\W\d_]+\s+de\s+)?{re.escape(raw)}", context.content.draft.body)
        params = {"mentioned": raw, "attached": attachment, "suggested": suggestion}
        text = marked.group() if marked else raw
        return FoundIssue(
            SendIssueKind.PERIOD_MISMATCH, RiskLevel.HIGH, DraftPart.BODY, text, params, fix
        )

    def _replacement(self, context: SendContext, attachment: str, period: str) -> str:
        """El documento del expediente con el mismo nombre que el adjunto pero del periodo citado."""
        stem = self._without_periods(attachment)
        return next(
            (
                name
                for name in context.case_documents
                if self._without_periods(name) == stem
                and any(_same_period(period, found) for _, found in self._periods(name_words(name)))
            ),
            "",
        )

    def _without_periods(self, name: str) -> str:
        text = name_words(name)
        for raw, _ in self._periods(text):
            text = text.replace(raw, "")
        return " ".join(fold_for_search(re.sub(r"\d{4}", "", text)).split())
