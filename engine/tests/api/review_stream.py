"""Ayudas de las pruebas de la API: subir archivos de ejemplo y leer el flujo SSE de la revisión."""

import json
from dataclasses import dataclass
from typing import Any

from fastapi.testclient import TestClient

from tests.infrastructure.conftest import FIXTURES_DIR

REVIEW_NAME = "Revisión de prueba"


@dataclass(frozen=True)
class StreamedReview:
    events: list[tuple[str, dict[str, Any]]]

    @property
    def names(self) -> list[str]:
        return [name for name, _ in self.events]

    @property
    def review(self) -> dict[str, Any]:
        name, payload = self.events[-1]
        assert name == "review"
        return payload


def upload(name: str) -> tuple[str, tuple[str, bytes]]:
    return ("files", (name, (FIXTURES_DIR / name).read_bytes()))


def parse_events(text: str) -> list[tuple[str, dict[str, Any]]]:
    events: list[tuple[str, dict[str, Any]]] = []
    for block in text.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines())
        events.append((fields["event"], json.loads(fields["data"])))
    return events


def stream_review(client: TestClient, headers: dict[str, str], *names: str) -> StreamedReview:
    response = client.post(
        "/reviews",
        headers=headers,
        data={"name": REVIEW_NAME},
        files=[upload(name) for name in names],
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/event-stream")
    return StreamedReview(parse_events(response.text))


def post_review(client: TestClient, headers: dict[str, str], *names: str) -> dict[str, Any]:
    return stream_review(client, headers, *names).review
