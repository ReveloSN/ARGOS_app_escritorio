"""El llavero del sistema en memoria, con el tope del Administrador de credenciales de Windows."""

import keyring
import pytest
from keyring.errors import PasswordDeleteError

# 2560 bytes por entrada, en UTF-16: 1280 caracteres.
WINDOWS_LIMIT_BYTES = 2560


class BoundedKeyring:
    def __init__(self) -> None:
        self.entries: dict[tuple[str, str], str] = {}
        self.services_used: set[str] = set()
        self.writes = 0
        self.failing_write: int | None = None

    def get_password(self, service: str, account: str) -> str | None:
        self.services_used.add(service)
        return self.entries.get((service, account))

    def set_password(self, service: str, account: str, secret: str) -> None:
        self.services_used.add(service)
        self.writes += 1
        if self.writes == self.failing_write:
            raise OSError(5, "CredWrite")
        if len(secret.encode("utf-16-le")) > WINDOWS_LIMIT_BYTES:
            # Como CredWrite: no es un KeyringError.
            raise OSError(1783, "CredWrite")
        self.entries[(service, account)] = secret

    def delete_password(self, service: str, account: str) -> None:
        self.services_used.add(service)
        if (service, account) not in self.entries:
            raise PasswordDeleteError("no existe")
        del self.entries[(service, account)]

    def install(self, monkeypatch: pytest.MonkeyPatch) -> None:
        for name in ("get_password", "set_password", "delete_password"):
            monkeypatch.setattr(keyring, name, getattr(self, name))
