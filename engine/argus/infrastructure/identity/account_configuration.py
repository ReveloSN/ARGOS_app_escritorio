"""A qué proyecto de Supabase se conecta la cuenta. Sin configuración válida, la cuenta no existe.

Lo comparten el motor y el script que escribe el archivo al empaquetar.
"""

import re
from base64 import urlsafe_b64decode
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path

from argus.infrastructure.identity.json_fields import parse_json_object, text_in

URL_VARIABLE = "ARGUS_SUPABASE_URL"
KEY_VARIABLE = "ARGUS_SUPABASE_PUBLISHABLE_KEY"
BUNDLED_FILE_NAME = "account-config.json"
URL_FIELD = "url"
KEY_FIELD = "publishableKey"
SECRET_KEY_MARK = "sb_secret_"
SERVICE_ROLE = "service_role"
BASE64_BLOCK = 4

# Solo el origen: sin usuario, ruta ni consulta. Sin cifrar solo se admite dentro del equipo,
# para un Supabase de mentira en las pruebas de punta a punta. ASCII: sin él, la s larga pasa por s.
_ALLOWED_URL = re.compile(
    r"(https://[a-z0-9][a-z0-9.-]*|http://(localhost|127\.0\.0\.1))(:[0-9]{1,5})?/?",
    re.IGNORECASE | re.ASCII,
)
# La clave viaja en una cabecera: ASCII visible, sin espacios ni saltos de línea.
_HEADER_SAFE_KEY = re.compile(r"[!-~]+")


@dataclass(frozen=True)
class AccountConfiguration:
    url: str
    publishable_key: str


def bundled_configuration_file() -> Path:
    """`_internal/account-config.json` en el motor empaquetado; desde el código no existe."""
    return Path(__file__).resolve().parents[3] / BUNDLED_FILE_NAME


def read_account_configuration(
    environ: Mapping[str, str], bundled_file: Path
) -> AccountConfiguration | None:
    url = environ.get(URL_VARIABLE, "").strip()
    key = environ.get(KEY_VARIABLE, "").strip()
    if url or key:
        # No se mezclan: la clave de un proyecto no sirve con la dirección de otro.
        return validate_account_configuration(url, key)
    return _read_bundled_file(bundled_file)


def validate_account_configuration(url: str, key: str) -> AccountConfiguration | None:
    url, key = url.strip(), key.strip()
    if not (_ALLOWED_URL.fullmatch(url) and _HEADER_SAFE_KEY.fullmatch(key)):
        return None
    return None if is_secret_key(key) else AccountConfiguration(url.rstrip("/"), key)


def is_secret_key(key: str) -> bool:
    """Una clave de servidor salta los permisos de Supabase: nunca debe viajar en la app."""
    if SECRET_KEY_MARK in key:
        return True
    _header, separator, rest = key.partition(".")
    return bool(separator) and _role_in(rest.partition(".")[0]) == SERVICE_ROLE


def _role_in(jwt_claims: str) -> str | None:
    padding = "=" * (-len(jwt_claims) % BASE64_BLOCK)
    try:
        decoded = urlsafe_b64decode(jwt_claims + padding)
    except ValueError:
        return None
    return text_in(parse_json_object(decoded) or {}, "role")


def _read_bundled_file(file: Path) -> AccountConfiguration | None:
    try:
        content = file.read_bytes()
    except OSError:
        return None
    fields = parse_json_object(content) or {}
    url, key = text_in(fields, URL_FIELD), text_in(fields, KEY_FIELD)
    return validate_account_configuration(url, key) if url and key else None
