from pathlib import Path

from argus.api.composition import APP_NAME, default_data_directory


def test_history_lives_in_the_app_data_folder_of_the_operating_system() -> None:
    path = default_data_directory()

    assert APP_NAME in path.parts
    assert path.is_absolute()


def test_default_folder_is_not_inside_the_repository() -> None:
    repository_root = Path(__file__).resolve().parents[2]

    assert repository_root not in default_data_directory().parents
