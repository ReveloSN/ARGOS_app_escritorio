from datetime import datetime
from typing import Protocol

from argus.domain.preferences import UserPreferences
from argus.domain.suppression import SuppressedCase, SuppressionRule


class PreferencesRepository(Protocol):
    def get(self) -> UserPreferences:
        """Los ajustes guardados, o los predeterminados si el usuario nunca los cambió."""
        ...

    def save(self, preferences: UserPreferences) -> None: ...


class SuppressionRuleRepository(Protocol):
    def list_all(self) -> tuple[SuppressionRule, ...]:
        """Las reglas, de la más reciente a la más antigua."""
        ...

    def add(self, case: SuppressedCase, created_at: datetime) -> SuppressionRule:
        """Guarda el caso; si ya existía, devuelve la regla que ya estaba."""
        ...

    def delete(self, rule_id: int) -> None: ...
