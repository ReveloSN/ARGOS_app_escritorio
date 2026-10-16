from pathlib import Path

from fastapi.testclient import TestClient

from tests.api.review_stream import post_review

FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
ALL_CATEGORIES = ["amounts", "dates", "identifiers", "names", "periods"]


def test_defaults_compare_everything_and_show_the_history_folder(
    client: TestClient, auth_headers: dict[str, str], tmp_path: Path
) -> None:
    body = client.get("/preferences", headers=auth_headers).json()

    assert body == {
        "sensitivity": "balanced",
        "comparedCategories": ALL_CATEGORIES,
        "hasRetentionLimit": True,
        "historyFolder": str(tmp_path),
        "suppressionRules": [],
    }


def test_saved_preferences_change_the_next_review(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.put(
        "/preferences",
        headers=auth_headers,
        json={
            "sensitivity": "strict",
            "comparedCategories": ["amounts"],
            "hasRetentionLimit": False,
        },
    )

    assert response.json()["comparedCategories"] == ["amounts"]
    alerts = post_review(client, auth_headers, *FILES)["alerts"]
    assert alerts
    assert {alert["entityType"] for alert in alerts} == {"money"}


def test_at_least_one_type_must_be_compared(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.put(
        "/preferences",
        headers=auth_headers,
        json={"sensitivity": "balanced", "comparedCategories": [], "hasRetentionLimit": True},
    )

    assert response.status_code == 422


def test_suppressed_cases_stop_generating_alerts_until_removed(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session_id = post_review(client, auth_headers, *FILES)["session"]["id"]

    rule = client.post(
        "/suppression-rules",
        headers=auth_headers,
        json={"sessionId": session_id, "alertNumber": 1},
    ).json()
    suppressed = post_review(client, auth_headers, *FILES)["alerts"]
    deleted = client.delete(f"/suppression-rules/{rule['id']}", headers=auth_headers)
    restored = post_review(client, auth_headers, *FILES)["alerts"]

    assert (rule["entityType"], rule["firstLabel"], rule["secondLabel"]) == (
        "contract_id",
        "4587",
        "4857",
    )
    assert all(alert["entityType"] != "contract_id" for alert in suppressed)
    assert deleted.status_code == 204
    assert restored[0]["entityType"] == "contract_id"


def test_suppressing_an_unknown_alert_is_reported(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/suppression-rules",
        headers=auth_headers,
        json={"sessionId": "no-existe", "alertNumber": 1},
    )

    assert response.status_code == 404
