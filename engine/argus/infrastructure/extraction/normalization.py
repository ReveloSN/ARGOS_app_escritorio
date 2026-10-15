import re
import unicodedata
from decimal import Decimal

NON_ALPHANUMERIC = re.compile(r"[^\w\s]")


def only_digits(text: str) -> str:
    return "".join(character for character in text if character.isdigit())


def strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def normalize_name(text: str) -> str:
    """Forma comparable de un nombre: sin tildes, puntuación ni diferencias de mayúsculas."""
    without_punctuation = NON_ALPHANUMERIC.sub(" ", strip_accents(text))
    return " ".join(without_punctuation.casefold().split())


def parse_colombian_number(text: str) -> Decimal:
    """«18.450.000,50» → 18450000.50: punto de miles y coma decimal (es-CO)."""
    return Decimal(text.replace(".", "").replace(",", "."))


def format_decimal(amount: Decimal) -> str:
    """Representación canónica sin ceros sobrantes ni notación científica: 18450000, 1250.5."""
    return format(amount.normalize(), "f")
