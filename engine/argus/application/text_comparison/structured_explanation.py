"""La explicación de la IA en cuatro bloques cortos más un texto largo.

El modelo responde un objeto JSON; si no lo hace (o falta alguna parte), la respuesta se
trata como texto libre y los bloques se llenan con la plantilla local.
"""

import json
from dataclasses import dataclass

SUMMARY = "summary"
WHAT_CHANGED = "what_changed"
WHY_IT_MATTERS = "why_it_matters"
WHAT_TO_DO = "what_to_do"
DETAIL = "detail"
REQUIRED_KEYS = (SUMMARY, WHAT_CHANGED, WHY_IT_MATTERS, WHAT_TO_DO)
SENTENCE_SEPARATOR = " "


@dataclass(frozen=True)
class ExplanationStructure:
    summary: str
    what_changed: str
    why_it_matters: str
    what_to_do: str
    # El texto largo de «Ver detalle».
    detail: str


def _json_object(raw: str) -> dict[str, object] | None:
    """El primer objeto JSON de la respuesta, aunque venga entre comillas de código o texto."""
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        value = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None


def _text(value: object) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def parse_structured_explanation(raw: str) -> ExplanationStructure | None:
    answer = _json_object(raw)
    if answer is None:
        return None
    texts = [_text(answer.get(key)) for key in REQUIRED_KEYS]
    if None in texts:
        return None
    summary, what_changed, why_it_matters, what_to_do = (text or "" for text in texts)
    detail = _text(answer.get(DETAIL)) or SENTENCE_SEPARATOR.join(
        (summary, what_changed, why_it_matters, what_to_do)
    )
    return ExplanationStructure(summary, what_changed, why_it_matters, what_to_do, detail)
