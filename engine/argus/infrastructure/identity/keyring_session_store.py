import json
from collections.abc import Callable
from dataclasses import asdict

from argus.application.ports.secrets import SecretStore
from argus.domain.account import Account, StoredSession
from argus.domain.errors import KeychainUnavailableError
from argus.infrastructure.identity.json_fields import as_json_object, parse_json_object, text_in

ACCOUNT_FIELD = "account"
TOKEN_FIELD = "refresh_token"


class KeyringSessionStore:
    """La sesión como JSON en el llavero. Lo que no se puede leer cuenta como «sin sesión»."""

    def __init__(self, secrets: SecretStore) -> None:
        self._secrets = secrets

    def read(self) -> StoredSession | None:
        secret = _use_keychain(self._secrets.read)
        return _session_of(secret) if secret else None

    def write(self, session: StoredSession) -> None:
        record = {ACCOUNT_FIELD: asdict(session.account), TOKEN_FIELD: session.refresh_token}
        # json deja solo ASCII: así cada parte de 1000 caracteres cabe en Windows.
        secret = json.dumps(record)
        _use_keychain(lambda: self._secrets.store(secret))

    def clear(self) -> None:
        _use_keychain(self._secrets.remove)


def _use_keychain[Result](action: Callable[[], Result]) -> Result:
    try:
        return action()
    except Exception:
        # Cada sistema lanza los suyos (pywintypes, D-Bus…), no solo KeyringError. Se lanza fuera
        # del except para no encadenar un error que puede llevar el token.
        failure = KeychainUnavailableError("No se pudo usar el llavero para la cuenta.")
    raise failure


def _session_of(secret: str) -> StoredSession | None:
    record = parse_json_object(secret) or {}
    fields = as_json_object(record.get(ACCOUNT_FIELD))
    account_id, email = text_in(fields, "id"), text_in(fields, "email")
    token = text_in(record, TOKEN_FIELD)
    # Sin token está vencida, pero solo si se guardó así: si falta o es raro, no hay sesión.
    is_expired = TOKEN_FIELD in record and record[TOKEN_FIELD] is None
    if not (account_id and email and (token or is_expired)):
        return None
    return StoredSession(Account(account_id, email, text_in(fields, "display_name")), token)
