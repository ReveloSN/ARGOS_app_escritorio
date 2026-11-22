"""Pedir otro código de confirmación, con requests de verdad contra 127.0.0.1."""

from argus.infrastructure.identity.account_configuration import AccountConfiguration
from argus.infrastructure.identity.supabase_identity_provider import SupabaseIdentityProvider
from tests.infrastructure.supabase_doubles import EMAIL, KEY, loopback_supabase


def test_asking_for_another_signup_code() -> None:
    with loopback_supabase() as supabase:
        supabase.answer(200, {})

        SupabaseIdentityProvider(AccountConfiguration(supabase.url, KEY)).resend_signup(EMAIL)

        (request,) = supabase.received
    assert (request.method, request.path, request.query) == ("POST", "/auth/v1/resend", {})
    assert request.body == {"type": "signup", "email": EMAIL}
    assert request.headers["apikey"] == KEY
    assert "authorization" not in request.headers
