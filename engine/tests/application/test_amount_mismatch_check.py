import pytest

from argus.application.amount_mismatch_check import AmountMismatchCheck
from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.drafts import DraftContent
from argus.application.send_checks import SendContext
from argus.domain.send_review import DraftPart, EmailDraft, SendIssueKind
from argus.infrastructure.extraction.money_extractor import MoneyExtractor
from tests.application.send_doubles import attachment

CHECK = AmountMismatchCheck(EntityExtractionPipeline([MoneyExtractor()]))


def issues(body: str, attached_text: str) -> list[tuple[DraftPart, dict[str, str]]]:
    draft = EmailDraft("remision.eml", "Remisión", ("a@b.co",), (), body, ())
    content = DraftContent(draft, (attachment("Contrato_v3.docx", attached_text),))
    return [(issue.part, dict(issue.params)) for issue in CHECK.find(SendContext(content))]


def test_a_transposed_amount_in_the_body_is_reported_with_both_spellings() -> None:
    found = issues("El canon mensual es de $ 18.450.000.", "Canon mensual: $ 18.540.000")

    assert found == [
        (
            DraftPart.BODY,
            {
                "mentioned": "$ 18.450.000",
                "attached": "$ 18.540.000",
                "document": "Contrato_v3.docx",
            },
        )
    ]


def test_a_dropped_zero_is_reported_too() -> None:
    assert issues("Pago de $ 1.845.000", "Valor $ 18.450.000") != []


@pytest.mark.parametrize(
    ("body", "attached"),
    [
        ("Canon de $ 18.450.000", "Canon de $ 18.450.000"),
        ("Canon de $ 18.450.000", "Canon de COP 18.450.000"),
        ("Canon de $ 5.000.000", "Canon de $ 18.540.000"),
        ("Canon de USD 18.450.000", "Canon de $ 18.540.000"),
        ("Canon de $ 18.450.000", "Sin montos en este documento"),
    ],
)
def test_nothing_is_reported_when_they_match_or_are_unrelated(body: str, attached: str) -> None:
    assert issues(body, attached) == []


def test_the_issue_is_high_risk_without_an_automatic_fix() -> None:
    draft = EmailDraft("r.eml", "Remisión", ("a@b.co",), (), "Canon de $ 18.450.000", ())
    content = DraftContent(draft, (attachment("c.docx", "Canon de $ 18.540.000"),))

    (issue,) = CHECK.find(SendContext(content))

    assert issue.kind is SendIssueKind.AMOUNT_MISMATCH
    assert issue.risk.value == "high"
    assert issue.fix is None
