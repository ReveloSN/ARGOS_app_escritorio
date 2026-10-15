import heapq
import itertools
from collections.abc import Iterable

from argus.domain.alert import Alert

type _HeapEntry = tuple[int, float, int, Alert]


class AlertQueue:
    """Cola de prioridad (heapq) de alertas: primero el riesgo, luego la confianza (CLAUDE.md §6).

    `heapq` es un montículo de mínimos, así que se guardan riesgo y confianza negados. El
    contador de llegada desempata y evita comparar alertas entre sí.
    """

    def __init__(self, alerts: Iterable[Alert] = ()) -> None:
        self._heap: list[_HeapEntry] = []
        self._arrival = itertools.count()
        for alert in alerts:
            self.push(alert)

    def __len__(self) -> int:
        return len(self._heap)

    def push(self, alert: Alert) -> None:
        entry = (-alert.risk.priority, -alert.confidence, next(self._arrival), alert)
        heapq.heappush(self._heap, entry)

    def pop(self) -> Alert:
        return heapq.heappop(self._heap)[-1]

    def drain(self) -> tuple[Alert, ...]:
        return tuple(self.pop() for _ in range(len(self._heap)))
