from enum import StrEnum


class RiskLevel(StrEnum):
    """Niveles de CLAUDE.md §7: alto (montos, identificadores, fechas), medio (nombres), bajo (formato)."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    @property
    def priority(self) -> int:
        return _PRIORITY[self]


_PRIORITY = {RiskLevel.HIGH: 3, RiskLevel.MEDIUM: 2, RiskLevel.LOW: 1}
