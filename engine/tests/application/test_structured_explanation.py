import json

import pytest

from argus.application.text_comparison.structured_explanation import (
    ExplanationStructure,
    parse_structured_explanation,
)

FULL = {
    "summary": "En la versión nueva falta una condición.",
    "what_changed": "Se quitó la frase sobre datos mínimos.",
    "why_it_matters": "Sin ella ya no se exige esa información.",
    "what_to_do": "Pregunte si la omisión fue intencional.",
    "detail": "La cláusula original exigía datos mínimos obligatorios; la nueva no.",
}


def test_a_complete_json_answer_becomes_a_structure() -> None:
    structure = parse_structured_explanation(json.dumps(FULL))

    assert structure == ExplanationStructure(
        FULL["summary"],
        FULL["what_changed"],
        FULL["why_it_matters"],
        FULL["what_to_do"],
        FULL["detail"],
    )


@pytest.mark.parametrize(
    "wrap",
    [
        "```json\n{body}\n```",
        "Aquí está la respuesta:\n{body}\nEspero que sirva.",
    ],
)
def test_the_json_is_found_even_if_the_model_wraps_it(wrap: str) -> None:
    structure = parse_structured_explanation(wrap.format(body=json.dumps(FULL)))

    assert structure is not None
    assert structure.summary == FULL["summary"]


def test_without_a_detail_the_other_sentences_are_the_long_text() -> None:
    answer = {key: value for key, value in FULL.items() if key != "detail"}

    structure = parse_structured_explanation(json.dumps(answer))

    assert structure is not None
    assert structure.detail == " ".join(answer.values())


@pytest.mark.parametrize(
    "raw",
    [
        "Cambia el número del contrato.",
        "{no es json}",
        json.dumps({"summary": "Solo una clave"}),
        json.dumps({**FULL, "summary": ""}),
        json.dumps({**FULL, "what_to_do": 3}),
        json.dumps(["no", "es", "un", "objeto"]),
    ],
)
def test_anything_else_is_plain_text_and_has_no_structure(raw: str) -> None:
    assert parse_structured_explanation(raw) is None
