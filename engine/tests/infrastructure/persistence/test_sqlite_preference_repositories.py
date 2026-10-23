from datetime import timedelta

from argus.application.ai.ai_settings import AiSettings
from argus.application.ocr_settings import CloudOcrProcessor, OcrSettings
from argus.domain.alert import Alert
from argus.domain.entity import EntityType
from argus.domain.preferences import ComparedCategory, UserPreferences
from argus.domain.risk import RiskLevel
from argus.domain.sensitivity import Sensitivity
from argus.domain.suppression import SuppressedCase
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.sqlite_preference_repositories import (
    SqliteAiSettingsRepository,
    SqliteOcrSettingsRepository,
    SqlitePreferencesRepository,
    SqliteSuppressionRuleRepository,
)
from tests.domain.alert_builders import candidate
from tests.infrastructure.persistence.conftest import STARTED

CONTRACT_CASE = SuppressedCase.from_alert(
    Alert.from_candidate(candidate(EntityType.CONTRACT_ID), RiskLevel.HIGH)
)
MONEY_CASE = SuppressedCase.from_alert(
    Alert.from_candidate(candidate(EntityType.MONEY), RiskLevel.HIGH)
)


def test_preferences_start_with_the_defaults(database: SqliteDatabase) -> None:
    assert SqlitePreferencesRepository(database).get() == UserPreferences()


def test_saved_preferences_are_read_back(database: SqliteDatabase) -> None:
    repository = SqlitePreferencesRepository(database)
    preferences = UserPreferences(
        Sensitivity.STRICT,
        frozenset({ComparedCategory.AMOUNTS, ComparedCategory.DATES}),
        has_retention_limit=False,
    )

    repository.save(preferences)

    assert repository.get() == preferences


def test_rules_are_listed_newest_first(database: SqliteDatabase) -> None:
    repository = SqliteSuppressionRuleRepository(database)
    first = repository.add(CONTRACT_CASE, STARTED)
    second = repository.add(MONEY_CASE, STARTED + timedelta(days=1))

    assert repository.list_all() == (second, first)
    assert first.case == CONTRACT_CASE
    assert first.created_at == STARTED


def test_adding_an_existing_case_returns_the_rule_already_stored(
    database: SqliteDatabase,
) -> None:
    repository = SqliteSuppressionRuleRepository(database)
    rule = repository.add(CONTRACT_CASE, STARTED)

    assert repository.add(CONTRACT_CASE, STARTED + timedelta(days=1)) == rule
    assert len(repository.list_all()) == 1


def test_deleted_rules_are_no_longer_listed(database: SqliteDatabase) -> None:
    repository = SqliteSuppressionRuleRepository(database)
    rule = repository.add(CONTRACT_CASE, STARTED)

    repository.delete(rule.id)

    assert repository.list_all() == ()


def test_ai_explanations_are_off_until_the_user_turns_them_on(database: SqliteDatabase) -> None:
    repository = SqliteAiSettingsRepository(database)

    assert repository.get() == AiSettings(explains_changes=False)
    repository.save(AiSettings(explains_changes=True))
    assert repository.get().explains_changes


def test_document_ai_is_off_and_without_processor_until_the_user_sets_it(
    database: SqliteDatabase,
) -> None:
    repository = SqliteOcrSettingsRepository(database)
    configured = OcrSettings(True, CloudOcrProcessor("proyecto-de-prueba", "us", "a1b2c3d4"))

    assert repository.get() == OcrSettings()
    repository.save(configured)
    assert repository.get() == configured
