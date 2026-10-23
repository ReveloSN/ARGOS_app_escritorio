import json
import re
from dataclasses import dataclass, replace
from typing import Protocol

from argus.application.ports.secrets import SecretStore
from argus.domain.errors import (
    InvalidOcrCredentialsError,
    InvalidValueError,
    KeychainUnavailableError,
)

SERVICE_ACCOUNT_TYPE = "service_account"
REQUIRED_CREDENTIAL_FIELDS = ("client_email", "private_key", "token_uri")
# Proyecto, región y procesador van dentro de la URL de Document AI: solo letras, números,
# guiones y guiones bajos.
CLOUD_IDENTIFIER = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]*")


@dataclass(frozen=True)
class CloudOcrProcessor:
    """El procesador OCR de Document AI que eligió el usuario; vacío hasta que lo configure."""

    project_id: str = ""
    location: str = ""
    processor_id: str = ""

    def __post_init__(self) -> None:
        for value in (self.project_id, self.location, self.processor_id):
            if value and not CLOUD_IDENTIFIER.fullmatch(value):
                raise InvalidValueError(f"«{value}» no es un identificador de Google Cloud.")

    @classmethod
    def from_input(cls, project_id: str, location: str, processor_id: str) -> "CloudOcrProcessor":
        """Lo que escribió el usuario, sin los espacios que suelen colarse al copiar y pegar."""
        return cls(project_id.strip(), location.strip(), processor_id.strip())

    @property
    def is_complete(self) -> bool:
        return all((self.project_id, self.location, self.processor_id))


@dataclass(frozen=True)
class OcrSettings:
    """Ajustes > OCR. Document AI viene apagado: nada sale del equipo sin activarlo y sin
    confirmar cada envío (CLAUDE.md §15)."""

    uses_cloud: bool = False
    processor: CloudOcrProcessor = CloudOcrProcessor()


class OcrSettingsRepository(Protocol):
    def get(self) -> OcrSettings: ...

    def save(self, settings: OcrSettings) -> None: ...


class LocalOcrProbe(Protocol):
    """Si Tesseract está disponible en este equipo."""

    def is_available(self) -> bool: ...


@dataclass(frozen=True)
class OcrSettingsState:
    settings: OcrSettings
    is_local_available: bool
    has_credentials: bool
    is_keychain_available: bool

    @property
    def is_cloud_ready(self) -> bool:
        return (
            self.settings.uses_cloud
            and self.settings.processor.is_complete
            and self.has_credentials
        )


@dataclass(frozen=True)
class OcrSettingsSources:
    settings: OcrSettingsRepository
    credentials: SecretStore
    local: LocalOcrProbe


def validated_credentials(text: str) -> str:
    """La clave JSON de una cuenta de servicio, compacta; si no lo es, el error lo explica."""
    try:
        info = json.loads(text)
    except json.JSONDecodeError:
        raise InvalidOcrCredentialsError("No es un archivo JSON.") from None
    is_service_account = isinstance(info, dict) and info.get("type") == SERVICE_ACCOUNT_TYPE
    if not is_service_account or not all(info.get(name) for name in REQUIRED_CREDENTIAL_FIELDS):
        raise InvalidOcrCredentialsError("No es la clave de una cuenta de servicio.")
    return json.dumps(info, separators=(",", ":"))


class ManageOcrSettings:
    """Activar Document AI, elegir su procesador y guardar o quitar la clave de la cuenta de
    servicio; la clave nunca vuelve a la interfaz."""

    def __init__(self, sources: OcrSettingsSources) -> None:
        self._sources = sources

    def state(self) -> OcrSettingsState:
        settings = self._sources.settings.get()
        is_local_available = self._sources.local.is_available()
        try:
            has_credentials = bool(self._sources.credentials.read())
        except KeychainUnavailableError:
            return OcrSettingsState(
                settings, is_local_available, False, is_keychain_available=False
            )
        return OcrSettingsState(settings, is_local_available, has_credentials, True)

    def set_uses_cloud(self, enabled: bool) -> OcrSettingsState:
        settings = self._sources.settings.get()
        self._sources.settings.save(replace(settings, uses_cloud=enabled))
        return self.state()

    def set_processor(self, processor: CloudOcrProcessor) -> OcrSettingsState:
        settings = self._sources.settings.get()
        self._sources.settings.save(replace(settings, processor=processor))
        return self.state()

    def store_credentials(self, text: str) -> OcrSettingsState:
        """Guarda la clave en el llavero; KeychainUnavailableError si no se puede."""
        self._sources.credentials.store(validated_credentials(text))
        return self.state()

    def remove_credentials(self) -> OcrSettingsState:
        self._sources.credentials.remove()
        return self.state()
