from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.near_miss_check import NearMissCheck
from argus.domain.entity import EntityType
from argus.domain.send_review import SendIssueKind


class AmountMismatchCheck(NearMissCheck):
    """El correo cita «$ 18.450.000» y el adjunto dice $ 18.540.000 (caso guía, CLAUDE.md §1).

    Los montos se comparan ya normalizados («COP:18450000»): con otra moneda no se parecen.
    """

    def __init__(self, pipeline: EntityExtractionPipeline) -> None:
        super().__init__(pipeline, EntityType.MONEY, SendIssueKind.AMOUNT_MISMATCH)
