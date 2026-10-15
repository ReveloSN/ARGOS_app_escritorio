import re
from collections.abc import Iterator
from decimal import Decimal

from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.entity import EntityType
from argus.domain.values import DEFAULT_CURRENCY, Money
from argus.infrastructure.extraction.normalization import format_decimal, parse_colombian_number

CURRENCY_BY_SYMBOL = {"$": DEFAULT_CURRENCY, "COP": "COP", "USD": "USD", "US$": "USD"}
MILLION = Decimal(1_000_000)

# «36,9 millones» primero: así «$ 36 millones» no se lee también como «$ 36».
AMOUNT_IN_MILLIONS = re.compile(
    r"(?:\$\s?)?\b(?P<amount>\d+(?:,\d+)?)\s+millones\b(?:\s+de\s+pesos)?", re.IGNORECASE
)
AMOUNT_WITH_CURRENCY = re.compile(
    r"(?P<currency>US\$|\$|\bCOP\b|\bUSD\b)\s?"
    r"(?P<amount>\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)",
    re.IGNORECASE,
)


class MoneyExtractor:
    """Reconoce montos con moneda o escritos en millones, con el formato numérico de es-CO.

    Un número sin moneda no se toma como monto: sin contexto no se distingue de una cantidad.
    """

    def extract(self, text: str) -> Iterator[EntityMatch]:
        yield from (_millions_match(match) for match in AMOUNT_IN_MILLIONS.finditer(text))
        yield from (_currency_match(match) for match in AMOUNT_WITH_CURRENCY.finditer(text))


def _millions_match(match: re.Match[str]) -> EntityMatch:
    money = Money(parse_colombian_number(match.group("amount")) * MILLION)
    return _to_match(match, money)


def _currency_match(match: re.Match[str]) -> EntityMatch:
    currency = CURRENCY_BY_SYMBOL[match.group("currency").upper()]
    return _to_match(match, Money(parse_colombian_number(match.group("amount")), currency))


def _to_match(match: re.Match[str], money: Money) -> EntityMatch:
    normalized = f"{money.currency}:{format_decimal(money.amount)}"
    return EntityMatch(EntityType.MONEY, match.group(), normalized, match.start(), match.end())
