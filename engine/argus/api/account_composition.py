"""Construcción de la cuenta (ADR 033): Supabase, la sesión en el llavero y la marca de la puerta."""

import os
from dataclasses import dataclass

from argus.application.account.account_sessions import AccountSessions
from argus.application.account.password_reset import PasswordReset
from argus.application.account.sign_in import SignIn
from argus.application.account.sign_out import SignOut
from argus.application.account.sign_up import SignUp
from argus.application.ports.account_storage import GatePreference, SessionStore
from argus.application.ports.identity_provider import IdentityProvider
from argus.infrastructure.ai.keyring_secret_store import KeyringSecretStore
from argus.infrastructure.identity.account_configuration import (
    bundled_configuration_file,
    read_account_configuration,
)
from argus.infrastructure.identity.keyring_session_store import KeyringSessionStore
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from argus.infrastructure.ocr.chunked_secret_store import ChunkedSecretStore

SESSION_KEYCHAIN_ACCOUNT = "account-session"


@dataclass(frozen=True)
class AccountAdapters:
    """Lo que toca el exterior: Supabase y el llavero. Sin proveedor, la cuenta no está disponible.

    Las pruebas los reemplazan para no llamar a Supabase ni tocar el llavero real.
    """

    provider: IdentityProvider | None
    store: SessionStore


@dataclass(frozen=True)
class AccountServices:
    sessions: AccountSessions
    sign_up: SignUp
    sign_in: SignIn
    sign_out: SignOut
    password_reset: PasswordReset


def default_account_adapters() -> AccountAdapters:
    configuration = read_account_configuration(os.environ, bundled_configuration_file())
    provider = SupabaseIdentityProvider(configuration) if configuration else None
    secrets = ChunkedSecretStore(
        lambda account: KeyringSecretStore(account=account), SESSION_KEYCHAIN_ACCOUNT
    )
    return AccountAdapters(provider, KeyringSessionStore(secrets))


def build_account_services(gate: GatePreference, adapters: AccountAdapters) -> AccountServices:
    # Una sola por motor: ahí viven los candados, la memoria y el reintento de la recuperación.
    sessions = AccountSessions(adapters.provider, adapters.store, gate)
    return AccountServices(
        sessions, SignUp(sessions), SignIn(sessions), SignOut(sessions), PasswordReset(sessions)
    )
