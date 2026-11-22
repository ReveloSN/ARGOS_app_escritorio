"""Lectura prudente del JSON que llega de fuera: Supabase, el llavero y el archivo empaquetado."""

import json
from collections.abc import Mapping

type Json = Mapping[str, object]


def parse_json_object(text: str | bytes) -> Json | None:
    try:
        value = json.loads(text)
    except (ValueError, RecursionError):
        # No se relanza: el error de json guarda el texto completo, con los tokens.
        return None
    return value if isinstance(value, dict) else None


def as_json_object(value: object) -> Json:
    return value if isinstance(value, dict) else {}


def text_in(fields: Json, key: str) -> str | None:
    value = fields.get(key)
    return value if isinstance(value, str) and value else None
