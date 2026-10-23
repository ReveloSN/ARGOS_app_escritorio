import re
from collections.abc import Iterator
from decimal import Decimal

from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import NamedFragment
from argus.domain.entity import EntityType
from argus.domain.risk_rules import RiskClassifier
from argus.domain.values import DEFAULT_CURRENCY
from argus.infrastructure.checks.checked_values import (
    CheckedValue,
    FoundPair,
    TextSpan,
    entity_in,
    fragments_of,
    paired_alert,
)
from argus.infrastructure.extraction.normalization import format_decimal, parse_colombian_number
from argus.infrastructure.extraction.spanish_number_words import trailing_number

DIGITS = (
    r"(?P<digits>(?P<currency>US\$|\$|\bCOP\b|\bUSD\b)\s?"
    r"(?P<amount>\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?))"
)
WORDS = r"(?P<words>[^()\d$]{3,160})"
# «$ 18.450.000 (dieciocho millones…)» y «dieciocho millones… ($ 18.450.000)».
DIGITS_THEN_WORDS = re.compile(DIGITS + r"\s*\(" + WORDS + r"\)", re.IGNORECASE)
WORDS_THEN_DIGITS = re.compile(WORDS + r"\(\s*" + DIGITS + r"\s*\)", re.IGNORECASE)
CURRENCY_BY_SYMBOL = {"$": DEFAULT_CURRENCY, "COP": "COP", "USD": "USD", "US$": "USD"}
# Escribir la cifra dos veces es para evitar errores: si no coinciden, casi seguro es un error.
WORDS_MISMATCH_CONFIDENCE = 0.95


class AmountInWordsSource:
    """Verificación interna: el monto en números y el mismo monto en letras deben coincidir."""

    def __init__(self, classifier: RiskClassifier) -> None:
        self._classifier = classifier

    def find(self, context: AnalysisContext) -> Iterator[Alert]:
        for named in fragments_of(context.documents):
            for pattern in (DIGITS_THEN_WORDS, WORDS_THEN_DIGITS):
                found = (
                    self._mismatch(named, match) for match in pattern.finditer(named.fragment.text)
                )
                yield from (alert for alert in found if alert is not None)

    def _mismatch(self, named: NamedFragment, match: re.Match[str]) -> Alert | None:
        written = trailing_number(match.group("words"))
        amount = parse_colombian_number(match.group("amount"))
        if written is None or Decimal(written.value) == amount:
            return None
        currency = CURRENCY_BY_SYMBOL[match.group("currency").upper()]
        digits = CheckedValue(
            EntityType.MONEY, match.group("digits"), f"{currency}:{format_decimal(amount)}"
        )
        words = CheckedValue(EntityType.MONEY, written.text, f"{currency}:{written.value}")
        span = TextSpan(match.start(), match.end())
        pair = FoundPair(
            entity_in(named, span, digits),
            entity_in(named, span, words),
            Difference(DifferenceKind.AMOUNT_IN_WORDS, WORDS_MISMATCH_CONFIDENCE),
        )
        return paired_alert(pair, self._classifier)
