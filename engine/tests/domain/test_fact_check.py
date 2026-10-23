from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.entity_index import EntityIndex
from argus.domain.fact_check import FactChecker, FactCheckRules
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from argus.domain.sensitivity import DEFAULT_SENSITIVITY
from argus.domain.suppression import SuppressedCase, SuppressionRule
from tests.domain.alert_builders import entity
from tests.domain.fact_builders import CONFIRMED, fact

INDEX = EntityIndex(
    [
        entity(EntityType.CONTRACT_ID, "4857", "Contrato_4857_v3.docx"),
        entity(EntityType.CONTRACT_ID, "4857", "Correo_remision_cliente.eml"),
        entity(EntityType.CONTRACT_ID, "4587", "Anexo_1_condiciones.pdf"),
        entity(EntityType.CONTRACT_ID, "990011", "Anexo_2_tarifas.xlsx"),
    ]
)
RULE = SuppressionRule(
    1, SuppressedCase(EntityType.CONTRACT_ID, "4587", "4857", "4587", "4857"), CONFIRMED
)


def checker(*suppressions: SuppressionRule) -> FactChecker:
    rules = FactCheckRules(
        comparators_for(DEFAULT_SENSITIVITY.policy),
        RiskClassifier(DEFAULT_RISK_RULES),
        suppressions,
    )
    return FactChecker(INDEX, rules)


def test_a_transposed_contract_number_contradicts_the_confirmed_one() -> None:
    check = checker().check(fact())

    (contradiction,) = check.contradictions
    assert contradiction.side.normalized_value == "4587"
    assert contradiction.side.document_names == {"Anexo_1_condiciones.pdf"}
    assert contradiction.difference.kind is DifferenceKind.TRANSPOSITION
    assert contradiction.risk is RiskLevel.HIGH


def test_lists_where_the_confirmed_value_appears() -> None:
    check = checker().check(fact())

    documents = [item.occurrence.document_name for item in check.appearances]
    assert documents == ["Contrato_4857_v3.docx", "Correo_remision_cliente.eml"]


def test_an_unrelated_value_of_the_same_type_is_not_a_contradiction() -> None:
    check = checker().check(fact(normalized="990012"))

    assert [item.side.normalized_value for item in check.contradictions] == ["990011"]
    assert check.appearances == ()


def test_a_case_marked_as_not_alerting_is_accepted_and_not_marked() -> None:
    check = checker(RULE).check(fact())

    assert check.contradictions == ()
    (accepted,) = check.accepted
    assert accepted.rule == RULE
    assert accepted.side.normalized_value == "4587"


def test_a_retired_fact_is_no_longer_compared() -> None:
    check = checker().check(fact().retired(CONFIRMED))

    assert check.contradictions == ()
    assert len(check.appearances) == 2


def test_a_type_without_comparator_has_no_contradictions() -> None:
    rules = FactCheckRules({}, RiskClassifier(DEFAULT_RISK_RULES), ())

    assert FactChecker(INDEX, rules).check(fact()).contradictions == ()
