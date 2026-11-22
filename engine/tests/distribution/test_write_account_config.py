import base64
import importlib.util
import json
from collections.abc import Callable, Mapping
from pathlib import Path
from types import ModuleType

import pytest

from argus.infrastructure.identity.account_configuration import (
    AccountConfiguration,
    read_account_configuration,
)

ENGINE_DIR = Path(__file__).resolve().parents[2]
SCRIPT = ENGINE_DIR / "distribution" / "write_account_config.py"
URL = "https://proyecto.supabase.co"
KEY = "sb_publishable_clave-de-prueba"
SECRET = "sb_secret_clave-de-servidor-no-publicar"
JWT_SERVICE_ROLE = (
    base64.urlsafe_b64encode(b'{"alg":"HS256"}').decode().rstrip("=")
    + "."
    + base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip("=")
    + ".firma"
)
CONFIGURE = Callable[[Mapping[str, str], Path], int]


def load_script() -> ModuleType:
    spec = importlib.util.spec_from_file_location("write_account_config", SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def configure_function() -> CONFIGURE:
    configure: CONFIGURE = load_script().configure_account
    return configure


def test_both_variables_write_the_file_read_by_the_engine(tmp_path: Path) -> None:
    target = tmp_path / "account-config.json"
    environ = {"ARGUS_SUPABASE_URL": URL, "ARGUS_SUPABASE_PUBLISHABLE_KEY": KEY}

    exit_code = configure_function()(environ, target)

    assert exit_code == 0
    assert json.loads(target.read_text(encoding="utf-8")) == {"url": URL, "publishableKey": KEY}
    assert read_account_configuration({}, target) == AccountConfiguration(URL, KEY)


def test_the_file_uses_lf_line_endings(tmp_path: Path) -> None:
    target = tmp_path / "account-config.json"
    environ = {"ARGUS_SUPABASE_URL": URL, "ARGUS_SUPABASE_PUBLISHABLE_KEY": KEY}

    configure_function()(environ, target)

    assert target.read_bytes().endswith(b"}\n")
    assert b"\r" not in target.read_bytes()


@pytest.mark.parametrize(
    "environ", [{}, {"ARGUS_SUPABASE_URL": "", "ARGUS_SUPABASE_PUBLISHABLE_KEY": "  "}]
)
def test_without_variables_nothing_is_written_and_the_build_goes_on(
    tmp_path: Path, environ: dict[str, str], capsys: pytest.CaptureFixture[str]
) -> None:
    target = tmp_path / "account-config.json"

    exit_code = configure_function()(environ, target)

    assert exit_code == 0
    assert not target.exists()
    assert "no se incluye" in capsys.readouterr().out


def test_a_stale_file_is_removed_when_there_are_no_variables(tmp_path: Path) -> None:
    target = tmp_path / "account-config.json"
    target.write_text(
        '{"url": "https://SU-PROYECTO.supabase.co", "publishableKey": "x"}', encoding="utf-8"
    )

    exit_code = configure_function()({}, target)

    assert exit_code == 0
    assert not target.exists()


@pytest.mark.parametrize("key", [SECRET, JWT_SERVICE_ROLE])
def test_a_secret_key_fails_without_printing_it(
    tmp_path: Path, key: str, capsys: pytest.CaptureFixture[str]
) -> None:
    target = tmp_path / "account-config.json"
    environ = {"ARGUS_SUPABASE_URL": URL, "ARGUS_SUPABASE_PUBLISHABLE_KEY": key}

    exit_code = configure_function()(environ, target)

    captured = capsys.readouterr()
    assert exit_code != 0
    assert key not in captured.out + captured.err
    assert not target.exists()


@pytest.mark.parametrize(
    "environ",
    [
        {"ARGUS_SUPABASE_URL": URL},
        {"ARGUS_SUPABASE_PUBLISHABLE_KEY": KEY},
    ],
)
def test_only_one_variable_fails_without_printing_the_value(
    tmp_path: Path, environ: dict[str, str], capsys: pytest.CaptureFixture[str]
) -> None:
    target = tmp_path / "account-config.json"

    exit_code = configure_function()(environ, target)

    captured = capsys.readouterr()
    assert exit_code != 0
    assert URL not in captured.err
    assert KEY not in captured.err
    assert not target.exists()


@pytest.mark.parametrize("url", ["http://ejemplo.com", "https://proyecto.supabase.co/rest/v1"])
def test_an_invalid_url_fails_without_writing(
    tmp_path: Path, url: str, capsys: pytest.CaptureFixture[str]
) -> None:
    target = tmp_path / "account-config.json"
    environ = {"ARGUS_SUPABASE_URL": url, "ARGUS_SUPABASE_PUBLISHABLE_KEY": KEY}

    exit_code = configure_function()(environ, target)

    assert exit_code != 0
    assert url not in capsys.readouterr().err
    assert not target.exists()
