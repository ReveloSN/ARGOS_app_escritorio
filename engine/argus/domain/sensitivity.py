from dataclasses import dataclass
from enum import StrEnum


@dataclass(frozen=True)
class DetectionPolicy:
    """Umbrales que cambian con la sensibilidad elegida en Ajustes > Detección."""

    max_identifier_edits: int
    min_name_similarity: float
    compares_years: bool
    reports_format_differences: bool


class Sensitivity(StrEnum):
    STRICT = "strict"
    BALANCED = "balanced"
    PERMISSIVE = "permissive"

    @property
    def policy(self) -> DetectionPolicy:
        return _POLICY_BY_SENSITIVITY[self]


# Equilibrada, según el texto de los mockups: «No alerta diferencias solo de formato».
_POLICY_BY_SENSITIVITY = {
    Sensitivity.STRICT: DetectionPolicy(
        2, 0.7, compares_years=True, reports_format_differences=True
    ),
    Sensitivity.BALANCED: DetectionPolicy(
        1, 0.8, compares_years=False, reports_format_differences=False
    ),
    Sensitivity.PERMISSIVE: DetectionPolicy(
        1, 0.9, compares_years=False, reports_format_differences=False
    ),
}

DEFAULT_SENSITIVITY = Sensitivity.BALANCED
