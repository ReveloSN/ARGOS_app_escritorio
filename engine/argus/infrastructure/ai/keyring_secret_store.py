import keyring
from keyring.errors import KeyringError, PasswordDeleteError

from argus.domain.errors import KeychainUnavailableError

SERVICE = "ARGUS"
ACCOUNT = "anthropic-api-key"


class KeyringSecretStore:
    """La clave en el llavero del sistema: Administrador de credenciales en Windows y Secret
    Service en Linux. Nunca se escribe en archivos ni en la base de datos."""

    def __init__(self, service: str = SERVICE, account: str = ACCOUNT) -> None:
        self._service = service
        self._account = account

    def read(self) -> str | None:
        try:
            return keyring.get_password(self._service, self._account)
        except KeyringError:
            raise KeychainUnavailableError("No se pudo leer el llavero del sistema.") from None

    def store(self, secret: str) -> None:
        try:
            keyring.set_password(self._service, self._account, secret)
        except KeyringError:
            raise KeychainUnavailableError("No se pudo escribir en el llavero.") from None

    def remove(self) -> None:
        try:
            keyring.delete_password(self._service, self._account)
        except PasswordDeleteError:
            return
        except KeyringError:
            raise KeychainUnavailableError("No se pudo borrar del llavero.") from None
