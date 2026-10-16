from collections import defaultdict

from argus.domain.comparison.difference import DifferenceKind
from argus.domain.decision import DecisionKind
from argus.domain.entity import EntityType
from argus.domain.feedback import FeedbackCount, FeedbackCounts, FeedbackKey
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase

# El tipo de diferencia vive en el JSON de la alerta; SQLite lo lee con json_extract.
COUNTS_QUERY = """
    SELECT alerts.entity_type, json_extract(alerts.payload, '$.difference.kind'),
           decisions.kind, COUNT(*)
    FROM decisions
    JOIN alerts ON alerts.session_id = decisions.session_id
               AND alerts.number = decisions.alert_number
    GROUP BY 1, 2, 3
"""


class SqliteDecisionStatistics:
    """Cuántas alertas de cada tipo marcó el usuario como error real y cuántas descartó."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def counts_by_kind(self) -> FeedbackCounts:
        with self._database.connect() as connection:
            rows = connection.execute(COUNTS_QUERY).fetchall()
        errors: defaultdict[FeedbackKey, int] = defaultdict(int)
        dismissed: defaultdict[FeedbackKey, int] = defaultdict(int)
        for entity_type, difference_kind, decision_kind, count in rows:
            key = (EntityType(entity_type), DifferenceKind(difference_kind))
            target = errors if decision_kind == DecisionKind.ERROR else dismissed
            target[key] += count
        return {key: FeedbackCount(errors[key], dismissed[key]) for key in {*errors, *dismissed}}
