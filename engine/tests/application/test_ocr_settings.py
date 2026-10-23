import json

import pytest

from argus.application.ocr_settings import (
    CloudOcrProcessor,
    ManageOcrSettings,
    OcrSettings,
    OcrSettingsSources,
    validated_credentials,
)
from argus.domain.errors import InvalidOcrCredentialsError, InvalidValueError
from tests.application.ai_doubles import InMemorySecretStore
from tests.application.ocr_doubles import FixedProbe

SERVICE_ACCOUNT = {
    "type": "service_account",
    "client_email": "ocr@proyecto-de-prueba.iam.gserviceaccount.com",
    "private_key": "-----BEGIN PRIVATE KEY-----\nclave-de-prueba\n-----END PRIVATE KEY-----\n",
    "token_uri": "https://oauth2.googleapis.com/token",
}
PROCESSOR = CloudOcrProcessor("proyecto-de-prueba", "us", "a1b2c3d4")


class InMemoryOcrSettingsRepository:
    def __init__(self) -> None:
        self.settings = OcrSettings()

    def get(self) -> OcrSettings:
        return self.settings

    def save(self, settings: OcrSettings) -> None:
        self.settings = settings


def manage(secrets: InMemorySecretStore | None = None) -> ManageOcrSettings:
    sources = OcrSettingsSources(
        InMemoryOcrSettingsRepository(), secrets or InMemorySecretStore(), FixedProbe(True)
    )
    return ManageOcrSettings(sources)


def test_document_ai_is_off_until_it_is_turned_on_configured_and_has_its_key() -> None:
    settings = manage()
    assert not settings.state().is_cloud_ready

    settings.set_uses_cloud(True)
    settings.set_processor(PROCESSOR)
    state = settings.store_credentials(json.dumps(SERVICE_ACCOUNT, indent=2))

    assert state.is_cloud_ready
    assert state.is_local_available


def test_the_key_is_stored_compact_and_removing_it_turns_the_cloud_off() -> None:
    secrets = InMemorySecretStore()
    settings = manage(secrets)

    settings.store_credentials(json.dumps(SERVICE_ACCOUNT, indent=2))
    assert secrets.secret is not None
    assert "\n  " not in secrets.secret

    assert not settings.remove_credentials().has_credentials


@pytest.mark.parametrize(
    "text",
    [
        "no es json",
        json.dumps({"type": "authorized_user"}),
        json.dumps({"type": "service_account"}),
    ],
)
def test_only_a_service_account_key_is_accepted(text: str) -> None:
    with pytest.raises(InvalidOcrCredentialsError):
        validated_credentials(text)


def test_identifiers_that_would_change_the_url_are_rejected() -> None:
    with pytest.raises(InvalidValueError):
        CloudOcrProcessor("proyecto/../otro", "us", "a1b2")


def test_processor_values_are_trimmed() -> None:
    settings = manage()

    processor = CloudOcrProcessor.from_input(" proyecto-de-prueba ", "us ", " a1b2")
    state = settings.set_processor(processor)

    assert state.settings.processor == CloudOcrProcessor("proyecto-de-prueba", "us", "a1b2")


def test_without_keychain_the_state_says_so() -> None:
    state = manage(InMemorySecretStore(is_available=False)).state()

    assert not state.is_keychain_available
    assert not state.has_credentials
