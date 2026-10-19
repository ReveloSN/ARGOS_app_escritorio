from datetime import UTC, datetime

import pytest

from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.errors import InvalidValueError
from argus.domain.locations import LineLocation
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import ChangeKind
from argus.domain.text_comparison.modes import (
    DEFAULT_MODES,
    ComparisonModeFactory,
    ComparisonModeName,
    DocumentPair,
)
from argus.domain.text_comparison.report import (
    ComparisonContent,
    ComparisonReport,
    PairComparison,
)


def document(name: str, *attachments: Document) -> Document:
    fragments = (TextFragment(f"Texto de {name}", LineLocation(1)),)
    return Document(name, DocumentFormat.TEXT, fragments, attachments)


def names(pairs: tuple[DocumentPair, ...]) -> list[tuple[str, str]]:
    return [(pair.first.name, pair.second.name) for pair in pairs]


FACTORY = ComparisonModeFactory(DEFAULT_MODES)
V1, V2, V3 = document("v1.docx"), document("v2.docx"), document("v3.docx")


def test_versions_are_compared_each_with_the_next() -> None:
    pairs = FACTORY.mode_for(ComparisonModeName.VERSIONS).pairs([V1, V2, V3])

    assert names(pairs) == [("v1.docx", "v2.docx"), ("v2.docx", "v3.docx")]


def test_contract_and_annexes_are_compared_all_against_all() -> None:
    pairs = FACTORY.mode_for(ComparisonModeName.CONTRACT_ANNEXES).pairs([V1, V2, V3])

    assert names(pairs) == [
        ("v1.docx", "v2.docx"),
        ("v1.docx", "v3.docx"),
        ("v2.docx", "v3.docx"),
    ]


def test_one_reference_is_compared_with_each_of_the_others() -> None:
    mode = FACTORY.mode_for(ComparisonModeName.ONE_TO_MANY)

    assert names(mode.pairs([V1, V2, V3])) == [("v1.docx", "v2.docx"), ("v1.docx", "v3.docx")]
    assert mode.pairs([]) == ()


def test_an_email_is_compared_with_each_attachment_without_them_inside() -> None:
    email = document("correo.eml", document("contrato.pdf"), document("anexo.xlsx"))

    pairs = FACTORY.mode_for(ComparisonModeName.EMAIL_ATTACHMENT).pairs([email])

    assert names(pairs) == [("correo.eml", "contrato.pdf"), ("correo.eml", "anexo.xlsx")]
    assert all(pair.first.attachments == () for pair in pairs)


@pytest.mark.parametrize(
    ("name", "minimum"),
    [
        (ComparisonModeName.VERSIONS, 2),
        (ComparisonModeName.EMAIL_ATTACHMENT, 1),
        (ComparisonModeName.CONTRACT_ANNEXES, 2),
        (ComparisonModeName.ONE_TO_MANY, 2),
    ],
)
def test_each_mode_says_how_many_files_it_needs(name: ComparisonModeName, minimum: int) -> None:
    mode = FACTORY.mode_for(name)

    assert mode.minimum_documents == minimum
    assert 0 < mode.similarity_threshold < 1


def test_a_report_without_changes_has_an_empty_summary() -> None:
    content = ComparisonContent(
        "Arrendamiento", ComparisonModeName.VERSIONS, (), (PairComparison("a", "b", ()),)
    )

    report = ComparisonReport.start(content, datetime(2026, 10, 19, tzinfo=UTC))

    assert len(report.id) == 32
    assert set(report.summary.by_kind.values()) == {0}
    assert report.summary.by_kind.keys() == set(ChangeKind)
    assert report.summary.by_risk.keys() == set(RiskLevel)


def test_a_report_needs_a_name_and_a_time_zone() -> None:
    with pytest.raises(InvalidValueError):
        ComparisonContent(" ", ComparisonModeName.VERSIONS, (), ())
    content = ComparisonContent("Arrendamiento", ComparisonModeName.VERSIONS, (), ())
    with pytest.raises(InvalidValueError):
        ComparisonReport.start(content, datetime(2026, 10, 19))
