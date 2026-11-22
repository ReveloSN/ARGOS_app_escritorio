"""Lo que el transporte no puede hacer: redirigir, pasar por un proxy o cambiar las cabeceras."""

from collections.abc import Iterator
from pathlib import Path

import pytest

from argus.domain.account import Credentials
from argus.domain.account_errors import AccountError, AccountProblem
from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.infrastructure.supabase_doubles import (
    ACCESS,
    EMAIL,
    KEY,
    PASSWORD,
    LoopbackSupabase,
    ScriptedRequest,
    loopback_supabase,
)

CREDENTIALS = Credentials(EMAIL, PASSWORD)


@pytest.fixture
def supabase() -> Iterator[LoopbackSupabase]:
    with loopback_supabase() as running:
        yield running


def provider_for(supabase: LoopbackSupabase) -> SupabaseIdentityProvider:
    return SupabaseIdentityProvider(AccountConfiguration(supabase.url, KEY))


@pytest.mark.parametrize("status", [301, 302, 307, 308])
def test_redirects_are_not_followed(supabase: LoopbackSupabase, status: int) -> None:
    supabase.answer(status, b"")
    supabase.location = f"{supabase.url}/otro-sitio"

    with pytest.raises(AccountError) as raised:
        provider_for(supabase).sign_in(CREDENTIALS)

    assert raised.value.problem is AccountProblem.OFFLINE
    assert len(supabase.received) == 1


def test_plain_http_never_goes_through_a_proxy(
    supabase: LoopbackSupabase, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Por un proxy, la contraseña saldría del equipo sin cifrar.
    for name in ("HTTP_PROXY", "ALL_PROXY"):
        monkeypatch.setenv(name, "http://127.0.0.1:9")
    monkeypatch.setenv("NO_PROXY", "example.com")

    provider_for(supabase).sign_in(CREDENTIALS)

    assert len(supabase.received) == 1


def test_a_netrc_file_does_not_replace_the_headers(
    supabase: LoopbackSupabase, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    netrc = tmp_path / "netrc"
    netrc.write_text("default login otra password cosa\n", encoding="utf-8")
    monkeypatch.setenv("NETRC", str(netrc))
    supabase.answer(204, b"")

    provider_for(supabase).sign_out(ACCESS)

    assert supabase.received[0].headers["authorization"] == f"Bearer {ACCESS}"


def test_a_proxy_of_one_request_is_not_kept_for_the_next(
    supabase: LoopbackSupabase, monkeypatch: pytest.MonkeyPatch
) -> None:
    # requests completa con el entorno el diccionario de proxies que recibe.
    monkeypatch.setenv("HTTPS_PROXY", "http://127.0.0.1:9")
    provider_for(supabase).sign_in(CREDENTIALS)
    monkeypatch.delenv("HTTPS_PROXY")
    later = ScriptedRequest()

    SupabaseIdentityProvider(AccountConfiguration(supabase.url, KEY), later).sign_in(CREDENTIALS)

    assert later.options[0]["proxies"] == {"http": ""}
