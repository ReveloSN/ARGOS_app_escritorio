"""Arranque del motor como proceso hijo de la app de escritorio (ADR 004 y 008).

El motor escucha solo en 127.0.0.1, anuncia su puerto con una línea JSON en stdout y, si se le
pide, termina cuando se cierra su stdin: así no queda huérfano si la app se cierra o falla.
"""

import argparse
import json
import os
import socket
import sys
import threading
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import TextIO

import uvicorn

from argus.api.app import create_app
from argus.api.settings import EngineSettings

LOOPBACK_HOST = "127.0.0.1"
ANY_FREE_PORT = 0
TOKEN_ENV_VAR = "ARGUS_ENGINE_TOKEN"
READY_EVENT = "ready"


class MissingAccessTokenError(Exception):
    def __init__(self) -> None:
        super().__init__(f"Falta la variable de entorno {TOKEN_ENV_VAR} con el token de acceso.")


@dataclass(frozen=True)
class LaunchOptions:
    port: int
    exits_on_stdin_close: bool


def parse_launch_options(argv: Sequence[str]) -> LaunchOptions:
    parser = argparse.ArgumentParser(prog="argus", description="Motor local de ARGUS.")
    parser.add_argument("--port", type=int, default=ANY_FREE_PORT)
    parser.add_argument("--exit-on-stdin-close", action="store_true")
    arguments = parser.parse_args(argv)
    return LaunchOptions(port=arguments.port, exits_on_stdin_close=arguments.exit_on_stdin_close)


def read_access_token(environ: Mapping[str, str]) -> str:
    token = environ.get(TOKEN_ENV_VAR, "")
    if not token:
        raise MissingAccessTokenError
    return token


def bind_loopback_socket(port: int) -> socket.socket:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind((LOOPBACK_HOST, port))
    # Escuchar antes de anunciar: las conexiones que lleguen esperan en cola hasta que
    # uvicorn empiece a aceptarlas, en lugar de ser rechazadas.
    sock.listen()
    return sock


def format_ready_announcement(port: int) -> str:
    return json.dumps({"event": READY_EVENT, "port": port})


def stop_when_stdin_closes(server: uvicorn.Server, stdin: TextIO) -> None:
    def wait_for_end_of_input() -> None:
        stdin.read()
        server.should_exit = True

    threading.Thread(target=wait_for_end_of_input, daemon=True).start()


def run(options: LaunchOptions, access_token: str) -> None:
    settings = EngineSettings.from_installed_package(access_token=access_token)
    server = uvicorn.Server(uvicorn.Config(create_app(settings), access_log=False))
    with bind_loopback_socket(options.port) as sock:
        print(format_ready_announcement(sock.getsockname()[1]), flush=True)
        if options.exits_on_stdin_close:
            stop_when_stdin_closes(server, sys.stdin)
        server.run(sockets=[sock])


def main() -> None:
    options = parse_launch_options(sys.argv[1:])
    try:
        access_token = read_access_token(os.environ)
    except MissingAccessTokenError as error:
        sys.exit(str(error))
    run(options, access_token)
