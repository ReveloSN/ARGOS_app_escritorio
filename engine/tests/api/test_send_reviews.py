from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from typing import Any

from fastapi.testclient import TestClient

from tests.api.review_stream import post_review
from tests.application.in_memory_repositories import RecordingFileOpener


def draft_email() -> bytes:
    message = EmailMessage()
    message["From"] = "laura.martinez@example.com"
    message["To"] = "cliente@example.com"
    message["Cc"] = "contabilidad@inmobiliariaprisma.co"
    message["Subject"] = "Informe de junio"
    message.set_content("Le comparto el informe de junio y adjunto también la póliza.")
    message.add_attachment(
        "Informe de gestión".encode(),
        maintype="text",
        subtype="plain",
        filename="Informe_gestion_mayo_2026.txt",
    )
    return message.as_bytes()


def review_draft(client: TestClient, headers: dict[str, str], session_id: str) -> dict[str, Any]:
    files = {"file": ("Remision.eml", draft_email(), "message/rfc822")}
    response = client.post(
        "/send-reviews", headers=headers, data={"sessionId": session_id}, files=files
    )
    assert response.status_code == 200, response.text
    return dict(response.json())


def test_reviews_a_draft_against_the_open_case_file(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    session = post_review(client, auth_headers, "Correo_remision_cliente.eml")["session"]

    review = review_draft(client, auth_headers, session["id"])

    assert review["draft"]["cc"] == ["contabilidad@inmobiliariaprisma.co"]
    assert [issue["kind"] for issue in review["issues"]] == [
        "period_mismatch",
        "missing_attachment",
        "foreign_recipient",
    ]
    recipient = review["issues"][2]
    assert recipient["part"] == "cc"
    assert recipient["fix"] == {
        "kind": "remove_recipient",
        "target": "contabilidad@inmobiliariaprisma.co",
        "replacement": "",
    }
    reopened = client.get(f"/send-reviews/{review['id']}", headers=auth_headers).json()
    assert reopened["issues"] == review["issues"]


def test_the_corrected_copy_opens_in_the_mail_client_without_the_removed_recipient(
    client: TestClient, auth_headers: dict[str, str], opener: RecordingFileOpener
) -> None:
    session = post_review(client, auth_headers, "Correo_remision_cliente.eml")["session"]
    review = review_draft(client, auth_headers, session["id"])
    url = f"/send-reviews/{review['id']}"

    decided = client.post(
        f"{url}/decisions", headers=auth_headers, json={"number": 3, "kind": "error"}
    )
    opened = client.post(f"{url}/open", headers=auth_headers)

    assert decided.json()["canUndo"] is True
    assert opened.status_code == 204
    (path,) = opener.opened
    copy = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    assert copy["Cc"] is None
    undone = client.post(f"{url}/decisions/undo", headers=auth_headers).json()
    assert undone == {"decisions": [], "canUndo": False}


def test_only_an_email_draft_can_be_reviewed(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    files = {"file": ("Contrato.docx", b"PK", "application/octet-stream")}

    response = client.post("/send-reviews", headers=auth_headers, files=files)

    assert response.status_code == 422
    assert response.json() == {"detail": "not_a_draft_email"}


def test_an_unknown_draft_review_or_problem_is_not_found(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    missing = client.get("/send-reviews/no-existe", headers=auth_headers)
    session = post_review(client, auth_headers, "Correo_remision_cliente.eml")["session"]
    review = review_draft(client, auth_headers, session["id"])
    unknown = client.post(
        f"/send-reviews/{review['id']}/decisions",
        headers=auth_headers,
        json={"number": 9, "kind": "correct"},
    )

    assert missing.json() == {"detail": "send_review_not_found"}
    assert unknown.status_code == 404
    assert unknown.json() == {"detail": "send_issue_not_found"}
