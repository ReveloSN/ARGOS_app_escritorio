"""«Adjunto el informe de junio» con un adjunto de mayo (CLAUDE.md §1, caso guía)."""

from collections.abc import Iterable, Iterator
from pathlib import PurePath

from argus.application.period_mentions import AttachedMonths, mentions_in, months_in
from argus.application.ports.text_similarity import TextSimilarity
from argus.application.review_analyzers import AnalysisContext
from argus.domain.alert import Alert, AlertCandidate, AlertSide
from argus.domain.comparison.difference import Difference, DifferenceKind
from argus.domain.document import Document
from argus.domain.risk_rules import RiskClassifier

# Por encima de este valor, la frase del correo y el adjunto tratan del mismo tema. Calibrado
# con el modelo multilingüe (ADR 016): «Adjunto el informe de junio con las tarifas» frente a
# «Anexo 2 tarifas · Tarifas mayo 2026» da 0,66; «la factura de energía de junio», 0,46.
SAME_TOPIC_SIMILARITY = 0.5
BASE_CONFIDENCE = 0.6
# El primer fragmento suele ser el título del adjunto; las filas siguientes (montos, detalles)
# diluyen el tema y bajan la similitud.
DESCRIPTION_FRAGMENTS = 1
CONFIDENCE_DIGITS = 2


def names_in(document: Document) -> frozenset[str]:
    """El nombre del documento y los de sus adjuntos, a cualquier profundidad."""
    nested = (name for attachment in document.attachments for name in names_in(attachment))
    return frozenset({document.name, *nested})


def describe(attachment: Document) -> str:
    """Nombre del archivo y su título: de qué trata el adjunto."""
    title = PurePath(attachment.name).stem.replace("_", " ")
    texts = [fragment.text for fragment in attachment.fragments[:DESCRIPTION_FRAGMENTS]]
    return " ".join([title, *texts])


class ReferencedPeriodSource:
    """Un correo cita un periodo y su adjunto, del mismo tema según los embeddings, es de otro.

    Sin la comparación semántica, cualquier mes mencionado en un correo se cruzaría con
    cualquier adjunto; el modelo decide si la frase del correo habla de ese adjunto.
    """

    def __init__(self, similarity: TextSimilarity, risk_classifier: RiskClassifier) -> None:
        self._similarity = similarity
        self._risk_classifier = risk_classifier

    def find(self, context: AnalysisContext) -> Iterable[Alert]:
        for email in context.documents:
            for attachment in email.attachments:
                attached = months_in(context.index, names_in(attachment))
                yield from self._mismatches(context, email, (attachment, attached))

    def _mismatches(
        self, context: AnalysisContext, email: Document, attachment: tuple[Document, AttachedMonths]
    ) -> Iterator[Alert]:
        document, attached = attachment
        if not attached.periods:
            return
        uncovered = [
            m for m in mentions_in(context.index, email.name) if not attached.covers(m.month)
        ]
        for mention in uncovered:
            yield from self._alert_if_same_topic(
                mention.side, attached.dominant, describe(document)
            )

    def _alert_if_same_topic(
        self, mention: AlertSide, attached: AlertSide, description: str
    ) -> Iterator[Alert]:
        excerpts = [entity.occurrence.excerpt for entity in mention.entities]
        similarity = max(self._similarity.similarities(description, excerpts))
        if similarity < SAME_TOPIC_SIMILARITY:
            return
        confidence = min(1.0, BASE_CONFIDENCE + similarity * (1 - BASE_CONFIDENCE))
        difference = Difference(
            DifferenceKind.REFERENCED_PERIOD, round(confidence, CONFIDENCE_DIGITS)
        )
        candidate = AlertCandidate(mention, attached, difference)
        risk = self._risk_classifier.classify(candidate)
        if risk is not None:
            yield Alert.from_candidate(candidate, risk)
