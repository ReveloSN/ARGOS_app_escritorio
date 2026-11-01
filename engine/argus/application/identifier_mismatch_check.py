from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.entity_extractor import EntityMatch
from argus.application.send_checks import FoundIssue, SendContext
from argus.domain.comparison.damerau_levenshtein import damerau_levenshtein
from argus.domain.document import Document
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendIssueKind

# Con menos caracteres un cambio de uno sería otro número, no una errata.
MIN_IDENTIFIER_LENGTH = 4
MAX_TYPO_DISTANCE = 1


def _is_typo_of(mentioned: str, attached: str) -> bool:
    """«4587» frente a «4857»: una sustitución o dos caracteres vecinos intercambiados."""
    if min(len(mentioned), len(attached)) < MIN_IDENTIFIER_LENGTH:
        return False
    return damerau_levenshtein(mentioned, attached) <= MAX_TYPO_DISTANCE


class IdentifierMismatchCheck:
    """El correo cita «Contrato No. 4587» y el adjunto dice 4857 (caso guía, CLAUDE.md §1).

    Solo avisa cuando el número citado no está en ningún adjunto y se parece a uno que sí: con
    números sin parecido no se sabe si hablan de otro contrato, y avisar sería ruido.
    """

    def __init__(self, pipeline: EntityExtractionPipeline) -> None:
        self._pipeline = pipeline

    def find(self, context: SendContext) -> Iterator[FoundIssue]:
        attached = self._attached_identifiers(context.content.attachments)
        if not attached:
            return
        draft = context.content.draft
        for part, text in ((DraftPart.SUBJECT, draft.subject), (DraftPart.BODY, draft.body)):
            yield from self._issues_in(part, text, attached)

    def _issues_in(
        self, part: DraftPart, text: str, attached: dict[str, str]
    ) -> Iterator[FoundIssue]:
        for match in self._identifiers(text):
            found = self._similar(match.normalized_value, attached)
            if found is not None:
                params = {
                    "mentioned": match.raw_value,
                    "attached": found,
                    "document": attached[found],
                }
                yield self._issue(part, match, params)

    def _identifiers(self, text: str) -> list[EntityMatch]:
        return [
            match for match in self._pipeline.matches(text) if match.type is EntityType.CONTRACT_ID
        ]

    def _attached_identifiers(self, attachments: tuple[Document, ...]) -> dict[str, str]:
        """Cada número de contrato de los adjuntos, con el archivo donde aparece."""
        return {
            entity.normalized_value: entity.occurrence.document_name
            for document in attachments
            for entity in self._pipeline.extract(document)
            if entity.type is EntityType.CONTRACT_ID
        }

    def _similar(self, mentioned: str, attached: dict[str, str]) -> str | None:
        if mentioned in attached:
            return None
        return next((found for found in attached if _is_typo_of(mentioned, found)), None)

    def _issue(self, part: DraftPart, match: EntityMatch, params: dict[str, str]) -> FoundIssue:
        return FoundIssue(
            SendIssueKind.IDENTIFIER_MISMATCH, RiskLevel.HIGH, part, match.raw_value, params
        )
