from collections.abc import Mapping
from dataclasses import dataclass, replace
from enum import StrEnum
from typing import Protocol

from argus.application.ai.explanation_provider import ExplanationProvider
from argus.application.ports.secrets import SecretStore
from argus.domain.errors import KeychainUnavailableError


class AiProvider(StrEnum):
    """Los proveedores que el usuario puede elegir; cada uno con su propia clave en el llavero."""

    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"


DEFAULT_PROVIDER = AiProvider.ANTHROPIC


@dataclass(frozen=True)
class AiSettings:
    """Ajustes > Inteligencia artificial. Apagado por defecto: nada sale del equipo sin que el
    usuario lo active (CLAUDE.md §8)."""

    explains_changes: bool = False
    provider: AiProvider = DEFAULT_PROVIDER


class AiSettingsRepository(Protocol):
    def get(self) -> AiSettings: ...

    def save(self, settings: AiSettings) -> None: ...


@dataclass(frozen=True)
class ProviderAccess:
    """Con qué se habla con un proveedor: su clave en el llavero, su adaptador y su modelo."""

    secrets: SecretStore
    provider: ExplanationProvider
    model: str


type ProviderAccesses = Mapping[AiProvider, ProviderAccess]


@dataclass(frozen=True)
class AiSettingsState:
    settings: AiSettings
    has_key: bool
    is_keychain_available: bool
    model: str


class ManageAiSettings:
    """Activar la IA, elegir el proveedor y guardar o quitar su clave; la clave nunca vuelve a
    la interfaz."""

    def __init__(self, settings: AiSettingsRepository, providers: ProviderAccesses) -> None:
        self._settings = settings
        self._providers = providers

    def available(self) -> tuple[tuple[AiProvider, str], ...]:
        """Cada proveedor con el modelo que usa, para elegirlo en Ajustes."""
        return tuple((provider, access.model) for provider, access in self._providers.items())

    def state(self) -> AiSettingsState:
        settings = self._settings.get()
        access = self._providers[settings.provider]
        try:
            has_key = bool(access.secrets.read())
        except KeychainUnavailableError:
            return AiSettingsState(settings, False, is_keychain_available=False, model=access.model)
        return AiSettingsState(settings, has_key, is_keychain_available=True, model=access.model)

    def set_explains_changes(self, enabled: bool) -> AiSettingsState:
        self._settings.save(replace(self._settings.get(), explains_changes=enabled))
        return self.state()

    def set_provider(self, provider: AiProvider) -> AiSettingsState:
        self._settings.save(replace(self._settings.get(), provider=provider))
        return self.state()

    def store_key(self, key: str) -> AiSettingsState:
        """Guarda la clave del proveedor elegido en el llavero; KeychainUnavailableError si no."""
        self._access().secrets.store(key.strip())
        return self.state()

    def remove_key(self) -> AiSettingsState:
        self._access().secrets.remove()
        return self.state()

    def _access(self) -> ProviderAccess:
        return self._providers[self._settings.get().provider]
