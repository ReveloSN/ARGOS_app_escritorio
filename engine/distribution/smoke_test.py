"""Prueba de humo del motor empaquetado (ADR 017): arranca el binario de PyInstaller con datos
temporales, revisa archivos de ejemplo y comprueba que spaCy y el modelo ONNX funcionan.

Uso, desde engine/ y después de empaquetar:  uv run python distribution/smoke_test.py
"""

import json
import os
import queue
import subprocess
import sys
import tempfile
import threading
from collections.abc import Iterator
from pathlib import Path
from typing import IO, Any

import httpx

ENGINE_DIR = Path(__file__).resolve().parent.parent
EXECUTABLE = (
    ENGINE_DIR
    / "dist"
    / "argus-engine"
    / ("argus-engine.exe" if os.name == "nt" else "argus-engine")
)
FIXTURES = ENGINE_DIR / "tests" / "fixtures"
FILES = (
    "Correo_remision_cliente.eml",
    "Contrato_4857_v3.pdf",
    "Anexo_1_condiciones.docx",
    "Anexo_2_tarifas.xlsx",
)
TOKEN = "prueba-de-humo"
READY_TIMEOUT_SECONDS = 180
REVIEW_TIMEOUT_SECONDS = 300
STOP_TIMEOUT_SECONDS = 30
# Reglas (identificador), spaCy (nombres) y embeddings (periodo citado en el correo).
EXPECTED_ENTITY_TYPES = {"contract_id", "person_name", "period"}


def wait_for_port(stdout: IO[str]) -> int:
    ports: queue.Queue[int] = queue.Queue()

    def read() -> None:
        for line in stdout:
            if line.startswith("{") and json.loads(line).get("event") == "ready":
                ports.put(int(json.loads(line)["port"]))

    threading.Thread(target=read, daemon=True).start()
    return ports.get(timeout=READY_TIMEOUT_SECONDS)


def review_events(base_url: str) -> Iterator[tuple[str, dict[str, Any]]]:
    files = [("files", (name, (FIXTURES / name).read_bytes())) for name in FILES]
    response = httpx.post(
        f"{base_url}/reviews",
        headers={"Authorization": f"Bearer {TOKEN}"},
        data={"name": "Prueba de humo"},
        files=files,
        timeout=REVIEW_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    for block in response.text.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines())
        yield fields["event"], json.loads(fields["data"])


def check_review(base_url: str) -> None:
    name, review = list(review_events(base_url))[-1]
    found = {alert["entityType"] for alert in review["alerts"]} if name == "review" else set()
    missing = EXPECTED_ENTITY_TYPES - found
    if missing:
        sys.exit(
            f"Faltan alertas de {sorted(missing)}; el motor empaquetado detectó {sorted(found)}."
        )
    print(f"Motor empaquetado correcto: {len(review['alerts'])} alertas ({sorted(found)}).")


def run_engine(data_directory: str) -> None:
    environment = {
        **os.environ,
        "ARGUS_ENGINE_TOKEN": TOKEN,
        "ARGUS_DATA_DIR": data_directory,
        "ARGUS_MODELS_DIR": str(ENGINE_DIR / "models"),
    }
    with subprocess.Popen(
        [str(EXECUTABLE), "--exit-on-stdin-close"],
        env=environment,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    ) as engine:
        assert engine.stdout is not None
        assert engine.stdin is not None
        try:
            check_review(f"http://127.0.0.1:{wait_for_port(engine.stdout)}")
        finally:
            # Cerrar stdin le pide al motor que termine (--exit-on-stdin-close).
            engine.stdin.close()
            engine.wait(timeout=STOP_TIMEOUT_SECONDS)


def main() -> None:
    with tempfile.TemporaryDirectory() as data_directory:
        run_engine(data_directory)


if __name__ == "__main__":
    main()
