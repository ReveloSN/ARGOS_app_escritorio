import pytest

from argus.application.account.password_reset import PasswordReset
from argus.application.account.sign_in import SignIn
from argus.domain.account import Credentials, StoredSession
from argus.domain.account_errors import AccountError, AccountProblem
from tests.application.account_doubles import RECOVERED, SESSION, AccountDoubles

# ASCII y sin símbolos: json y las URL escapan el resto y la búsqueda no lo encontraría.
PASSWORD = "contrasena-privada-7f3a"
CODE = "80417236"
SECRETS = (
    PASSWORD,
    CODE,
    SESSION.access_token,
    SESSION.refresh_token,
    RECOVERED.access_token,
    RECOVERED.refresh_token,
)


def test_repr_has_neither_password_nor_tokens() -> None:
    credentials = Credentials("ana@example.com", PASSWORD)
    stored = StoredSession(SESSION.account, SESSION.refresh_token)

    shown = repr((credentials, SESSION, RECOVERED, stored, SESSION.to_stored()))

    assert not [secret for secret in SECRETS if secret in shown]


def test_what_is_kept_in_memory_does_not_show_secrets() -> None:
    doubles = AccountDoubles()
    sessions = doubles.sessions()
    state = SignIn(sessions).execute(Credentials("ana@example.com", PASSWORD))
    doubles.provider.fail("update_password", AccountProblem.WEAK_PASSWORD)
    with pytest.raises(AccountError) as failure:
        PasswordReset(sessions).confirm("ana@example.com", CODE, PASSWORD)

    kept = {**vars(sessions), **vars(sessions.recovery)}
    kept.pop("_provider")  # El doble anota sus llamadas, con secretos, para las pruebas.
    shown = repr((state, kept, failure.value, str(failure.value)))

    assert not [secret for secret in SECRETS if secret in shown]
