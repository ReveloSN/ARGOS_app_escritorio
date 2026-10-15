from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime:
        """Fecha y hora actuales, con zona horaria."""
        ...
