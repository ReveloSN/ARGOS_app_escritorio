"""Modos de comparación (Strategy): qué documentos se comparan con cuáles y con qué umbral."""

from collections.abc import Sequence
from dataclasses import dataclass, replace
from enum import StrEnum
from itertools import combinations, pairwise
from typing import Protocol

from argus.domain.document import Document


class ComparisonModeName(StrEnum):
    VERSIONS = "versions"
    EMAIL_ATTACHMENT = "email_attachment"
    CONTRACT_ANNEXES = "contract_annexes"
    ONE_TO_MANY = "one_to_many"


@dataclass(frozen=True)
class DocumentPair:
    first: Document
    second: Document


class ComparisonMode(Protocol):
    @property
    def name(self) -> ComparisonModeName: ...

    @property
    def minimum_documents(self) -> int: ...

    @property
    def similarity_threshold(self) -> float:
        """Similitud mínima para considerar que dos segmentos son el mismo, ya modificado."""
        ...

    def pairs(self, documents: Sequence[Document]) -> tuple[DocumentPair, ...]: ...


def _own_text(document: Document) -> Document:
    """El documento sin sus adjuntos: cada adjunto se compara por separado."""
    return replace(document, attachments=())


# Umbrales: dos versiones del mismo documento conservan casi todo su texto, así que se exige
# más parecido; un correo y su adjunto, o un contrato y sus anexos, lo dicen con otras palabras.
VERSION_THRESHOLD = 0.6
RELATED_DOCUMENT_THRESHOLD = 0.45


class VersionsMode:
    """Cada versión contra la siguiente, en el orden en que se cargaron (v1 → v2 → v3)."""

    name = ComparisonModeName.VERSIONS
    minimum_documents = 2
    similarity_threshold = VERSION_THRESHOLD

    def pairs(self, documents: Sequence[Document]) -> tuple[DocumentPair, ...]:
        own = [_own_text(document) for document in documents]
        return tuple(DocumentPair(first, second) for first, second in pairwise(own))


class EmailAttachmentMode:
    """El texto de cada correo contra cada uno de sus adjuntos."""

    name = ComparisonModeName.EMAIL_ATTACHMENT
    minimum_documents = 1
    similarity_threshold = RELATED_DOCUMENT_THRESHOLD

    def pairs(self, documents: Sequence[Document]) -> tuple[DocumentPair, ...]:
        return tuple(
            DocumentPair(_own_text(email), _own_text(attachment))
            for email in documents
            for attachment in email.attachments
        )


class ContractAnnexesMode:
    """Todos contra todos: el contrato con cada anexo y los anexos entre sí (matriz)."""

    name = ComparisonModeName.CONTRACT_ANNEXES
    minimum_documents = 2
    similarity_threshold = RELATED_DOCUMENT_THRESHOLD

    def pairs(self, documents: Sequence[Document]) -> tuple[DocumentPair, ...]:
        own = [_own_text(document) for document in documents]
        return tuple(DocumentPair(first, second) for first, second in combinations(own, 2))


class OneToManyMode:
    """El primer documento como referencia, contra cada uno de los demás."""

    name = ComparisonModeName.ONE_TO_MANY
    minimum_documents = 2
    similarity_threshold = RELATED_DOCUMENT_THRESHOLD

    def pairs(self, documents: Sequence[Document]) -> tuple[DocumentPair, ...]:
        if not documents:
            return ()
        reference, *others = [_own_text(document) for document in documents]
        return tuple(DocumentPair(reference, other) for other in others)


class ComparisonModeFactory:
    """Factory: el modo que corresponde al nombre que eligió el usuario."""

    def __init__(self, modes: Sequence[ComparisonMode]) -> None:
        self._modes = {mode.name: mode for mode in modes}

    def mode_for(self, name: ComparisonModeName) -> ComparisonMode:
        return self._modes[name]


DEFAULT_MODES: tuple[ComparisonMode, ...] = (
    VersionsMode(),
    EmailAttachmentMode(),
    ContractAnnexesMode(),
    OneToManyMode(),
)
