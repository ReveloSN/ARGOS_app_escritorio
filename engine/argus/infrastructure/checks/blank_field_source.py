import re
from collections import defaultdict
from collections.abc import Iterator

from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import NamedFragment
from argus.domain.entity import Entity, EntityType
from argus.domain.risk_rules import RiskClassifier
from argus.infrastructure.checks.checked_values import (
    CheckedValue,
    TextSpan,
    entity_in,
    fragments_of,
    single_alert,
)
from argus.infrastructure.extraction.normalization import strip_accents

BLANK = r"_{3,}"
# Espacios para llenar con su tipo de dato: «$ ______», «__/__/____», «Contrato No. ____».
BLANK_PATTERNS: tuple[tuple[EntityType, re.Pattern[str]], ...] = (
    (EntityType.MONEY, re.compile(r"\$\s*" + BLANK)),
    (EntityType.DATE, re.compile(r"_{1,2}/_{1,2}/_{2,4}|_{2,}\s+de\s+_{3,}\s+de\s+(?:20)?_{2,4}")),
    (
        EntityType.CONTRACT_ID,
        re.compile(r"\bcontrato\s+(?:no\.?|n[úu]mero)\s*" + BLANK, re.IGNORECASE),
    ),
    (
        EntityType.TAX_ID,
        re.compile(r"\b(?:NIT|C\.?C\.?)\s*:?\s*(?:no\.?\s*)?" + BLANK, re.IGNORECASE),
    ),
)
# Marcadores de plantilla en mayúsculas: «[FECHA DE INICIO]», «[NOMBRE DEL ARRENDATARIO]».
PLACEHOLDER = re.compile(r"\[(?P<label>[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]{2,40})\]")
# La primera palabra que aparezca en el marcador decide su tipo; sin ninguna, no se marca.
PLACEHOLDER_TYPES: tuple[tuple[str, EntityType], ...] = (
    ("FECHA", EntityType.DATE),
    ("VALOR", EntityType.MONEY),
    ("MONTO", EntityType.MONEY),
    ("CANON", EntityType.MONEY),
    ("PRECIO", EntityType.MONEY),
    ("NIT", EntityType.TAX_ID),
    ("CEDULA", EntityType.TAX_ID),
    ("CONTRATO", EntityType.CONTRACT_ID),
    ("RAZON SOCIAL", EntityType.ORGANIZATION_NAME),
    ("EMPRESA", EntityType.ORGANIZATION_NAME),
    ("NOMBRE", EntityType.PERSON_NAME),
    ("PERIODO", EntityType.PERIOD),
)
# Un espacio en blanco o un marcador de plantilla sin llenar no admite otra lectura.
BLANK_FIELD_CONFIDENCE = 0.9

type FieldKey = tuple[EntityType, str]


def placeholder_type(label: str) -> EntityType | None:
    folded = strip_accents(label).upper()
    return next((entity_type for word, entity_type in PLACEHOLDER_TYPES if word in folded), None)


def _blank_matches(text: str) -> Iterator[tuple[EntityType, re.Match[str]]]:
    for entity_type, pattern in BLANK_PATTERNS:
        yield from ((entity_type, match) for match in pattern.finditer(text))
    for match in PLACEHOLDER.finditer(text):
        placeholder = placeholder_type(match.group("label"))
        if placeholder is not None:
            yield placeholder, match


def _blank_fields_in(named: NamedFragment) -> Iterator[Entity]:
    for entity_type, match in _blank_matches(named.fragment.text):
        value = CheckedValue(entity_type, match.group(), match.group())
        yield entity_in(named, TextSpan(match.start(), match.end()), value)


class BlankFieldSource:
    """Verificación interna: espacios y marcadores de plantilla que quedaron sin llenar."""

    def __init__(self, classifier: RiskClassifier) -> None:
        self._classifier = classifier

    def find(self, context: AnalysisContext) -> Iterator[Alert]:
        difference = Difference(DifferenceKind.BLANK_FIELD, BLANK_FIELD_CONFIDENCE)
        found: defaultdict[FieldKey, list[Entity]] = defaultdict(list)
        for named in fragments_of(context.documents):
            for entity in _blank_fields_in(named):
                found[(entity.type, entity.raw_value)].append(entity)
        alerts = (
            single_alert(AlertSide(tuple(entities)), difference, self._classifier)
            for entities in found.values()
        )
        yield from (alert for alert in alerts if alert is not None)
