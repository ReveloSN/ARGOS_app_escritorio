from argus.application.alert_explanation import AlertExplainer
from argus.application.ports.repositories import AlertRepository
from argus.application.text_comparison.change_explanation import (
    ChangeExplainer,
    ChangeExplanation,
    ExplanationRequest,
)
from argus.domain.errors import AlertNotFoundError


class ExplainAlert:
    """Caso de uso: «Explicar esta alerta» de una revisión guardada, en el idioma pedido.

    Usa el mismo explicador que «Explicar este cambio»: la misma IA opcional, la misma clave y
    el mismo consentimiento. La explicación local es la que ya acompaña a la alerta.
    """

    def __init__(
        self, alerts: AlertRepository, template: AlertExplainer, explainer: ChangeExplainer
    ) -> None:
        self._alerts = alerts
        self._template = template
        self._explainer = explainer

    def execute(self, session_id: str, number: int, locale: str) -> ChangeExplanation:
        numbered = self._alerts.list_for(session_id)
        alert = next((item.alert for item in numbered if item.number == number), None)
        if alert is None:
            raise AlertNotFoundError(session_id, number)
        (template,) = self._template.explain([alert])
        return self._explainer.explain(ExplanationRequest.for_alert(alert, template, locale))
