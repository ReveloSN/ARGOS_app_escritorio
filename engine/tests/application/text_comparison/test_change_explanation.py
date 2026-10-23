from dataclasses import replace

import pytest

from argus.application.ai.ai_change_explainer import AiChangeExplainer, AiExplanationSources
from argus.application.ai.ai_settings import AiSettings, ManageAiSettings
from argus.application.text_comparison.change_explanation import (
    ChangeExplanationRequest,
    ExplanationSource,
    FallbackReason,
    TemplateChangeExplainer,
    explanation_topic,
)
from argus.domain.errors import KeychainUnavailableError
from argus.domain.locations import ParagraphLocation
from argus.domain.risk import RiskLevel
from argus.domain.text_comparison.change import Change, ChangeKind, Materiality
from argus.domain.text_comparison.meaning import ChangeMeaning, MeaningSuggestion
from argus.domain.text_comparison.segment import Segment, SegmentKind, SegmentOrigin, TextSpan
from tests.application.ai_doubles import InMemorySecretStore, RecordingProvider


def segment(text: str) -> Segment:
    origin = SegmentOrigin("Contrato.docx", ParagraphLocation(2), TextSpan(0, len(text)))
    return Segment(2, SegmentKind.CLAUSE, text, origin)


BEFORE = segment("El arrendatario podrá terminar el contrato con aviso.")
AFTER = segment("El arrendatario no podrá terminar el contrato con aviso.")
NEGATION = Change(
    ChangeKind.MODIFIED, RiskLevel.HIGH, (Materiality.NEGATION,), BEFORE, AFTER, (), False
)


class InMemoryAiSettings:
    def __init__(self, enabled: bool) -> None:
        self.settings = AiSettings(explains_changes=enabled)

    def get(self) -> AiSettings:
        return self.settings

    def save(self, settings: AiSettings) -> None:
        self.settings = settings


def explainer(
    enabled: bool, secrets: InMemorySecretStore, provider: RecordingProvider
) -> AiChangeExplainer:
    sources = AiExplanationSources(InMemoryAiSettings(enabled), secrets, provider)
    return AiChangeExplainer(sources, TemplateChangeExplainer())


@pytest.mark.parametrize(
    ("change", "topic"),
    [
        (NEGATION, "negation"),
        (replace(NEGATION, materialities=(Materiality.CASE,)), "case"),
        (
            Change(
                ChangeKind.ADDED, RiskLevel.MEDIUM, (Materiality.WORDING,), None, AFTER, (), False
            ),
            "added",
        ),
        (
            replace(
                NEGATION,
                materialities=(Materiality.WORDING,),
                meaning=MeaningSuggestion(ChangeMeaning.REWORDED, 0.95),
            ),
            "reworded",
        ),
        (replace(NEGATION, materialities=(Materiality.WORDING,)), "wording"),
    ],
)
def test_the_template_talks_about_what_matters_most_in_the_change(
    change: Change, topic: str
) -> None:
    assert explanation_topic(change) == topic


def test_without_ai_the_explanation_is_the_local_template() -> None:
    provider = RecordingProvider()

    explanation = explainer(False, InMemorySecretStore("sk-prueba"), provider).explain(
        ChangeExplanationRequest(NEGATION, "es")
    )

    assert explanation.source is ExplanationSource.TEMPLATE
    assert explanation.parts[0].key == "changeExplanation.negation"
    assert explanation.fallback_reason is None
    assert provider.calls == []


def test_with_ai_only_the_two_fragments_and_the_language_leave_the_computer() -> None:
    provider = RecordingProvider("Ahora el arrendatario ya no puede terminar el contrato.")

    explanation = explainer(True, InMemorySecretStore("sk-prueba"), provider).explain(
        ChangeExplanationRequest(NEGATION, "en")
    )

    assert explanation.source is ExplanationSource.AI
    assert explanation.text == "Ahora el arrendatario ya no puede terminar el contrato."
    ((key, prompt),) = provider.calls
    assert key == "sk-prueba"
    assert (prompt.locale, prompt.before, prompt.after) == ("en", BEFORE.text, AFTER.text)


@pytest.mark.parametrize(
    ("secrets", "provider", "reason"),
    [
        (InMemorySecretStore(None), RecordingProvider(), FallbackReason.NO_KEY),
        (
            InMemorySecretStore(is_available=False),
            RecordingProvider(),
            FallbackReason.KEYCHAIN_UNAVAILABLE,
        ),
        (
            InMemorySecretStore("sk"),
            RecordingProvider(failure="invalid_key"),
            FallbackReason.INVALID_KEY,
        ),
        (InMemorySecretStore("sk"), RecordingProvider(failure="refused"), FallbackReason.REFUSED),
        (
            InMemorySecretStore("sk"),
            RecordingProvider(failure="otra cosa"),
            FallbackReason.PROVIDER_UNAVAILABLE,
        ),
    ],
)
def test_when_ai_cannot_answer_the_template_says_why(
    secrets: InMemorySecretStore, provider: RecordingProvider, reason: FallbackReason
) -> None:
    explanation = explainer(True, secrets, provider).explain(
        ChangeExplanationRequest(NEGATION, "es")
    )

    assert explanation.source is ExplanationSource.TEMPLATE
    assert explanation.fallback_reason is reason
    assert explanation.parts


def test_ai_settings_never_return_the_key_and_report_the_keychain() -> None:
    secrets = InMemorySecretStore()
    settings = ManageAiSettings(InMemoryAiSettings(False), secrets)

    assert not settings.state().has_key
    assert settings.store_key("  sk-prueba  ").has_key
    assert secrets.secret == "sk-prueba"
    assert settings.set_explains_changes(True).settings.explains_changes
    assert not settings.remove_key().has_key
    unavailable = ManageAiSettings(
        InMemoryAiSettings(True), InMemorySecretStore(is_available=False)
    )
    assert unavailable.state().is_keychain_available is False
    with pytest.raises(KeychainUnavailableError):
        unavailable.store_key("sk")
