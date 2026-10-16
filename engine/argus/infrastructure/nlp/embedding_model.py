"""Modelo de embeddings multilingüe en ONNX (ADR 002 y 016): archivos, huellas y descarga.

Se usa la exportación ya publicada en Hugging Face, fijada a una revisión y verificada por
SHA-256: lo que se descarga es exactamente lo que se probó. No entra al repositorio.
Uso: `uv run python -m argus.infrastructure.nlp.embedding_model`.
"""

import hashlib
import os
import shutil
import sys
import urllib.request
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
REVISION = "2c4055b12046f11709e9df2c122e59ffbdc2f900"
BASE_URL = f"https://huggingface.co/Xenova/{MODEL_NAME}/resolve/{REVISION}"
MODELS_ENV_VAR = "ARGUS_MODELS_DIR"
CHUNK_BYTES = 1024 * 1024


@dataclass(frozen=True)
class ModelFile:
    name: str
    url: str
    sha256: str


EMBEDDING_MODEL_FILES: tuple[ModelFile, ...] = (
    ModelFile(
        "model.onnx",
        f"{BASE_URL}/onnx/model_quantized.onnx",
        "66fc00f5f29afcaff34092e1bdd20008ca3918265a82fb9695a551e510cc4ebc",
    ),
    ModelFile(
        "tokenizer.json",
        f"{BASE_URL}/tokenizer.json",
        "b60b6b43406a48bf3638526314f3d232d97058bc93472ff2de930d43686fa441",
    ),
)


class ModelChecksumError(Exception):
    def __init__(self, name: str) -> None:
        super().__init__(
            f"La huella de «{name}» no coincide: el archivo descargado no es el esperado."
        )


def default_models_directory() -> Path:
    """`engine/models` en desarrollo; el instalador de la Fase 8 indica otra con la variable."""
    configured = os.environ.get(MODELS_ENV_VAR)
    return Path(configured) if configured else Path(__file__).resolve().parents[3] / "models"


def embedding_model_directory(models_directory: Path) -> Path:
    return models_directory / MODEL_NAME


def is_model_available(directory: Path, files: Sequence[ModelFile] = EMBEDDING_MODEL_FILES) -> bool:
    return all((directory / file.name).is_file() for file in files)


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(CHUNK_BYTES), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_model(directory: Path, files: Sequence[ModelFile] = EMBEDDING_MODEL_FILES) -> None:
    """Descarga los archivos que faltan o no coinciden; nunca deja un archivo a medias."""
    directory.mkdir(parents=True, exist_ok=True)
    for file in files:
        target = directory / file.name
        if target.is_file() and sha256_of(target) == file.sha256:
            continue
        partial = target.with_suffix(f"{target.suffix}.part")
        with urllib.request.urlopen(file.url) as response, partial.open("wb") as stream:
            shutil.copyfileobj(response, stream, CHUNK_BYTES)
        if sha256_of(partial) != file.sha256:
            partial.unlink()
            raise ModelChecksumError(file.name)
        partial.replace(target)


def main() -> None:
    directory = embedding_model_directory(default_models_directory())
    download_model(directory)
    sys.stdout.write(f"Modelo listo en {directory}\n")


if __name__ == "__main__":
    main()
