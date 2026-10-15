"""Value objects que se comparan entre documentos: inmutables y válidos desde su creación."""

import calendar
import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from argus.domain.errors import InvalidValueError

CURRENCY_CODE_PATTERN = re.compile(r"[A-Z]{3}")
CONTRACT_ID_PATTERN = re.compile(r"[A-Z0-9][A-Z0-9-]*")
DEFAULT_CURRENCY = "COP"
FIRST_MONTH = 1
LAST_MONTH = 12


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = DEFAULT_CURRENCY

    def __post_init__(self) -> None:
        if not self.amount.is_finite():
            raise InvalidValueError(
                f"El monto debe ser un número finito (recibido: {self.amount})."
            )
        if not CURRENCY_CODE_PATTERN.fullmatch(self.currency):
            raise InvalidValueError(f"La moneda debe ser un código ISO 4217: {self.currency!r}.")


@dataclass(frozen=True)
class ContractId:
    """Identificador ya normalizado: mayúsculas, dígitos y guiones, sin espacios ni prefijos."""

    value: str

    def __post_init__(self) -> None:
        if not CONTRACT_ID_PATTERN.fullmatch(self.value):
            raise InvalidValueError(f"Identificador de contrato no normalizado: {self.value!r}.")


@dataclass(frozen=True)
class Period:
    """Intervalo de fechas con ambos extremos incluidos."""

    start: date
    end: date

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise InvalidValueError(f"El periodo empieza ({self.start}) después de terminar.")

    @classmethod
    def month(cls, year: int, month: int) -> "Period":
        if not FIRST_MONTH <= month <= LAST_MONTH:
            raise InvalidValueError(f"El mes {month} no existe.")
        last_day = calendar.monthrange(year, month)[1]
        return cls(date(year, month, 1), date(year, month, last_day))

    def contains(self, day: date) -> bool:
        return self.start <= day <= self.end

    def overlaps(self, other: "Period") -> bool:
        return self.start <= other.end and other.start <= self.end
