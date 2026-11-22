"""Escribe la configuración de la cuenta para el instalador (ADR 033).

Lee ARGUS_SUPABASE_URL y ARGUS_SUPABASE_PUBLISHABLE_KEY del entorno. Si son válidas, escribe
`distribution/account-config.json`, que el spec de PyInstaller incluye en el motor. Sin ninguna
de las dos no escribe nada: el instalador sale sin cuenta.

Uso, desde engine/:
    uv run python distribution/write_account_config.py
"""

import json
import os
import sys
from collections.abc import Mapping
from pathlib import Path

from argus.infrastructure.identity.account_configuration import (
    BUNDLED_FILE_NAME,
    KEY_FIELD,
    KEY_VARIABLE,
    URL_FIELD,
    URL_VARIABLE,
    AccountConfiguration,
    is_secret_key,
    validate_account_configuration,
)

TARGET = Path(__file__).resolve().parent / BUNDLED_FILE_NAME


def configure_account(environ: Mapping[str, str], target: Path) -> int:
    url = environ.get(URL_VARIABLE, "").strip()
    key = environ.get(KEY_VARIABLE, "").strip()
    if not url and not key:
        return _skip_account(target)
    if is_secret_key(key):
        return _fail(
            f"{KEY_VARIABLE} tiene una clave secreta. Use la clave publicable; no se escribió nada."
        )
    if not url or not key:
        return _fail(
            f"Deben estar las dos variables o ninguna: {URL_VARIABLE} y {KEY_VARIABLE}. No se escribió nada."
        )
    configuration = validate_account_configuration(url, key)
    if configuration is None:
        return _fail(
            f"{URL_VARIABLE} o {KEY_VARIABLE} no tienen el formato esperado. No se escribió nada."
        )
    _write(configuration, target)
    print(f"Cuenta incluida en {target.name}.")
    return 0


def _skip_account(target: Path) -> int:
    target.unlink(missing_ok=True)
    print("Sin variables de cuenta: la cuenta no se incluye en este instalador.")
    return 0


def _fail(message: str) -> int:
    print(message, file=sys.stderr)
    return 1


def _write(configuration: AccountConfiguration, target: Path) -> None:
    fields = {URL_FIELD: configuration.url, KEY_FIELD: configuration.publishable_key}
    text = json.dumps(fields, ensure_ascii=False) + "\n"
    target.write_text(text, encoding="utf-8", newline="\n")


def main() -> None:
    sys.exit(configure_account(os.environ, TARGET))


if __name__ == "__main__":
    main()
