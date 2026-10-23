from dataclasses import dataclass
from typing import Any

from fastapi.testclient import TestClient
from httpx2 import Response

from tests.api.review_stream import post_review

FILES = ("Contrato_4857_v3.pdf", "Anexo_1_condiciones.docx")
CONTRACT = {"label": "Número de contrato", "entityType": "contract_id", "value": "4857"}


@dataclass(frozen=True)
class CaseFile:
    client: TestClient
    headers: dict[str, str]
    session_id: str

    def post(self, path: str, body: dict[str, str] | None = None) -> Response:
        url = f"/reviews/{self.session_id}/facts{path}"
        return self.client.post(url, headers=self.headers, json=body)

    def facts(self) -> dict[str, Any]:
        url = f"/reviews/{self.session_id}/facts"
        return dict(self.client.get(url, headers=self.headers).json())


def case_file(client: TestClient, headers: dict[str, str]) -> CaseFile:
    return CaseFile(client, headers, post_review(client, headers, *FILES)["session"]["id"])


def test_a_new_review_has_no_facts_and_its_alerts_are_pending(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    body = case_file(client, auth_headers).facts()

    assert body["facts"] == []
    assert body["canUndo"] is False
    assert {"entityType": "contract_id", "values": ["4587", "4857"]} in body["pending"]


def test_confirming_the_contract_number_marks_the_document_that_contradicts_it(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = case_file(client, auth_headers)

    response = review.post("", CONTRACT)

    assert response.status_code == 200
    (fact,) = response.json()["facts"]
    assert fact["value"] == "4857"
    assert fact["retiredAt"] is None
    assert {item["document"] for item in fact["appearances"]} == {"Contrato_4857_v3.pdf"}
    (contradiction,) = fact["contradictions"]
    assert contradiction["value"] == "4587"
    assert contradiction["risk"] == "high"
    assert contradiction["occurrences"][0]["document"] == "Anexo_1_condiciones.docx"
    assert response.json()["canUndo"] is True


def test_editing_retiring_restoring_and_undoing(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = case_file(client, auth_headers)
    fact_id = review.post("", CONTRACT).json()["facts"][0]["id"]
    url = f"/reviews/{review.session_id}/facts/{fact_id}"

    edited = client.put(url, headers=auth_headers, json={"value": "4587"}).json()
    retired = review.post(f"/{fact_id}/retire").json()
    restored = review.post(f"/{fact_id}/restore").json()
    undone = review.post("/undo").json()

    assert edited["facts"][0]["value"] == "4587"
    assert retired["facts"][0]["retiredAt"] is not None
    assert retired["facts"][0]["contradictions"] == []
    assert restored["facts"][0]["retiredAt"] is None
    assert undone["facts"][0]["retiredAt"] is not None


def test_a_value_that_is_not_of_the_chosen_type_is_explained(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = case_file(client, auth_headers)

    response = review.post("", {**CONTRACT, "entityType": "money", "value": "pendiente"})

    assert response.status_code == 422
    assert response.json() == {"detail": "unrecognized_fact_value"}


def test_an_unknown_fact_is_not_found(client: TestClient, auth_headers: dict[str, str]) -> None:
    review = case_file(client, auth_headers)

    response = review.post("/99/retire")

    assert response.status_code == 404
    assert response.json() == {"detail": "fact_not_found"}
