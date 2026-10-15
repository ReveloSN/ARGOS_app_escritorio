from pathlib import Path

from argus.api.composition import APP_NAME, DATABASE_FILE_NAME, default_database_path


def test_database_lives_in_the_app_data_folder_of_the_operating_system() -> None:
    path = default_database_path()

    assert path.name == DATABASE_FILE_NAME
    assert APP_NAME in path.parts
    assert path.is_absolute()


def test_default_path_is_not_inside_the_repository() -> None:
    repository_root = Path(__file__).resolve().parents[2]

    assert repository_root not in default_database_path().parents
