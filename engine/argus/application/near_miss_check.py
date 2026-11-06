from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.entity_extractor import EntityMatch
from argus.application.send_checks import FoundIssue, SendContext
from argus.domain.comparison.damerau_levenshtein import damerau_levenshtein
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendIssueKind

# Con menos caracteres un cambio de uno sería otro valor, no una errata.
MIN_VALUE_LENGTH = 4
MAX_TYPO_DISTANCE = 1


def is_typo_of(mentioned: str, attached: str) -> bool:
    """«4587» frente a «4857»: una sustitución o dos caracteres vecinos intercambiados."""
    if min(len(mentioned), len(attached)) < MIN_VALUE_LENGTH:
        return False
    return damerau_levenshtein(mentioned, attached) <= MAX_TYPO_DISTANCE


class NearMissCheck:
    """Un valor del correo que no está en ningún adjunto pero se parece a uno que sí (una errata).

    Solo avisa en ese caso: con valores sin parecido no se sabe si hablan de otra cosa, y avisar
    sería ruido. Cada subclase fija qué tipo de dato revisa y cómo se llama el problema.
    """

    def __init__(
        self, pipeline: EntityExtractionPipeline, entity_type: EntityType, kind: SendIssueKind
    ) -> None:
        self._pipeline = pipeline
        self._entity_type = entity_type
        self._kind = kind

    def find(self, context: SendContext) -> Iterator[FoundIssue]:
        attached = self._attached_values(context.content.attachments)
        if not attached:
            return
        draft = context.content.draft
        for part, text in ((DraftPart.SUBJECT, draft.subject), (DraftPart.BODY, draft.body)):
            yield from self._issues_in(part, text, attached)

    def _issues_in(
        self, part: DraftPart, text: str, attached: dict[str, tuple[str, str]]
    ) -> Iterator[FoundIssue]:
        for match in self._mentioned(text):
            found = self._similar(match.normalized_value, attached)
            if found is not None:
                raw, document = attached[found]
                params = {"mentioned": match.raw_value, "attached": raw, "document": document}
                yield FoundIssue(self._kind, RiskLevel.HIGH, part, match.raw_value, params)

    def _mentioned(self, text: str) -> list[EntityMatch]:
        return [match for match in self._pipeline.matches(text) if match.type is self._entity_type]

    def _attached_values(self, attachments: tuple[Document, ...]) -> dict[str, tuple[str, str]]:
        """Cada valor de los adjuntos (normalizado) con cómo está escrito y el archivo donde sale."""
        return {
            entity.normalized_value: (entity.raw_value, entity.occurrence.document_name)
            for document in attachments
            for entity in self._pipeline.extract(document)
            if entity.type is self._entity_type
        }

    def _similar(self, mentioned: str, attached: dict[str, tuple[str, str]]) -> str | None:
        if mentioned in attached:
            return None
        return next((found for found in attached if is_typo_of(mentioned, found)), None)
