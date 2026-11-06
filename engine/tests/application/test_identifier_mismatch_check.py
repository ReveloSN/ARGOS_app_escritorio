import pytest

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.identifier_mismatch_check import IdentifierMismatchCheck
from argus.application.ports.drafts import DraftContent
from argus.application.send_checks import SendContext
from argus.domain.send_review import DraftPart, EmailDraft, SendIssueKind
from argus.infrastructure.extraction.contract_id_extractor import ContractIdExtractor
from tests.application.send_doubles import attachment

CHECK = IdentifierMismatchCheck(EntityExtractionPipeline([ContractIdExtractor()]))


def issues(subject: str, body: str, attached_text: str) -> list[tuple[DraftPart, dict[str, str]]]:
    draft = EmailDraft("remision.eml", subject, ("a@b.co",), (), body, ())
    content = DraftContent(draft, (attachment("Contrato_v3.docx", attached_text),))
    return [(issue.part, dict(issue.params)) for issue in CHECK.find(SendContext(content))]


def test_a_transposed_contract_number_in_the_subject_is_reported() -> None:
    found = issues(
        "Contrato No. 4587", "Adjunto el contrato.", "Contrato No. 4857 de arrendamiento"
    )

    assert found == [
        (
            DraftPart.SUBJECT,
            {"mentioned": "4587", "attached": "4857", "document": "Contrato_v3.docx"},
        )
    ]


def test_the_same_check_applies_to_the_body() -> None:
    found = issues("Remisión", "Le envío el Contrato No. 4587 firmado.", "Contrato No. 4857")

    assert [part for part, _ in found] == [DraftPart.BODY]


def test_a_single_wrong_digit_is_a_typo_too() -> None:
    assert issues("Contrato No. 4858", "", "Contrato No. 4857") != []


@pytest.mark.parametrize(
    ("subject", "attached"),
    [
        ("Contrato No. 4857", "Contrato No. 4857"),
        ("Contrato No. 9031", "Contrato No. 4857"),
        ("Contrato No. 12", "Contrato No. 13"),
        ("Contrato No. 4857", "Sin números de contrato en este documento"),
    ],
)
def test_nothing_is_reported_when_they_match_or_are_unrelated(subject: str, attached: str) -> None:
    assert issues(subject, "", attached) == []


def test_the_issue_is_high_risk_without_an_automatic_fix() -> None:
    draft = EmailDraft("r.eml", "Contrato No. 4587", ("a@b.co",), (), "", ())
    content = DraftContent(draft, (attachment("c.docx", "Contrato No. 4857"),))

    (issue,) = CHECK.find(SendContext(content))

    assert issue.kind is SendIssueKind.IDENTIFIER_MISMATCH
    assert issue.risk.value == "high"
    assert issue.fix is None
    assert issue.marked_text == "4587"
