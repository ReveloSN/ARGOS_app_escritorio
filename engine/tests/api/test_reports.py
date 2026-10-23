from pathlib import Path

from fastapi.testclient import TestClient

from argus.api.settings import EngineSettings
from tests.api.review_stream import post_review
from tests.application.in_memory_repositories import RecordingFileOpener

DOCUMENT = {
    "title": "Informe de revisión documental",
    "subtitles": ["Revisión de prueba"],
    "brand": "ARGUS",
    "sections": [
        {"heading": "1. Resumen", "paragraphs": ["Se revisó 1 documento."]},
        {
            "heading": "2. Evidencia",
            "table": {
                "columns": ["Dato", "Valor A · origen"],
                "rows": [
                    [{"text": "Identificador"}, {"text": "4857", "detail": "Contrato · Página 1"}]
                ],
            },
        },
    ],
    "footer": "Generado con ARGUS",
    "pageLabel": "Página {page} de {total}",
}


def session_id(client: TestClient, headers: dict[str, str]) -> str:
    return str(post_review(client, headers, "Contrato_4857_v3.pdf")["session"]["id"])


def export(client: TestClient, headers: dict[str, str], report_format: str) -> dict[str, str]:
    """Pide dónde se guardará el informe, lo exporta y devuelve ambas respuestas."""
    url = f"/reviews/{session_id(client, headers)}/report"
    location = client.get(url, headers=headers).json()
    body = {"format": report_format, "document": DOCUMENT}
    saved = client.post(url, headers=headers, json=body).json()["fileName"]
    return {**location, "url": url, "saved": saved}


def test_exports_the_report_into_the_case_file_folder(
    client: TestClient, auth_headers: dict[str, str], settings: EngineSettings
) -> None:
    pdf = export(client, auth_headers, "pdf")
    docx = export(client, auth_headers, "docx")

    folder = settings.reports_directory / "Revisión_de_prueba"
    assert pdf["folder"] == str(folder)
    assert pdf["saved"] == f"{pdf['fileName']}.pdf"
    assert (folder / pdf["saved"]).read_bytes().startswith(b"%PDF")
    assert (folder / docx["saved"]).is_file()


def test_opens_the_exported_report(
    client: TestClient, auth_headers: dict[str, str], opener: RecordingFileOpener
) -> None:
    pdf = export(client, auth_headers, "pdf")

    opened = client.post(
        f"{pdf['url']}/open", headers=auth_headers, json={"fileName": pdf["saved"]}
    )

    assert opened.status_code == 204
    assert opener.opened == [Path(pdf["folder"]) / pdf["saved"]]


def test_a_report_that_is_no_longer_there_is_explained(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    url = f"/reviews/{session_id(client, auth_headers)}/report/open"

    response = client.post(url, headers=auth_headers, json={"fileName": "Informe.pdf"})

    assert response.status_code == 404
    assert response.json() == {"detail": "report_not_found"}
