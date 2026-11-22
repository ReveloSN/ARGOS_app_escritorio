from http import HTTPStatus

from fastapi import APIRouter

from argus.api.account_composition import AccountServices
from argus.api.composition import EngineServices
from argus.api.schemas.account import (
    AccountResponse,
    AccountStateResponse,
    EmailBody,
    PasswordResetBody,
    SignInBody,
    SignUpBody,
    SignUpResponse,
    VerifyBody,
)
from argus.api.secret_safe_route import SecretSafeRoute
from argus.domain.account import Account, AccountState, Credentials


def _account(account: Account | None) -> AccountResponse | None:
    if account is None:
        return None
    return AccountResponse(id=account.id, email=account.email, display_name=account.display_name)


def _state(state: AccountState) -> AccountStateResponse:
    return AccountStateResponse(
        status=state.status,
        account=_account(state.account),
        email=state.email,
        gate_skipped=state.gate_skipped,
        is_offline=state.is_offline,
        is_persisted=state.is_persisted,
    )


def build_account_router(services: EngineServices) -> APIRouter:
    """La cuenta como puerta de entrada. Las rutas son `def`: la red va en el grupo de hilos."""
    router = APIRouter(prefix="/account", route_class=SecretSafeRoute)
    _add_session_routes(router, services.account)
    _add_access_routes(router, services.account)
    _add_password_routes(router, services.account)
    return router


def _add_session_routes(router: APIRouter, account: AccountServices) -> None:
    @router.get("")
    def read_account() -> AccountStateResponse:
        return _state(account.sessions.current())

    @router.post("/refresh")
    def refresh_session() -> AccountStateResponse:
        return _state(account.sessions.refresh())

    @router.post("/sign-out")
    def sign_out() -> AccountStateResponse:
        return _state(account.sign_out.execute())

    @router.post("/skip")
    def skip_gate() -> AccountStateResponse:
        return _state(account.sessions.skip())


def _add_access_routes(router: APIRouter, account: AccountServices) -> None:
    @router.post("/sign-up")
    def sign_up(body: SignUpBody) -> SignUpResponse:
        result = account.sign_up.execute(Credentials(body.email, body.password), body.display_name)
        return SignUpResponse(
            state=_state(result.state), needs_confirmation=result.needs_confirmation
        )

    @router.post("/verify")
    def verify_email(body: VerifyBody) -> AccountStateResponse:
        return _state(account.sign_up.verify(body.email, body.code))

    @router.post("/sign-in")
    def sign_in(body: SignInBody) -> AccountStateResponse:
        return _state(account.sign_in.execute(Credentials(body.email, body.password)))


def _add_password_routes(router: APIRouter, account: AccountServices) -> None:
    @router.post("/password-reset", status_code=HTTPStatus.NO_CONTENT)
    def request_password_reset(body: EmailBody) -> None:
        account.password_reset.request(body.email)

    @router.post("/password-reset/confirm")
    def confirm_password_reset(body: PasswordResetBody) -> AccountStateResponse:
        return _state(account.password_reset.confirm(body.email, body.code, body.password))
