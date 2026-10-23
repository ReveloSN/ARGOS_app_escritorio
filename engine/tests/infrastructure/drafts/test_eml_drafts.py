from email import policy
from email.message import EmailMessage
from email.parser import BytesParser
from pathlib import Path

from argus.api.composition import build_attachment_readers
from argus.application.ports.document_reader import DocumentSource
from argus.application.ports.drafts import DraftCorrections
from argus.infrastructure.drafts.eml_draft_reader import EmlDraftReader
from argus.infrastructure.drafts.eml_draft_writer import EmlDraftWriter
from argus.infrastructure.drafts.file_system_draft_outbox import FileSystemDraftOutbox
from tests.application.in_memory_repositories import RecordingFileOpener

MAY_REPORT = "Informe_gestion_mayo_2026.txt"


def remission_email() -> bytes:
    message = EmailMessage()
    message["From"] = "Laura Martínez <laura@inversionescaldas.com.co>"
    message["To"] = "Juliana Gómez <jgomez@logisticaandina.com.co>"
    message["Cc"] = "contabilidad@inmobiliariaprisma.co"
    message["Subject"] = "Contrato 4857 · informe de junio y póliza"
    message.set_content("Le comparto el informe de junio y adjunto también la póliza.")
    message.add_attachment(
        "Informe de gestión de mayo de 2026".encode(),
        maintype="text",
        subtype="plain",
        filename=MAY_REPORT,
    )
    return message.as_bytes()


def parsed(content: bytes) -> EmailMessage:
    message = BytesParser(policy=policy.default).parsebytes(content)
    assert isinstance(message, EmailMessage)
    return message


def test_reads_recipients_subject_body_and_each_attachment() -> None:
    content = EmlDraftReader(build_attachment_readers()).read(
        DocumentSource("Remision_contrato_4857.eml", remission_email())
    )

    draft = content.draft
    assert draft.to == ("jgomez@logisticaandina.com.co",)
    assert draft.cc == ("contabilidad@inmobiliariaprisma.co",)
    assert draft.subject == "Contrato 4857 · informe de junio y póliza"
    assert "informe de junio" in draft.body
    assert [item.name for item in draft.attachments] == [MAY_REPORT]
    assert content.attachments[0].fragments[0].text == "Informe de gestión de mayo de 2026"


def test_the_corrected_copy_swaps_attachments_and_drops_the_recipient() -> None:
    corrections = DraftCorrections(
        frozenset({"contabilidad@inmobiliariaprisma.co"}),
        frozenset({MAY_REPORT}),
        (DocumentSource("Informe_gestion_junio_2026.pdf", b"%PDF junio"),),
    )

    copy = parsed(EmlDraftWriter().corrected(remission_email(), corrections))

    assert copy["Cc"] is None
    assert "jgomez@logisticaandina.com.co" in str(copy["To"])
    assert [part.get_filename() for part in copy.iter_attachments()] == [
        "Informe_gestion_junio_2026.pdf"
    ]
    assert copy.get_body(("plain",)) is not None


def test_without_corrections_the_copy_keeps_everything() -> None:
    nothing = DraftCorrections(frozenset(), frozenset(), ())

    copy = parsed(EmlDraftWriter().corrected(remission_email(), nothing))

    assert "contabilidad@inmobiliariaprisma.co" in str(copy["Cc"])
    assert [part.get_filename() for part in copy.iter_attachments()] == [MAY_REPORT]


def test_the_outbox_saves_the_copy_in_its_own_folder_and_opens_it(tmp_path: Path) -> None:
    opener = RecordingFileOpener()

    FileSystemDraftOutbox(tmp_path, opener).deliver("r1", "../Remision.eml", b"copia")

    (opened,) = opener.opened
    assert opened == tmp_path / "r1" / "Remision.eml"
    assert opened.read_bytes() == b"copia"
