from dataclasses import dataclass
from typing import Any

from fastapi.testclient import TestClient

from tests.api.review_stream import parse_events, upload

VERSION_1 = """CONTRATO DE ARRENDAMIENTO No. 4857

CLÁUSULA PRIMERA. OBJETO. Se entrega la bodega de Fontibón.

CLÁUSULA SEGUNDA. CANON. El canon mensual es de $ 18.450.000.

CLÁUSULA TERCERA. CESIÓN. Las partes podrán ceder el contrato.
"""
VERSION_2 = """CONTRATO DE ARRENDAMIENTO No. 4587

CLÁUSULA PRIMERA. OBJETO. Se entrega la bodega de Fontibón.

CLÁUSULA SEGUNDA. CANON. El canon mensual es de $ 18.540.000.

CLÁUSULA TERCERA. CESIÓN. Las partes no podrán ceder el contrato.
"""


def text_file(name: str, text: str) -> tuple[str, tuple[str, bytes]]:
    return ("files", (name, text.encode("utf-8")))


@dataclass(frozen=True)
class ComparisonUpload:
    mode: str
    files: list[Any]


def post_comparison(
    client: TestClient, headers: dict[str, str], comparison: ComparisonUpload
) -> list[tuple[str, dict[str, Any]]]:
    response = client.post(
        "/comparisons",
        headers=headers,
        data={"name": "Arrendamiento Fontibón", "mode": comparison.mode},
        files=comparison.files,
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    return parse_events(response.text)


def test_two_versions_stream_their_progress_and_end_with_every_change(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    files = [text_file("v1.txt", VERSION_1), text_file("v2.txt", VERSION_2)]

    events = post_comparison(client, auth_headers, ComparisonUpload("versions", files))

    names = [name for name, _ in events]
    assert names[:5] == [
        "document_started",
        "document_finished",
        "document_started",
        "document_finished",
        "analysis_started",
    ]
    assert names[-2:] == ["pair_compared", "comparison"]
    comparison = events[-1][1]
    (pair,) = comparison["pairs"]
    materialities = [change["materialities"] for change in pair["changes"]]
    assert materialities == [["number"], ["amount"], ["negation"]]
    assert {change["risk"] for change in pair["changes"]} == {"high"}
    assert comparison["summary"]["byKind"]["modified"] == 3
    assert [change["number"] for change in pair["changes"]] == [1, 2, 3]


def test_each_change_keeps_its_origin_and_the_spans_of_its_diff(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    files = [text_file("v1.txt", VERSION_1), text_file("v2.txt", VERSION_2)]

    comparison = post_comparison(client, auth_headers, ComparisonUpload("versions", files))[-1][1]

    change = comparison["pairs"][0]["changes"][0]
    assert change["first"]["document"] == "v1.txt"
    assert change["second"]["location"] == {"kind": "line", "line": 1}
    (edit,) = change["edits"]
    second_text = change["second"]["text"]
    assert second_text[edit["second"]["start"] : edit["second"]["end"]] == "4587"
    assert edit["firstText"] == "4857"


def test_a_saved_comparison_opens_again_by_its_id(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    files = [text_file("v1.txt", VERSION_1), text_file("v2.txt", VERSION_2)]
    created = post_comparison(client, auth_headers, ComparisonUpload("versions", files))[-1][1]

    response = client.get(f"/comparisons/{created['id']}", headers=auth_headers)

    assert response.json() == created


def test_an_email_is_compared_with_its_attachments(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    email = ComparisonUpload("email_attachment", [upload("Correo_remision_cliente.eml")])

    events = post_comparison(client, auth_headers, email)

    comparison = events[-1][1]
    assert comparison["mode"] == "email_attachment"
    assert comparison["pairs"]
    assert {pair["firstDocument"] for pair in comparison["pairs"]} == {
        "Correo_remision_cliente.eml"
    }


def test_a_mode_rejects_fewer_files_than_it_needs(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/comparisons",
        headers=auth_headers,
        data={"name": "Arrendamiento", "mode": "versions"},
        files=[text_file("v1.txt", VERSION_1)],
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "not_enough_documents"}


def test_an_unknown_mode_or_comparison_is_rejected(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    unknown_mode = client.post(
        "/comparisons",
        headers=auth_headers,
        data={"name": "Arrendamiento", "mode": "todo"},
        files=[text_file("v1.txt", VERSION_1), text_file("v2.txt", VERSION_2)],
    )
    unknown_id = client.get("/comparisons/no-existe", headers=auth_headers)

    assert unknown_mode.status_code == 422
    assert unknown_id.status_code == 404
    assert unknown_id.json() == {"detail": "comparison_not_found"}
