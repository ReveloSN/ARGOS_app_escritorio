import pytest

from argus.domain.comparison.difference import DifferenceKind
from argus.domain.entity import EntityType
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import (
    DEFAULT_RISK_RULES,
    AmountMismatch,
    ContractIdTransposition,
    DifferenceIs,
    EntityTypeIs,
    FormatOnly,
    RiskClassifier,
    RiskRule,
)
from tests.domain.alert_builders import candidate


class TestSpecifications:
    def test_entity_type_specification_matches_any_listed_type(self) -> None:
        specification = EntityTypeIs(EntityType.CONTRACT_ID, EntityType.TAX_ID)

        assert specification.is_satisfied_by(candidate(EntityType.TAX_ID))
        assert not specification.is_satisfied_by(candidate(EntityType.MONEY))

    def test_specifications_compose_with_and_or_and_not(self) -> None:
        contract = EntityTypeIs(EntityType.CONTRACT_ID)
        transposition = DifferenceIs(DifferenceKind.TRANSPOSITION)
        money_transposition = candidate(EntityType.MONEY)

        assert not (contract & transposition).is_satisfied_by(money_transposition)
        assert (contract | transposition).is_satisfied_by(money_transposition)
        assert (~contract).is_satisfied_by(money_transposition)

    def test_contract_transposition_is_the_4857_4587_case(self) -> None:
        assert ContractIdTransposition.is_satisfied_by(candidate(EntityType.CONTRACT_ID))
        assert not ContractIdTransposition.is_satisfied_by(
            candidate(EntityType.CONTRACT_ID, DifferenceKind.CHARACTER_CHANGE)
        )

    def test_amount_mismatch_excludes_format_only_differences(self) -> None:
        assert AmountMismatch.is_satisfied_by(candidate(EntityType.MONEY))
        assert not AmountMismatch.is_satisfied_by(
            candidate(EntityType.MONEY, DifferenceKind.FORMAT_ONLY)
        )


class TestRiskClassifier:
    classifier = RiskClassifier(DEFAULT_RISK_RULES)

    @pytest.mark.parametrize(
        "entity_type",
        [EntityType.CONTRACT_ID, EntityType.TAX_ID, EntityType.MONEY, EntityType.DATE],
    )
    def test_identifiers_amounts_and_dates_are_high_risk(self, entity_type: EntityType) -> None:
        assert self.classifier.classify(candidate(entity_type)) is RiskLevel.HIGH

    @pytest.mark.parametrize(
        "entity_type",
        [EntityType.PERSON_NAME, EntityType.ORGANIZATION_NAME, EntityType.PERIOD],
    )
    def test_names_and_periods_are_medium_risk(self, entity_type: EntityType) -> None:
        assert self.classifier.classify(candidate(entity_type)) is RiskLevel.MEDIUM

    def test_format_differences_are_low_risk_even_for_amounts(self) -> None:
        format_only = candidate(EntityType.MONEY, DifferenceKind.FORMAT_ONLY)

        assert self.classifier.classify(format_only) is RiskLevel.LOW

    def test_first_matching_rule_wins(self) -> None:
        classifier = RiskClassifier(
            [
                RiskRule(FormatOnly, RiskLevel.LOW),
                RiskRule(EntityTypeIs(EntityType.MONEY), RiskLevel.HIGH),
            ]
        )

        assert classifier.classify(candidate(EntityType.MONEY, DifferenceKind.FORMAT_ONLY)) is (
            RiskLevel.LOW
        )

    def test_candidate_without_matching_rule_has_no_risk(self) -> None:
        classifier = RiskClassifier([RiskRule(EntityTypeIs(EntityType.MONEY), RiskLevel.HIGH)])

        assert classifier.classify(candidate(EntityType.DATE)) is None
