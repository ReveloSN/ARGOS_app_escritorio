from argus.application.decision_history import DecisionHistories, DecisionRequest, DecisionsState
from argus.application.ports.repositories import ComparisonRepository
from argus.domain.errors import ComparisonItemNotFoundError


class ComparisonDecisions:
    """«Es correcto», «Es un error» e «Ignorar» sobre cada cambio o inconsistencia, con deshacer.

    Cambios e inconsistencias comparten la numeración de la comparación, así Ctrl Z deshace la
    última decisión, sea de una lista o de la otra.
    """

    def __init__(self, comparisons: ComparisonRepository, histories: DecisionHistories) -> None:
        self._comparisons = comparisons
        self._histories = histories

    def decide(self, comparison_id: str, request: DecisionRequest) -> DecisionsState:
        if not self._comparisons.get(comparison_id).has_item(request.alert_number):
            raise ComparisonItemNotFoundError(comparison_id, request.alert_number)
        self._histories.decide(comparison_id, request)
        return self.state(comparison_id)

    def undo(self, comparison_id: str) -> DecisionsState:
        self._comparisons.get(comparison_id)
        self._histories.undo(comparison_id)
        return self.state(comparison_id)

    def state(self, comparison_id: str) -> DecisionsState:
        return DecisionsState(
            self._histories.decisions(comparison_id), self._histories.can_undo(comparison_id)
        )
