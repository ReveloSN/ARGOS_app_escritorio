from collections.abc import Sequence
from dataclasses import dataclass

from argus.application.entity_extraction_pipeline import EntityExtractionPipeline
from argus.application.ports.preferences import PreferencesRepository, SuppressionRuleRepository
from argus.application.ports.repositories import AlertRepository, DocumentRepository
from argus.domain.comparison.comparators_by_type import comparators_for
from argus.domain.confirmed_fact import ConfirmedFact
from argus.domain.fact_check import FactCheck, FactChecker, FactCheckRules
from argus.domain.pending_fact import PendingFact, pending_facts
from argus.domain.risk_rules import RiskClassifier


@dataclass(frozen=True)
class FactCheckSources:
    """De dónde sale lo que se compara: el texto guardado, las alertas y los ajustes."""

    documents: DocumentRepository
    alerts: AlertRepository
    preferences: PreferencesRepository
    rules: SuppressionRuleRepository


@dataclass(frozen=True)
class CaseFileFacts:
    """La pestaña «Datos confirmados»: cada dato comprobado y los que faltan por confirmar."""

    checks: tuple[FactCheck, ...]
    pending: tuple[PendingFact, ...]


class CheckConfirmedFacts:
    """Caso de uso: compara los datos confirmados con el texto guardado de la revisión.

    Se calcula al abrir el expediente y después de cada cambio, con los ajustes vigentes, así
    un dato nuevo marca al instante los documentos que lo contradicen.
    """

    def __init__(
        self,
        sources: FactCheckSources,
        pipeline: EntityExtractionPipeline,
        classifier: RiskClassifier,
    ) -> None:
        self._sources = sources
        self._pipeline = pipeline
        self._classifier = classifier

    def execute(self, session_id: str, facts: Sequence[ConfirmedFact]) -> CaseFileFacts:
        index = self._pipeline.index_fragments(self._sources.documents.fragments_for(session_id))
        rules = FactCheckRules(
            comparators_for(self._sources.preferences.get().sensitivity.policy),
            self._classifier,
            self._sources.rules.list_all(),
        )
        checker = FactChecker(index, rules)
        alerts = (item.alert for item in self._sources.alerts.list_for(session_id))
        return CaseFileFacts(
            tuple(checker.check(fact) for fact in facts), pending_facts(alerts, facts)
        )
