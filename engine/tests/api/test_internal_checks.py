from fastapi.testclient import TestClient

from tests.api.review_stream import post_review


def test_internal_checks_reach_the_review_with_one_or_two_values(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    review = post_review(client, auth_headers, "Borrador_contrato.txt")

    by_kind = {alert["differenceKind"]: alert for alert in review["alerts"]}
    words = by_kind["amount_in_words"]
    assert words["first"]["value"] == "$ 18.450.000"
    assert words["second"]["value"] == "dieciocho millones quinientos cuarenta mil"
    impossible = by_kind["impossible_date"]
    assert impossible["second"] is None
    assert impossible["highlightPositions"] == []
    assert impossible["explanation"][0]["key"] == "explanation.internal.impossible_date"
    assert by_kind["blank_field"]["risk"] == "medium"
