import json
import os
import subprocess
import sys
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from urllib.request import Request, urlopen

import pytest

from argus.api.server import (
    LOOPBACK_HOST,
    TOKEN_ENV_VAR,
    LaunchOptions,
    MissingAccessTokenError,
    bind_loopback_socket,
    format_ready_announcement,
    parse_launch_options,
    read_access_token,
)
from tests.api.conftest import TEST_TOKEN

STARTUP_TIMEOUT_SECONDS = 30
SHUTDOWN_TIMEOUT_SECONDS = 10


def test_launch_options_default_to_any_free_port_without_stdin_watch() -> None:
    assert parse_launch_options([]) == LaunchOptions(port=0, exits_on_stdin_close=False)


def test_launch_options_accept_fixed_port_and_stdin_watch() -> None:
    options = parse_launch_options(["--port", "8765", "--exit-on-stdin-close"])

    assert options == LaunchOptions(port=8765, exits_on_stdin_close=True)


def test_access_token_is_read_from_environment() -> None:
    assert read_access_token({TOKEN_ENV_VAR: TEST_TOKEN}) == TEST_TOKEN


@pytest.mark.parametrize("environ", [{}, {TOKEN_ENV_VAR: ""}])
def test_missing_access_token_stops_the_launch(environ: dict[str, str]) -> None:
    with pytest.raises(MissingAccessTokenError):
        read_access_token(environ)


def test_socket_is_bound_to_loopback_on_a_free_port() -> None:
    with bind_loopback_socket(0) as sock:
        host, port = sock.getsockname()

    assert host == LOOPBACK_HOST
    assert port > 0


def test_ready_announcement_is_a_single_json_line() -> None:
    announcement = format_ready_announcement(51234)

    assert "\n" not in announcement
    assert json.loads(announcement) == {"event": "ready", "port": 51234}


@pytest.fixture
def engine_process() -> Iterator[subprocess.Popen[str]]:
    with subprocess.Popen(
        [sys.executable, "-m", "argus", "--exit-on-stdin-close"],
        env={**os.environ, TOKEN_ENV_VAR: TEST_TOKEN},
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    ) as process:
        yield process
        process.kill()


def read_announced_port(process: subprocess.Popen[str]) -> int:
    assert process.stdout is not None
    with ThreadPoolExecutor(max_workers=1) as executor:
        line = executor.submit(process.stdout.readline).result(timeout=STARTUP_TIMEOUT_SECONDS)
    port: int = json.loads(line)["port"]
    return port


def test_engine_process_serves_health_and_exits_when_stdin_closes(
    engine_process: subprocess.Popen[str],
) -> None:
    port = read_announced_port(engine_process)
    request = Request(
        f"http://{LOOPBACK_HOST}:{port}/health",
        headers={"Authorization": f"Bearer {TEST_TOKEN}"},
    )
    with urlopen(request, timeout=STARTUP_TIMEOUT_SECONDS) as response:
        assert response.status == 200

    assert engine_process.stdin is not None
    engine_process.stdin.close()

    assert engine_process.wait(timeout=SHUTDOWN_TIMEOUT_SECONDS) == 0
