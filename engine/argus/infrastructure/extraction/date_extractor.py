import re
from collections.abc import Iterator
from datetime import date

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.infrastructure.extraction.spanish_calendar import MONTH_NAME_PATTERN, month_number

# El orden día/mes es el de Colombia; cuando exista la configuración regional se inyectará.
DAY_MONTH_YEAR = re.compile(r"\b(?P<day>\d{1,2})/(?P<month>\d{1,2})/(?P<year>\d{4})\b")
ISO_DATE = re.compile(r"\b(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})\b")
LONG_DATE = re.compile(
    rf"\b(?P<day>\d{{1,2}})\s+de\s+(?P<month>{MONTH_NAME_PATTERN})\s+(?:del?\s+)?(?P<year>\d{{4}})\b",
    re.IGNORECASE,
)
DATE_PATTERNS = (DAY_MONTH_YEAR, ISO_DATE, LONG_DATE)


class DateExtractor:
    """Reconoce fechas completas (día, mes y año) y las normaliza a ISO 8601."""

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for pattern in DATE_PATTERNS:
            yield from _dates_in(pattern, text)


def _dates_in(pattern: re.Pattern[str], text: str) -> Iterator[EntityMatch]:
    for match in pattern.finditer(text):
        parsed = _parse_date(match)
        if parsed is not None:
            yield EntityMatch(
                EntityType.DATE, match.group(), parsed.isoformat(), match.start(), match.end()
            )


def _parse_date(match: re.Match[str]) -> date | None:
    try:
        month = month_number(match.group("month"))
        return date(int(match.group("year")), month, int(match.group("day")))
    except ValueError:
        return None
