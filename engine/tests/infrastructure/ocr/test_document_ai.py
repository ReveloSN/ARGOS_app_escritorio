import base64

import pytest

from argus.application.ocr_settings import CloudOcrProcessor, OcrSettings
from argus.domain.errors import OcrUnavailableError
from argus.domain.ocr import PageCount, ReadMethod
from argus.infrastructure.ocr.document_ai_ocr_engine import (
    DocumentAiOcrEngine,
    DocumentAiSources,
    GoogleCloudSession,
    page_texts,
)
from tests.application.ai_doubles import InMemorySecretStore
from tests.application.ocr_doubles import RecordingCloudSession
from tests.application.test_ocr_settings import InMemoryOcrSettingsRepository

PROCESSOR = CloudOcrProcessor("proyecto-de-prueba", "eu", "a1b2c3d4")
TEXT = "Contrato No. 4587\nAnexo 3\n"
FIRST_PAGE = {"layout": {"textAnchor": {"textSegments": [{"endIndex": "18"}]}}}
SECOND_PAGE = {"layout": {"textAnchor": {"textSegments": [{"startIndex": "18", "endIndex": "26"}]}}}
RESPONSE = {"document": {"text": TEXT, "pages": [FIRST_PAGE, SECOND_PAGE]}}
STORED_KEY = "{}"


def engine(
    session: RecordingCloudSession, settings: OcrSettings, key: str | None = STORED_KEY
) -> DocumentAiOcrEngine:
    repository = InMemoryOcrSettingsRepository()
    repository.settings = settings
    sources = DocumentAiSources(repository, InMemorySecretStore(key), lambda credentials: session)
    return DocumentAiOcrEngine(sources)


def test_the_pdf_goes_to_the_configured_processor_and_each_page_comes_back() -> None:
    session = RecordingCloudSession(RESPONSE)
    pages: list[PageCount] = []

    result = engine(session, OcrSettings(True, PROCESSOR)).recognize(b"%PDF-1.7", pages.append)

    url, body = session.sent[0]
    assert url == (
        "https://eu-documentai.googleapis.com/v1/projects/proyecto-de-prueba"
        "/locations/eu/processors/a1b2c3d4:process"
    )
    encoded = base64.b64encode(b"%PDF-1.7").decode()
    assert body == {"rawDocument": {"content": encoded, "mimeType": "application/pdf"}}
    assert result.page_texts == ("Contrato No. 4587\n", "Anexo 3\n")
    assert result.method is ReadMethod.CLOUD_OCR
    assert pages == [PageCount(2, 2)]


@pytest.mark.parametrize(
    ("settings", "key"),
    [
        (OcrSettings(False, PROCESSOR), STORED_KEY),
        (OcrSettings(True, CloudOcrProcessor()), STORED_KEY),
        (OcrSettings(True, PROCESSOR), None),
    ],
)
def test_nothing_leaves_the_computer_when_it_is_off_or_incomplete(
    settings: OcrSettings, key: str | None
) -> None:
    session = RecordingCloudSession(RESPONSE)

    with pytest.raises(OcrUnavailableError):
        engine(session, settings, key).recognize(b"%PDF", lambda pages: None)
    assert session.sent == []


def test_without_keychain_the_cloud_is_unavailable() -> None:
    repository = InMemoryOcrSettingsRepository()
    repository.settings = OcrSettings(True, PROCESSOR)
    sources = DocumentAiSources(
        repository,
        InMemorySecretStore(is_available=False),
        lambda credentials: RecordingCloudSession(),
    )

    with pytest.raises(OcrUnavailableError):
        DocumentAiOcrEngine(sources).recognize(b"%PDF", lambda pages: None)


def test_an_unexpected_answer_gives_no_pages() -> None:
    assert page_texts({"document": {"pages": "no es una lista"}}) == ()
    assert page_texts({}) == ()


def test_invalid_credentials_never_reach_google() -> None:
    with pytest.raises(OcrUnavailableError):
        GoogleCloudSession('{"type": "service_account"}')
