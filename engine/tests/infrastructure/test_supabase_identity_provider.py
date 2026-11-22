"""Cada petición exacta, con requests de verdad contra un servidor en 127.0.0.1."""

from collections.abc import Callable, Iterator

import pytest

from argus.domain.account import Account, AccountSession, Credentials
from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.infrastructure.supabase_doubles import (
    ACCESS,
    CODE,
    EMAIL,
    KEY,
    PASSWORD,
    REFRESH,
    SESSION_BODY,
    UNCONFIRMED,
    USER,
    LoopbackSupabase,
    Received,
    loopback_supabase,
)

type Call = Callable[[SupabaseIdentityProvider], object]

CREDENTIALS = Credentials(EMAIL, PASSWORD)
LOGIN = {"email": EMAIL, "password": PASSWORD}
SESSION = AccountSession(Account("user-1", EMAIL, "Ana"), ACCESS, REFRESH)
OPENS_A_SESSION: dict[str, tuple[Call, tuple[object, ...]]] = {
    "sign_up": (
        lambda it: it.sign_up(CREDENTIALS, " Ana "),
        ("/auth/v1/signup", {}, {**LOGIN, "data": {"display_name": "Ana"}}),
    ),
    "sign_in": (
        lambda it: it.sign_in(CREDENTIALS),
        ("/auth/v1/token", {"grant_type": ["password"]}, LOGIN),
    ),
    "refresh": (
        lambda it: it.refresh(REFRESH),
        ("/auth/v1/token", {"grant_type": ["refresh_token"]}, {"refresh_token": REFRESH}),
    ),
    "verify_signup": (
        lambda it: it.verify_signup(EMAIL, CODE),
        ("/auth/v1/verify", {}, {"type": "signup", "email": EMAIL, "token": CODE}),
    ),
    "verify_recovery": (
        lambda it: it.verify_recovery(EMAIL, CODE),
        ("/auth/v1/verify", {}, {"type": "recovery", "email": EMAIL, "token": CODE}),
    ),
}


@pytest.fixture
def supabase() -> Iterator[LoopbackSupabase]:
    with loopback_supabase() as running:
        yield running


@pytest.fixture
def provider(supabase: LoopbackSupabase) -> SupabaseIdentityProvider:
    return SupabaseIdentityProvider(AccountConfiguration(supabase.url, KEY))


def only_request(supabase: LoopbackSupabase) -> Received:
    (request,) = supabase.received
    assert request.headers["apikey"] == KEY
    return request


@pytest.mark.parametrize("operation", OPENS_A_SESSION)
def test_requests_that_open_a_session(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider, operation: str
) -> None:
    call, expected = OPENS_A_SESSION[operation]

    assert call(provider) == SESSION

    request = only_request(supabase)
    assert (request.method, request.path, request.query, request.body) == ("POST", *expected)
    assert "authorization" not in request.headers


def test_asking_for_a_reset_code(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider
) -> None:
    supabase.answer(200, {})

    provider.request_password_reset(EMAIL)

    request = only_request(supabase)
    assert (request.method, request.path, request.query) == ("POST", "/auth/v1/recover", {})
    assert request.body == {"email": EMAIL}
    assert "authorization" not in request.headers


def test_signing_out_only_closes_this_session(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider
) -> None:
    supabase.answer(204, b"")

    provider.sign_out(ACCESS)

    request = only_request(supabase)
    assert (request.method, request.path) == ("POST", "/auth/v1/logout")
    assert (request.query, request.body) == ({"scope": ["local"]}, None)
    assert request.headers["authorization"] == f"Bearer {ACCESS}"


def test_the_password_changes_with_the_access_token(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider
) -> None:
    supabase.answer(200, USER)

    provider.update_password(ACCESS, PASSWORD)

    request = only_request(supabase)
    assert (request.method, request.path, request.query) == ("PUT", "/auth/v1/user", {})
    assert request.body == {"password": PASSWORD}
    assert request.headers["authorization"] == f"Bearer {ACCESS}"


@pytest.mark.parametrize("name", [None, "", "   "])
def test_without_a_name_none_is_sent(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider, name: str | None
) -> None:
    provider.sign_up(CREDENTIALS, name)

    assert only_request(supabase).body == LOGIN


def test_an_account_to_confirm_has_no_session_yet(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider
) -> None:
    supabase.answer(200, UNCONFIRMED)

    assert provider.sign_up(CREDENTIALS, None) is None


@pytest.mark.parametrize("metadata", [None, {}, {"display_name": ""}, {"display_name": 7}])
def test_an_account_without_a_name(
    supabase: LoopbackSupabase, provider: SupabaseIdentityProvider, metadata: object
) -> None:
    supabase.answer(200, {**SESSION_BODY, "user": {**USER, "user_metadata": metadata}})

    assert provider.sign_in(CREDENTIALS).account.display_name is None
