"""Prueba de humo del motor empaquetado (ADR 017 y 027): arranca el binario de PyInstaller con
datos temporales y sin internet, revisa archivos de ejemplo y comprueba spaCy, el modelo ONNX,
el OCR con el Tesseract incluido y que la IA y Document AI cargan sus dependencias.

Uso, desde engine/ y después de empaquetar el motor y Tesseract:
    uv run python distribution/smoke_test.py
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
SUFFIX = ".exe" if os.name == "nt" else ""
EXECUTABLE = ENGINE_DIR / "dist" / "argus-engine" / f"argus-engine{SUFFIX}"
TESSERACT = ENGINE_DIR / "dist" / "tesseract" / f"tesseract{SUFFIX}"
FIXTURES = ENGINE_DIR / "tests" / "fixtures"
FILES = (
    "Correo_remision_cliente.eml",
    "Contrato_4857_v3.pdf",
    "Anexo_1_condiciones.docx",
    "Anexo_2_tarifas.xlsx",
)
SCANNED = "Anexo_4_escaneado.pdf"
TOKEN = "prueba-de-humo"
READY_TIMEOUT_SECONDS = 180
REVIEW_TIMEOUT_SECONDS = 300
STOP_TIMEOUT_SECONDS = 30
# Reglas (identificador), spaCy (nombres) y embeddings (periodo citado en el correo).
EXPECTED_ENTITY_TYPES = {"contract_id", "person_name", "period"}
# Un proxy que no existe: si el motor intentara salir a internet, fallaría en vez de esperar.
NO_INTERNET = "http://127.0.0.1:9"


def wait_for_port(stdout: IO[str]) -> int:
    ports: queue.Queue[int] = queue.Queue()

    def read() -> None:
        for line in stdout:
            if line.startswith("{") and json.loads(line).get("event") == "ready":
                ports.put(int(json.loads(line)["port"]))

    threading.Thread(target=read, daemon=True).start()
    return ports.get(timeout=READY_TIMEOUT_SECONDS)


def review(
    client: httpx.Client, names: tuple[str, ...], ocr: tuple[str, ...] = ()
) -> dict[str, Any]:
    files = [("files", (name, (FIXTURES / name).read_bytes())) for name in names]
    data: dict[str, Any] = {"name": "Prueba de humo", "ocr": list(ocr)}
    response = client.post("/reviews", data=data, files=files, timeout=REVIEW_TIMEOUT_SECONDS)
    response.raise_for_status()
    events = list(_events(response.text))
    name, payload = events[-1]
    if name != "review":
        sys.exit(f"La revisión no terminó: el último evento fue «{name}».")
    return payload


def _events(text: str) -> Iterator[tuple[str, dict[str, Any]]]:
    for block in text.strip().split("\n\n"):
        fields = dict(line.split(": ", 1) for line in block.splitlines())
        yield fields["event"], json.loads(fields["data"])


def check_review(client: httpx.Client) -> None:
    payload = review(client, FILES)
    found = {alert["entityType"] for alert in payload["alerts"]}
    missing = EXPECTED_ENTITY_TYPES - found
    if missing:
        sys.exit(
            f"Faltan alertas de {sorted(missing)}; el motor empaquetado detectó {sorted(found)}."
        )
    print(f"Revisión correcta: {len(payload['alerts'])} alertas ({sorted(found)}).")


def check_ocr(client: httpx.Client) -> None:
    payload = review(client, ("Contrato_4857_v3.pdf", SCANNED), ocr=(SCANNED,))
    scanned = payload["documents"][1]
    if scanned["method"] != "local_ocr" or scanned["status"] != "read":
        sys.exit(f"El OCR local no leyó «{SCANNED}»: {scanned}.")
    if not any(alert["entityType"] == "contract_id" for alert in payload["alerts"]):
        sys.exit("El OCR leyó el anexo pero no apareció 4857 frente a 4587.")
    print("OCR local correcto: el anexo escaneado se leyó y se comparó (4857 frente a 4587).")


def check_settings(client: httpx.Client) -> None:
    ocr = client.get("/settings/ocr")
    ai = client.get("/settings/ai")
    if ocr.status_code != httpx.codes.OK or ai.status_code != httpx.codes.OK:
        sys.exit(f"Ajustes de OCR o IA no responden: {ocr.status_code}, {ai.status_code}.")
    if not ocr.json()["isLocalAvailable"]:
        sys.exit("El motor empaquetado no encuentra el Tesseract incluido.")
    print("Ajustes de IA y OCR correctos (keyring, anthropic y google-auth empaquetados).")


def engine_environment(data_directory: str) -> dict[str, str]:
    return {
        **os.environ,
        "ARGUS_ENGINE_TOKEN": TOKEN,
        "ARGUS_DATA_DIR": data_directory,
        "ARGUS_MODELS_DIR": str(ENGINE_DIR / "models"),
        "ARGUS_TESSERACT": str(TESSERACT),
        "HTTP_PROXY": NO_INTERNET,
        "HTTPS_PROXY": NO_INTERNET,
        "NO_PROXY": "127.0.0.1,localhost",
    }


def check_engine(port: int) -> None:
    headers = {"Authorization": f"Bearer {TOKEN}"}
    # trust_env=False: esta prueba habla con el motor local sin pasar por el proxy.
    with httpx.Client(
        base_url=f"http://127.0.0.1:{port}", headers=headers, trust_env=False
    ) as client:
        check_review(client)
        check_settings(client)
        check_ocr(client)


def run_engine(data_directory: str) -> None:
    with subprocess.Popen(
        [str(EXECUTABLE), "--exit-on-stdin-close"],
        env=engine_environment(data_directory),
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        text=True,
    ) as engine:
        assert engine.stdout is not None
        assert engine.stdin is not None
        try:
            check_engine(wait_for_port(engine.stdout))
        finally:
            # Cerrar stdin le pide al motor que termine (--exit-on-stdin-close).
            engine.stdin.close()
            engine.wait(timeout=STOP_TIMEOUT_SECONDS)


def main() -> None:
    if not TESSERACT.is_file():
        sys.exit("Falta Tesseract: uv run python distribution/bundle_tesseract.py")
    with tempfile.TemporaryDirectory() as data_directory:
        run_engine(data_directory)


if __name__ == "__main__":
    main()
