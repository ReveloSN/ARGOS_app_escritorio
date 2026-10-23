from argus.application.check_confirmed_facts import CheckConfirmedFacts, FactCheckSources
from argus.domain.alert import Alert
from argus.domain.document import Document, DocumentFormat, TextFragment
from argus.domain.entity import EntityType
from argus.domain.locations import PageLocation
from argus.domain.read_outcome import DocumentReadOutcome
from argus.domain.risk import RiskLevel
from argus.domain.risk_rules import DEFAULT_RISK_RULES, RiskClassifier
from tests.application.fact_doubles import fact_pipeline
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemoryDocumentRepository,
    InMemoryPreferencesRepository,
    InMemorySuppressionRuleRepository,
)
from tests.domain.alert_builders import candidate
from tests.domain.fact_builders import fact

SESSION_ID = "expediente-2026-118"


def document(name: str, text: str) -> DocumentReadOutcome:
    fragment = TextFragment(text, PageLocation(1))
    return DocumentReadOutcome(name, Document(name, DocumentFormat.PDF, (fragment,)), None)


def checker() -> CheckConfirmedFacts:
    documents, alerts = InMemoryDocumentRepository(), InMemoryAlertRepository()
    documents.save_all(
        SESSION_ID,
        [
            document("Contrato_4857_v3.pdf", "Contrato No. 4857 y canon $ 18.450.000"),
            document("Anexo_1_condiciones.pdf", "Contrato No. 4587"),
        ],
    )
    alerts.save_all(
        SESSION_ID,
        [
            Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH),
            Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH),
        ],
    )
    sources = FactCheckSources(
        documents,
        alerts,
        InMemoryPreferencesRepository(),
        InMemorySuppressionRuleRepository(),
    )
    return CheckConfirmedFacts(sources, fact_pipeline(), RiskClassifier(DEFAULT_RISK_RULES))


def test_compares_each_fact_with_the_saved_text_of_the_review() -> None:
    result = checker().execute(SESSION_ID, [fact()])

    (check,) = result.checks
    assert [item.occurrence.document_name for item in check.appearances] == ["Contrato_4857_v3.pdf"]
    (contradiction,) = check.contradictions
    assert contradiction.side.document_names == {"Anexo_1_condiciones.pdf"}


def test_alerts_without_a_confirmed_value_are_pending() -> None:
    result = checker().execute(SESSION_ID, [fact()])

    assert [item.entity_type for item in result.pending] == [EntityType.MONEY]
