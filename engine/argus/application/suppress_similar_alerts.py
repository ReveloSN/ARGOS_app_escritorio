from argus.application.ports.clock import Clock
from argus.application.ports.preferences import SuppressionRuleRepository
from argus.application.ports.repositories import AlertRepository
from argus.domain.errors import AlertNotFoundError
from argus.domain.suppression import SuppressedCase, SuppressionRule


class SuppressSimilarAlerts:
    """«No alertar casos similares»: el par de valores de la alerta deja de generar alertas.

    Vale desde la siguiente revisión; la alerta actual queda como está para que el usuario la
    decida. La regla se puede quitar en Ajustes > Detección.
    """

    def __init__(
        self, alerts: AlertRepository, rules: SuppressionRuleRepository, clock: Clock
    ) -> None:
        self._alerts = alerts
        self._rules = rules
        self._clock = clock

    def execute(self, session_id: str, alert_number: int) -> SuppressionRule:
        alert = next(
            (
                item.alert
                for item in self._alerts.list_for(session_id)
                if item.number == alert_number
            ),
            None,
        )
        if alert is None:
            raise AlertNotFoundError(session_id, alert_number)
        return self._rules.add(SuppressedCase.from_alert(alert), self._clock.now())
