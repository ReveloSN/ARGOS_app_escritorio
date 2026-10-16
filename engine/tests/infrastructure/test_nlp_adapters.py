import hashlib
from pathlib import Path

import pytest

from argus.domain.entity import EntityType
from argus.infrastructure.nlp.embedding_model import (
    MODELS_ENV_VAR,
    ModelChecksumError,
    ModelFile,
    default_models_directory,
    download_model,
    is_model_available,
)
from argus.infrastructure.nlp.onnx_text_similarity import OnnxTextSimilarity
from argus.infrastructure.nlp.spacy_person_extractor import (
    SpacyPersonNameExtractor,
    looks_like_person_name,
)
from tests.model_availability import MODEL_DIRECTORY, requires_embedding_model


def test_spacy_finds_people_without_a_role_before_their_name() -> None:
    text = "Atentamente, Laura Martínez Gómez, en Bogotá, con el Contrato No. 4857."

    matches = list(SpacyPersonNameExtractor().extract(text))

    assert [(m.type, m.raw_value, m.normalized_value) for m in matches] == [
        (EntityType.PERSON_NAME, "Laura Martínez Gómez", "laura martinez gomez")
    ]
    assert text[matches[0].start : matches[0].end] == "Laura Martínez Gómez"


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("María F. Rojas Pérez", True),
        ("Laura", False),
        ("Cláusula primera", False),
        ("Anexo 2", False),
    ],
)
def test_person_names_need_two_capitalized_words(text: str, expected: bool) -> None:
    assert looks_like_person_name(text) is expected


def source_file(tmp_path: Path, content: bytes) -> ModelFile:
    source = tmp_path / "origen.bin"
    source.write_bytes(content)
    return ModelFile("model.onnx", source.as_uri(), hashlib.sha256(content).hexdigest())


def test_download_verifies_the_checksum_and_skips_files_already_there(tmp_path: Path) -> None:
    file = source_file(tmp_path, b"modelo")
    target = tmp_path / "modelos"

    download_model(target, [file])
    (tmp_path / "origen.bin").unlink()
    download_model(target, [file])

    assert (target / "model.onnx").read_bytes() == b"modelo"
    assert is_model_available(target, [file])


def test_a_file_that_does_not_match_its_checksum_is_rejected(tmp_path: Path) -> None:
    file = source_file(tmp_path, b"modelo")
    tampered = ModelFile(file.name, file.url, "0" * 64)

    with pytest.raises(ModelChecksumError):
        download_model(tmp_path / "modelos", [tampered])

    assert list((tmp_path / "modelos").iterdir()) == []


def test_models_folder_can_be_set_by_the_installer(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv(MODELS_ENV_VAR, str(tmp_path))

    assert default_models_directory() == tmp_path


@requires_embedding_model
def test_same_topic_texts_are_more_similar_than_unrelated_ones() -> None:
    similarity = OnnxTextSimilarity(MODEL_DIRECTORY)

    related, unrelated = similarity.similarities(
        "Anexo 2 tarifas. Tarifas mayo 2026",
        ["Adjunto el informe de junio con las tarifas.", "Nos vemos en la reunión de junio."],
    )

    assert related > 0.5 > unrelated
    assert similarity.similarities("texto", []) == ()
