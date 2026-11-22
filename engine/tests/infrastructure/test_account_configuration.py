import base64
import json
from pathlib import Path

import pytest

from argus.infrastructure.identity.account_configuration import (
    BUNDLED_FILE_NAME,
    KEY_VARIABLE,
    URL_VARIABLE,
    AccountConfiguration,
    bundled_configuration_file,
    is_secret_key,
    read_account_configuration,
    validate_account_configuration,
)

URL = "https://proyecto.supabase.co"
LONG_S = chr(0x17F)  # IGNORECASE lo confunde con la «s».
KEY = "sb_publishable_clave-de-prueba"
VALID = {"url": URL, "publishableKey": KEY}


def jwt(role: str) -> str:
    parts = ({"alg": "HS256"}, {"role": role, "iss": "supabase"})
    encoded = [base64.urlsafe_b64encode(json.dumps(part).encode()).decode() for part in parts]
    return ".".join([*(part.rstrip("=") for part in encoded), "firma"])


def bundled(folder: Path, content: object) -> Path:
    file = folder / BUNDLED_FILE_NAME
    text = content if isinstance(content, str) else json.dumps(content)
    file.write_text(text, encoding="utf-8")
    return file


def test_the_variables_configure_the_account(tmp_path: Path) -> None:
    environ = {"ARGUS_SUPABASE_URL": URL, "ARGUS_SUPABASE_PUBLISHABLE_KEY": KEY}

    configuration = read_account_configuration(environ, tmp_path / BUNDLED_FILE_NAME)

    assert configuration == AccountConfiguration(URL, KEY)


@pytest.mark.parametrize("environ", [{}, {URL_VARIABLE: "", KEY_VARIABLE: "  "}])
def test_without_variables_the_bundled_file_is_used(
    tmp_path: Path, environ: dict[str, str]
) -> None:
    file = bundled(tmp_path, VALID)

    assert read_account_configuration(environ, file) == AccountConfiguration(URL, KEY)


def test_the_variables_win_over_the_file(tmp_path: Path) -> None:
    environ = {URL_VARIABLE: "https://otro.example", KEY_VARIABLE: "sb_publishable_otra"}

    configuration = read_account_configuration(environ, bundled(tmp_path, VALID))

    assert configuration == AccountConfiguration("https://otro.example", "sb_publishable_otra")


@pytest.mark.parametrize(
    "environ",
    [{URL_VARIABLE: URL}, {KEY_VARIABLE: KEY}, {URL_VARIABLE: "ftp://x", KEY_VARIABLE: KEY}],
)
def test_variables_are_never_mixed_with_the_file(tmp_path: Path, environ: dict[str, str]) -> None:
    assert read_account_configuration(environ, bundled(tmp_path, VALID)) is None


def test_without_any_configuration_there_is_none(tmp_path: Path) -> None:
    assert read_account_configuration({}, tmp_path / BUNDLED_FILE_NAME) is None
    assert read_account_configuration({}, tmp_path) is None


@pytest.mark.parametrize(
    "content", ["{no es json", "[]", {}, {"url": URL}, {"url": 1, "publishableKey": KEY}]
)
def test_an_invalid_file_is_no_configuration(tmp_path: Path, content: object) -> None:
    assert read_account_configuration({}, bundled(tmp_path, content)) is None


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (f" {URL}/ ", URL),
        ("https://auth.example.com:8443", "https://auth.example.com:8443"),
        ("http://localhost:54321", "http://localhost:54321"),
        ("http://127.0.0.1:8000/", "http://127.0.0.1:8000"),
    ],
)
def test_valid_addresses(url: str, expected: str) -> None:
    assert validate_account_configuration(url, KEY) == AccountConfiguration(expected, KEY)


@pytest.mark.parametrize(
    "url",
    [
        "",
        "proyecto.supabase.co",
        "http://proyecto.supabase.co",
        "http://127.0.0.2",
        "http://localhost.evil.com",
        "http://localhost@evil.com",
        "http://127.0.0.1\\@evil.com",
        "http://evil.com\\@127.0.0.1",
        f"http://localho{LONG_S}t",
        "https://usuario:clave@proyecto.supabase.co",
        f"{URL}/auth/v1",
        f"{URL}?x=1",
        f"{URL}#x",
        "https://",
        "https://proyecto .co",
    ],
)
def test_other_addresses_are_rejected(url: str) -> None:
    assert validate_account_configuration(url, KEY) is None


@pytest.mark.parametrize("key", ["sb_secret_abc", '"sb_secret_abc"', jwt("service_role")])
def test_a_secret_key_is_rejected(tmp_path: Path, key: str) -> None:
    environ = {URL_VARIABLE: URL, KEY_VARIABLE: key}
    file = bundled(tmp_path, {**VALID, "publishableKey": key})

    assert is_secret_key(key)
    assert validate_account_configuration(URL, key) is None
    assert read_account_configuration(environ, file) is None
    assert read_account_configuration({}, file) is None


@pytest.mark.parametrize("key", [KEY, jwt("anon"), "a.b.c", "a.%%%%.c", "a.ñ.c"])
def test_a_key_that_is_not_secret(key: str) -> None:
    assert not is_secret_key(key)


def test_an_anon_jwt_is_valid() -> None:
    assert validate_account_configuration(URL, jwt("anon")) is not None


@pytest.mark.parametrize("key", ["", "con espacio", "con\nsalto", "clave-ñ"])
def test_a_key_that_does_not_fit_in_a_header_is_rejected(key: str) -> None:
    assert validate_account_configuration(URL, key) is None


def test_the_bundled_file_is_next_to_the_package() -> None:
    # En el motor empaquetado esa carpeta es _internal, donde PyInstaller deja los datos.
    engine_directory = Path(__file__).resolve().parents[2]
    assert bundled_configuration_file() == engine_directory / "account-config.json"
