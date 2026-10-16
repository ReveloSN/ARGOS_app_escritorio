"""Capas de IA de la Fase 7 sobre archivos reales, a través de la API."""

from fastapi.testclient import TestClient

from tests.api.review_stream import post_review
from tests.model_availability import requires_embedding_model

FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")


def test_every_alert_comes_with_its_explanation(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    alerts = post_review(client, auth_headers, *FILES)["alerts"]

    contract = next(alert for alert in alerts if alert["entityType"] == "contract_id")
    keys = [part["key"] for part in contract["explanation"]]
    assert keys[:2] == ["explanation.lead.contract_id", "explanation.cause.transposition"]
    assert contract["explanation"][1]["params"] in ({"a": "8", "b": "5"}, {"a": "5", "b": "8"})
    assert all(alert["explanation"] for alert in alerts)


def test_previous_decisions_adjust_the_confidence_of_similar_alerts(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    first = post_review(client, auth_headers, *FILES)
    contract = next(a for a in first["alerts"] if a["entityType"] == "contract_id")
    client.post(
        f"/reviews/{first['session']['id']}/decisions",
        headers=auth_headers,
        json={"alertNumber": contract["number"], "kind": "correct"},
    )

    again = post_review(client, auth_headers, *FILES)

    repeated = next(a for a in again["alerts"] if a["entityType"] == "contract_id")
    assert repeated["confidence"] < contract["confidence"]
    assert repeated["explanation"][-1] == {
        "key": "explanation.feedback",
        "params": {"errors": 0},
        "count": 1,
    }


@requires_embedding_model
def test_email_citing_june_with_a_may_attachment_is_a_high_alert(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    alerts = post_review(client, auth_headers, "Correo_remision_cliente.eml")["alerts"]

    referenced = next(a for a in alerts if a["differenceKind"] == "referenced_period")
    assert referenced["risk"] == "high"
    assert (referenced["first"]["value"], referenced["second"]["value"]) == ("junio", "mayo 2026")
    assert referenced["second"]["occurrences"][0]["document"] == "Anexo_2_tarifas.xlsx"
    assert referenced["explanation"][1]["key"] == "explanation.cause.referenced_period"
