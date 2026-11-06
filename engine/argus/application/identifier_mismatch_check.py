from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.near_miss_check import NearMissCheck
from argus.domain.entity import EntityType
from argus.domain.send_review import SendIssueKind


class IdentifierMismatchCheck(NearMissCheck):
    """El correo cita «Contrato No. 4587» y el adjunto dice 4857 (caso guía, CLAUDE.md §1)."""

    def __init__(self, pipeline: EntityExtractionPipeline) -> None:
        super().__init__(pipeline, EntityType.CONTRACT_ID, SendIssueKind.IDENTIFIER_MISMATCH)
