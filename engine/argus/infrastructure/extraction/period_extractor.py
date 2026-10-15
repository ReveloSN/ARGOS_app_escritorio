import re
from collections.abc import Iterator

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.domain.values import Period
from argus.infrastructure.extraction.spanish_calendar import MONTH_NAME_PATTERN, month_number

UNKNOWN_YEAR = "XXXX"
MONTH_PERIOD = re.compile(
    rf"\b(?P<month>{MONTH_NAME_PATTERN})\b(?:\s+(?:del?\s+)?(?P<year>\d{{4}})\b)?",
    re.IGNORECASE,
)
DURATION = re.compile(r"\b(?P<count>\d{1,3})\s+(?P<unit>mes(?:es)?|años?)\b", re.IGNORECASE)
MONTH_UNIT_PREFIX = "mes"


class PeriodExtractor:
    """Reconoce meses («junio 2026», «informe de junio») y duraciones («36 meses»).

    Un mes sin año se conserva con el año marcado como desconocido (XXXX-06): «el informe de
    junio» frente a un adjunto de mayo es justo la inconsistencia que ARGUS debe notar.
    Las duraciones se normalizan a ISO 8601 (P36M, P2Y).
    """

    def extract(self, text: str) -> Iterator[EntityMatch]:
        yield from (_month_match(match) for match in MONTH_PERIOD.finditer(text))
        yield from (_duration_match(match) for match in DURATION.finditer(text))


def _month_match(match: re.Match[str]) -> EntityMatch:
    month = month_number(match.group("month"))
    year = match.group("year")
    if year is None:
        normalized = f"{UNKNOWN_YEAR}-{month:02d}"
    else:
        normalized = Period.month(int(year), month).start.strftime("%Y-%m")
    return EntityMatch(EntityType.PERIOD, match.group(), normalized, match.start(), match.end())


def _duration_match(match: re.Match[str]) -> EntityMatch:
    unit = "M" if match.group("unit").lower().startswith(MONTH_UNIT_PREFIX) else "Y"
    normalized = f"P{int(match.group('count'))}{unit}"
    return EntityMatch(EntityType.PERIOD, match.group(), normalized, match.start(), match.end())
