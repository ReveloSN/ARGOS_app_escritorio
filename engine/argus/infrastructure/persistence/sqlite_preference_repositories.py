import json
import sqlite3
from datetime import datetime

from argus.domain.entity import EntityType
from argus.domain.preferences import ComparedCategory, UserPreferences
from argus.domain.sensitivity import Sensitivity
from argus.domain.suppression import SuppressedCase, SuppressionRule
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp

SENSITIVITY_KEY = "sensitivity"
CATEGORIES_KEY = "compared_categories"
RETENTION_KEY = "has_retention_limit"
RULE_COLUMNS = "id, entity_type, first_value, second_value, first_label, second_label, created_at"

type RuleRow = tuple[int, str, str, str, str, str, str]


class SqlitePreferencesRepository:
    """Ajustes como pares clave-valor: un ajuste nuevo no necesita cambiar el esquema."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def get(self) -> UserPreferences:
        with self._database.connect() as connection:
            stored = dict(connection.execute("SELECT key, value FROM preferences").fetchall())
        defaults = UserPreferences()
        return UserPreferences(
            sensitivity=Sensitivity(stored.get(SENSITIVITY_KEY, defaults.sensitivity)),
            compared_categories=_categories(stored.get(CATEGORIES_KEY))
            or defaults.compared_categories,
            has_retention_limit=json.loads(
                stored.get(RETENTION_KEY, json.dumps(defaults.has_retention_limit))
            ),
        )

    def save(self, preferences: UserPreferences) -> None:
        values = [
            (SENSITIVITY_KEY, str(preferences.sensitivity)),
            (CATEGORIES_KEY, json.dumps(sorted(preferences.compared_categories))),
            (RETENTION_KEY, json.dumps(preferences.has_retention_limit)),
        ]
        with self._database.connect() as connection:
            connection.executemany(
                "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)", values
            )


def _categories(stored: str | None) -> frozenset[ComparedCategory]:
    return frozenset(ComparedCategory(item) for item in json.loads(stored or "[]"))


class SqliteSuppressionRuleRepository:
    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def list_all(self) -> tuple[SuppressionRule, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                f"SELECT {RULE_COLUMNS} FROM suppression_rules ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return tuple(_to_rule(row) for row in rows)

    def add(self, case: SuppressedCase, created_at: datetime) -> SuppressionRule:
        key = (case.entity_type, case.first_value, case.second_value)
        with self._database.connect() as connection:
            connection.execute(
                "INSERT OR IGNORE INTO suppression_rules (entity_type, first_value, "
                "second_value, first_label, second_label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (*key, case.first_label, case.second_label, to_stored_timestamp(created_at)),
            )
            row = connection.execute(
                f"SELECT {RULE_COLUMNS} FROM suppression_rules "
                "WHERE entity_type = ? AND first_value = ? AND second_value = ?",
                key,
            ).fetchone()
        return _to_rule(row)

    def delete(self, rule_id: int) -> None:
        with self._database.connect() as connection:
            connection.execute("DELETE FROM suppression_rules WHERE id = ?", (rule_id,))


def _to_rule(row: sqlite3.Row | RuleRow) -> SuppressionRule:
    rule_id, entity_type, first, second, first_label, second_label, created_at = row
    case = SuppressedCase(EntityType(entity_type), first, second, first_label, second_label)
    return SuppressionRule(rule_id, case, from_stored_timestamp(created_at))
