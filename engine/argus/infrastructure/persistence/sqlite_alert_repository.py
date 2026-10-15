from collections.abc import Sequence

from argus.domain.alert import Alert, NumberedAlert
from argus.infrastructure.persistence.alert_serialization import alert_from_json, alert_to_json
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase

FIRST_ALERT_NUMBER = 1


class SqliteAlertRepository:
    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def save_all(self, session_id: str, alerts: Sequence[Alert]) -> tuple[NumberedAlert, ...]:
        numbered = tuple(
            NumberedAlert(number, alert)
            for number, alert in enumerate(alerts, start=FIRST_ALERT_NUMBER)
        )
        rows = [
            (
                session_id,
                item.number,
                item.alert.entity_type,
                item.alert.risk,
                alert_to_json(item.alert),
            )
            for item in numbered
        ]
        with self._database.connect() as connection:
            connection.execute("DELETE FROM alerts WHERE session_id = ?", (session_id,))
            connection.executemany(
                "INSERT INTO alerts (session_id, number, entity_type, risk, payload) "
                "VALUES (?, ?, ?, ?, ?)",
                rows,
            )
        return numbered

    def list_for(self, session_id: str) -> tuple[NumberedAlert, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT number, payload FROM alerts WHERE session_id = ? ORDER BY number",
                (session_id,),
            ).fetchall()
        return tuple(NumberedAlert(number, alert_from_json(payload)) for number, payload in rows)
