import re
from collections.abc import Iterator
from decimal import Decimal

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.domain.values import DEFAULT_CURRENCY, Money
from argus.infrastructure.extraction.normalization import format_decimal, parse_colombian_number

CURRENCY_BY_SYMBOL = {
    "$": DEFAULT_CURRENCY,
    "COP": "COP",
    "PESOS": "COP",
    "USD": "USD",
    "US$": "USD",
    "DÓLARES": "USD",
    "DOLARES": "USD",
}
MILLION = Decimal(1_000_000)

# «1,200.50» (punto decimal, coma de miles) va primero: «1,200» con tres cifras tras la coma son
# miles, no un decimal; los montos con decimales de es-CO llevan una o dos cifras tras la coma.
AMOUNT = (
    r"(?:(?P<us_amount>\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)"
    r"|(?P<amount>\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?))"
)
# «36,9 millones» primero: así «$ 36 millones» no se lee también como «$ 36».
AMOUNT_IN_MILLIONS = re.compile(
    r"(?:\$\s?)?\b(?P<amount>\d+(?:,\d+)?)\s+millones\b(?:\s+de\s+pesos)?", re.IGNORECASE
)
CURRENCY_BEFORE_AMOUNT = re.compile(
    rf"(?P<currency>US\$|\$|\bCOP\b|\bUSD\b)\s?{AMOUNT}",
    re.IGNORECASE,
)
# «18.450.000 COP», «1.200 dólares»: la moneda detrás. Si el número ya lleva moneda delante, esa
# lectura gana y esta no lo repite.
CURRENCY_AFTER_AMOUNT = re.compile(
    rf"(?<![\d.,]){AMOUNT}\s?(?P<currency>\bCOP\b|\bUSD\b|\bpesos\b|\bdólares\b|\bdolares\b)",
    re.IGNORECASE,
)


class MoneyExtractor:
    """Reconoce montos con moneda (delante o detrás) o escritos en millones.

    Acepta el formato numérico de es-CO y el de en-US («USD 1,200.50»). Un número sin moneda no
    se toma como monto: sin contexto no se distingue de una cantidad.
    """

    def extract(self, text: str) -> Iterator[EntityMatch]:
        claimed: list[EntityMatch] = []
        for match in _candidates(text):
            if not any(match.overlaps(other) for other in claimed):
                claimed.append(match)
                yield match


def _candidates(text: str) -> Iterator[EntityMatch]:
    """Por orden de prioridad: millones, moneda delante y, al final, moneda detrás."""
    yield from (_millions_match(match) for match in AMOUNT_IN_MILLIONS.finditer(text))
    yield from (_currency_match(match) for match in CURRENCY_BEFORE_AMOUNT.finditer(text))
    yield from (_currency_match(match) for match in CURRENCY_AFTER_AMOUNT.finditer(text))


def _millions_match(match: re.Match[str]) -> EntityMatch:
    money = Money(parse_colombian_number(match.group("amount")) * MILLION)
    return _to_match(match, money)


def _parse_amount(match: re.Match[str]) -> Decimal:
    us_amount = match.group("us_amount")
    if us_amount is not None:
        return Decimal(us_amount.replace(",", ""))
    return parse_colombian_number(match.group("amount"))


def _currency_match(match: re.Match[str]) -> EntityMatch:
    currency = CURRENCY_BY_SYMBOL[match.group("currency").upper()]
    return _to_match(match, Money(_parse_amount(match), currency))


def _to_match(match: re.Match[str], money: Money) -> EntityMatch:
    normalized = f"{money.currency}:{format_decimal(money.amount)}"
    return EntityMatch(EntityType.MONEY, match.group(), normalized, match.start(), match.end())
