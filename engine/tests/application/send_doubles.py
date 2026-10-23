"""Dobles de «Revisar antes de enviar»: borradores armados a mano y un expediente en memoria."""

import re
from collections.abc import Iterator

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.drafts import DraftContent, DraftCorrections
from argus.application.ports.entity_extractor import EntityMatch
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.errors import SendReviewNotFoundError
from argus.domain.locations import PageLocation
from argus.domain.send_review import DraftAttachment, EmailDraft, SendReview

MONTHS = {"mayo": 5, "junio": 6}
MONTH = re.compile(r"\b(?P<month>mayo|junio)\b(?:\s+(?:de\s+)?(?P<year>\d{4}))?", re.IGNORECASE)
BODY = (
    "Le comparto el informe de junio con el estado de la bodega y, como lo hablamos, "
    "adjunto también la póliza de responsabilidad civil vigente."
)
CASE_DOCUMENTS = (
    "Contrato_4857_v3.docx",
    "Informe_gestion_junio_2026.pdf",
    "Poliza_RCE_21-44-101005873.pdf",
)


class MonthExtractor:
    """Reconoce «junio» o «mayo 2026» como periodos, igual que el extractor real."""

    def extract(self, text: str) -> Iterator[EntityMatch]:
        for match in MONTH.finditer(text):
            month = MONTHS[match.group("month").lower()]
            year = match.group("year") or "XXXX"
            normalized = f"{year}-{month:02d}"
            yield EntityMatch(
                EntityType.PERIOD, match.group(), normalized, match.start(), match.end()
            )


def month_pipeline() -> EntityExtractionPipeline:
    return EntityExtractionPipeline([MonthExtractor()])


def attachment(name: str, text: str = "Informe de gestión") -> Document:
    return Document(name, DocumentFormat.PDF, (TextFragment(text, PageLocation(1)),))


def draft_content(
    body: str = BODY,
    attachments: tuple[str, ...] = ("Informe_gestion_mayo_2026.pdf", "Contrato_4857_v3.docx"),
    cc: tuple[str, ...] = ("contabilidad@inmobiliariaprisma.co",),
) -> DraftContent:
    draft = EmailDraft(
        "Remision_contrato_4857.eml",
        "Contrato 4857 · informe de junio y póliza",
        ("jgomez@logisticaandina.com.co",),
        cc,
        body,
        tuple(DraftAttachment(name, 1024) for name in attachments),
    )
    return DraftContent(draft, tuple(attachment(name) for name in attachments))


class FixedDraftReader:
    def __init__(self, content: DraftContent) -> None:
        self.content = content

    def read(self, source: DocumentSource) -> DraftContent:
        return self.content


class InMemoryCaseFileLibrary:
    def __init__(
        self, contacts: frozenset[str] = frozenset({"laura@inversionescaldas.com.co"})
    ) -> None:
        self._contacts = contacts

    def document_names(self, session_id: str) -> tuple[str, ...]:
        return CASE_DOCUMENTS

    def contacts(self, session_id: str) -> frozenset[str]:
        return self._contacts | {"jgomez@logisticaandina.com.co"}

    def content_of(self, session_id: str, document_name: str) -> DocumentSource:
        return DocumentSource(document_name, document_name.encode())


class InMemorySendReviewRepository:
    def __init__(self) -> None:
        self.reviews: dict[str, tuple[SendReview, bytes]] = {}

    def save(self, review: SendReview, original: bytes) -> None:
        self.reviews[review.id] = (review, original)

    def get(self, review_id: str) -> SendReview:
        if review_id not in self.reviews:
            raise SendReviewNotFoundError(review_id)
        return self.reviews[review_id][0]

    def original_of(self, review_id: str) -> bytes:
        return self.reviews[review_id][1]


class RecordingDraftWriter:
    def __init__(self) -> None:
        self.corrections: list[DraftCorrections] = []

    def corrected(self, original: bytes, corrections: DraftCorrections) -> bytes:
        self.corrections.append(corrections)
        return original + b"-corregido"


class RecordingOutbox:
    def __init__(self) -> None:
        self.delivered: list[tuple[str, str, bytes]] = []

    def deliver(self, review_id: str, file_name: str, content: bytes) -> None:
        self.delivered.append((review_id, file_name, content))
