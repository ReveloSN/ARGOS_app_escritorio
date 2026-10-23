from dataclasses import dataclass, replace
from typing import Protocol

from argus.application.ports.secrets import SecretStore
from argus.domain.errors import KeychainUnavailableError


@dataclass(frozen=True)
class AiSettings:
    """Ajustes > Inteligencia artificial. Apagado por defecto: nada sale del equipo sin que el
    usuario lo active (CLAUDE.md §8)."""

    explains_changes: bool = False


class AiSettingsRepository(Protocol):
    def get(self) -> AiSettings: ...

    def save(self, settings: AiSettings) -> None: ...


@dataclass(frozen=True)
class AiSettingsState:
    settings: AiSettings
    has_key: bool
    is_keychain_available: bool


class ManageAiSettings:
    """Activar la IA y guardar o quitar la clave; la clave nunca vuelve a la interfaz."""

    def __init__(self, settings: AiSettingsRepository, secrets: SecretStore) -> None:
        self._settings = settings
        self._secrets = secrets

    def state(self) -> AiSettingsState:
        settings = self._settings.get()
        try:
            has_key = bool(self._secrets.read())
        except KeychainUnavailableError:
            return AiSettingsState(settings, has_key=False, is_keychain_available=False)
        return AiSettingsState(settings, has_key, is_keychain_available=True)

    def set_explains_changes(self, enabled: bool) -> AiSettingsState:
        self._settings.save(replace(self._settings.get(), explains_changes=enabled))
        return self.state()

    def store_key(self, key: str) -> AiSettingsState:
        """Guarda la clave en el llavero; KeychainUnavailableError si no se puede."""
        self._secrets.store(key.strip())
        return self.state()

    def remove_key(self) -> AiSettingsState:
        self._secrets.remove()
        return self.state()
