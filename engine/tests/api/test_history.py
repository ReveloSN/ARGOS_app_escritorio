from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from argus.api.composition import DATABASE_FILE_NAME, build_engine_services, build_review_storage
from argus.domain.preferences import UserPreferences
from argus.domain.review_session import NewReviewSession, ReviewSession
from tests.api.review_stream import REVIEW_NAME, post_review
from tests.application.in_memory_repositories import RecordingFileOpener

FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")


def test_history_lists_sessions_with_their_progress_and_the_metrics(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = post_review(client, auth_headers, *FILES)
    session_id = review["session"]["id"]
    client.post(
        f"/reviews/{session_id}/decisions",
        headers=auth_headers,
        json={"alertNumber": 1, "kind": "error"},
    )
    client.post(f"/reviews/{session_id}/close", headers=auth_headers)

    body = client.get("/history", params={"days": 30}, headers=auth_headers).json()

    (session,) = body["sessions"]
    assert session["name"] == REVIEW_NAME
    assert session["status"] == "closed"
    assert session["documentCount"] == 2
    assert session["alertCount"] == len(review["alerts"])
    assert session["decidedCount"] == 1
    assert body["metrics"]["sessionCount"] == 1
    assert body["metrics"]["resolvedAlerts"] == 1
    assert body["metrics"]["realErrorRate"] == 1.0
    assert body["metrics"]["meanReviewSeconds"] >= 0


def test_metrics_without_data_are_unknown_not_zero(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    metrics = client.get("/history", headers=auth_headers).json()["metrics"]

    assert metrics["realErrorRate"] is None
    assert metrics["meanReviewSeconds"] is None


def test_records_list_every_alert_with_its_decision(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = post_review(client, auth_headers, *FILES)
    client.post(
        f"/reviews/{review['session']['id']}/decisions",
        headers=auth_headers,
        json={"alertNumber": 1, "kind": "ignored"},
    )

    records = client.get("/history/records", headers=auth_headers).json()

    assert len(records) == len(review["alerts"])
    assert records[0]["decision"] == "ignored"
    assert records[0]["sessionName"] == REVIEW_NAME
    assert {records[0]["firstValue"], records[0]["secondValue"]} == {"4857", "4587"}
    assert all(record["decision"] is None for record in records[1:])


def test_the_period_must_be_at_least_one_day(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    assert client.get("/history", params={"days": 0}, headers=auth_headers).status_code == 422


def store_old_session(data_directory: Path) -> ReviewSession:
    storage = build_review_storage(data_directory / DATABASE_FILE_NAME)
    created = datetime.now(UTC) - timedelta(days=120)
    session = ReviewSession.start(NewReviewSession("Antigua", ("a.pdf",), 0), created)
    storage.sessions.save(session)
    return session


def test_reviews_older_than_90_days_are_deleted_at_startup(tmp_path: Path) -> None:
    store_old_session(tmp_path)

    services = build_engine_services(tmp_path, RecordingFileOpener())

    assert services.storage.sessions.list_created_before(datetime.now(UTC)) == ()


def test_without_retention_limit_the_history_is_kept(tmp_path: Path) -> None:
    session = store_old_session(tmp_path)
    storage = build_review_storage(tmp_path / DATABASE_FILE_NAME)
    storage.preferences.save(UserPreferences(has_retention_limit=False))

    services = build_engine_services(tmp_path, RecordingFileOpener())

    assert services.storage.sessions.get(session.id) == session
