from pathlib import Path

import pytest

from argus.application.ports.document_archive import ArchivedFile
from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import DocumentNotFoundError, UnreadableReason
from argus.domain.locations import LineLocation
from argus.domain.read_outcome import DocumentReadOutcome
from argus.infrastructure.drafts.archived_case_file_library import ArchivedCaseFileLibrary
from argus.infrastructure.file_system_document_archive import FileSystemDocumentArchive
from tests.application.in_memory_repositories import InMemoryDocumentRepository
from tests.infrastructure.drafts.test_eml_drafts import remission_email

SESSION_ID = "expediente-2026-118"
NOTE = "Contacto de facturación: pagos@inversionescaldas.com.co"


def library(tmp_path: Path) -> ArchivedCaseFileLibrary:
    documents = InMemoryDocumentRepository()
    note = Document("notas.txt", DocumentFormat.TEXT, (TextFragment(NOTE, LineLocation(1)),))
    email = Document("Correo.eml", DocumentFormat.EML, (TextFragment("Remisión", LineLocation(1)),))
    documents.save_all(
        SESSION_ID,
        [
            DocumentReadOutcome("notas.txt", note, None),
            DocumentReadOutcome("Correo.eml", email, None),
            DocumentReadOutcome("escaneado.pdf", None, UnreadableReason.NO_TEXT),
        ],
    )
    archive = FileSystemDocumentArchive(tmp_path)
    archive.store(ArchivedFile(SESSION_ID, 0, DocumentSource("notas.txt", NOTE.encode())))
    archive.store(ArchivedFile(SESSION_ID, 1, DocumentSource("Correo.eml", remission_email())))
    return ArchivedCaseFileLibrary(documents, archive)


def test_lists_the_documents_that_were_read(tmp_path: Path) -> None:
    assert library(tmp_path).document_names(SESSION_ID) == ("notas.txt", "Correo.eml")


def test_contacts_come_from_the_text_and_from_the_email_headers(tmp_path: Path) -> None:
    assert library(tmp_path).contacts(SESSION_ID) == {
        "pagos@inversionescaldas.com.co",
        "laura@inversionescaldas.com.co",
        "jgomez@logisticaandina.com.co",
        "contabilidad@inmobiliariaprisma.co",
    }


def test_gives_the_saved_copy_of_a_document(tmp_path: Path) -> None:
    source = library(tmp_path).content_of(SESSION_ID, "notas.txt")

    assert source == DocumentSource("notas.txt", NOTE.encode())
    with pytest.raises(DocumentNotFoundError):
        library(tmp_path).content_of(SESSION_ID, "otro.pdf")
