from dataclasses import dataclass
from pathlib import Path

from fastapi.testclient import TestClient

from argus.api.settings import EngineSettings
from tests.api.review_stream import post_review
from tests.api.test_comparisons import compare_versions
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


@dataclass(frozen=True)
class Export:
    """Qué exportar: el formato y, si se indica, la sesión (si no, una revisión nueva)."""

    report_format: str
    review: str | None = None


def export(client: TestClient, headers: dict[str, str], request: Export) -> dict[str, str]:
    """Pide dónde se guardará el informe, lo exporta y devuelve ambas respuestas."""
    url = f"/reviews/{request.review or session_id(client, headers)}/report"
    location = client.get(url, headers=headers).json()
    body = {"format": request.report_format, "document": DOCUMENT}
    saved = client.post(url, headers=headers, json=body).json()["fileName"]
    return {**location, "url": url, "saved": saved}


def test_exports_the_report_into_the_case_file_folder(
    client: TestClient, auth_headers: dict[str, str], settings: EngineSettings
) -> None:
    review = session_id(client, auth_headers)
    pdf = export(client, auth_headers, Export("pdf", review))
    docx = export(client, auth_headers, Export("docx", review))

    folder = settings.reports_directory / f"Revisión_de_prueba_{review[:8]}"
    assert pdf["folder"] == str(folder)
    assert pdf["version"] == "9.9.9"
    assert pdf["saved"] == f"{pdf['fileName']}.pdf"
    assert (folder / pdf["saved"]).read_bytes().startswith(b"%PDF")
    assert (folder / docx["saved"]).is_file()


def test_two_sessions_with_the_same_name_keep_separate_reports(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """(Regresión) Dos «Revisión de prueba» del mismo día no se pisan el informe ni se abren cruzados."""
    first = export(client, auth_headers, Export("pdf"))
    second = export(client, auth_headers, Export("pdf"))

    assert first["folder"] != second["folder"]
    assert (Path(first["folder"]) / first["saved"]).is_file()
    assert (Path(second["folder"]) / second["saved"]).is_file()


def test_opens_the_exported_report(
    client: TestClient, auth_headers: dict[str, str], opener: RecordingFileOpener
) -> None:
    pdf = export(client, auth_headers, Export("pdf"))

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


def test_a_comparison_has_its_own_report_in_a_folder_named_after_it(
    client: TestClient, auth_headers: dict[str, str], opener: RecordingFileOpener
) -> None:
    comparison = compare_versions(client, auth_headers)
    url = f"/comparisons/{comparison['id']}/report"
    body = {"format": "pdf", "document": DOCUMENT}

    planned = client.get(url, headers=auth_headers).json()
    saved = client.post(url, headers=auth_headers, json=body).json()
    client.post(f"{url}/open", headers=auth_headers, json={"fileName": saved["fileName"]})

    report = Path(planned["folder"]) / saved["fileName"]
    assert report.read_bytes().startswith(b"%PDF")
    assert opener.opened == [report]


def test_a_comparison_that_does_not_exist_has_no_report(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/comparisons/no-existe/report", headers=auth_headers)

    assert response.status_code == 404
