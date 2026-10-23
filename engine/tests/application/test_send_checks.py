from argus.application.draft_checks import ForeignRecipientCheck, MissingAttachmentCheck
from argus.application.period_mismatch_check import PeriodMismatchCheck
from argus.application.send_checks import SendContext, name_words
from argus.domain.risk import RiskLevel
from argus.domain.send_review import DraftPart, SendFix, SendFixKind, SendIssueKind
from tests.application.send_doubles import CASE_DOCUMENTS, draft_content, month_pipeline

CASE_FILE = SendContext(
    draft_content(),
    CASE_DOCUMENTS,
    frozenset({"laura@inversionescaldas.com.co", "jgomez@logisticaandina.com.co"}),
)


def test_file_names_read_as_words() -> None:
    assert name_words("Informe_gestion_mayo_2026.pdf") == "Informe gestion mayo 2026"


def test_a_june_report_with_the_may_report_attached_offers_the_june_one() -> None:
    (issue,) = PeriodMismatchCheck(month_pipeline()).find(CASE_FILE)

    assert issue.kind is SendIssueKind.PERIOD_MISMATCH
    assert issue.risk is RiskLevel.HIGH
    assert issue.marked_text == "informe de junio"
    assert issue.params["attached"] == "Informe_gestion_mayo_2026.pdf"
    assert issue.fix == SendFix(
        SendFixKind.REPLACE_ATTACHMENT,
        "Informe_gestion_mayo_2026.pdf",
        "Informe_gestion_junio_2026.pdf",
    )


def test_the_right_period_attached_or_no_period_at_all_is_fine() -> None:
    right = draft_content(attachments=("Informe_gestion_junio_2026.pdf",))
    unknown = draft_content(attachments=("Contrato_4857_v3.docx",))
    check = PeriodMismatchCheck(month_pipeline())

    assert list(check.find(SendContext(right))) == []
    assert list(check.find(SendContext(unknown))) == []


def test_without_a_case_file_the_mismatch_is_marked_without_a_fix() -> None:
    (issue,) = PeriodMismatchCheck(month_pipeline()).find(SendContext(draft_content()))

    assert issue.fix is None
    assert issue.params["suggested"] == ""


def test_a_promised_attachment_that_is_missing_offers_the_one_in_the_case_file() -> None:
    (issue,) = MissingAttachmentCheck().find(CASE_FILE)

    assert issue.kind is SendIssueKind.MISSING_ATTACHMENT
    assert issue.marked_text == "adjunto también la póliza"
    assert issue.fix == SendFix(SendFixKind.ADD_ATTACHMENT, "", "Poliza_RCE_21-44-101005873.pdf")


def test_a_promised_attachment_that_is_there_is_fine() -> None:
    content = draft_content(attachments=("Poliza_RCE_2026.pdf", "Informe_gestion_junio_2026.pdf"))

    assert list(MissingAttachmentCheck().find(SendContext(content))) == []


def test_a_recipient_outside_the_case_file_contacts_is_marked_where_it_is() -> None:
    (issue,) = ForeignRecipientCheck().find(CASE_FILE)

    assert issue.kind is SendIssueKind.FOREIGN_RECIPIENT
    assert issue.risk is RiskLevel.MEDIUM
    assert issue.part is DraftPart.CC
    assert issue.fix == SendFix(SendFixKind.REMOVE_RECIPIENT, "contabilidad@inmobiliariaprisma.co")


def test_without_known_contacts_no_recipient_is_marked() -> None:
    assert list(ForeignRecipientCheck().find(SendContext(draft_content()))) == []
