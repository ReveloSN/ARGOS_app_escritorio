"""Pruebas que usan el modelo de embeddings real.

En local se omiten si el modelo no está descargado; en CI se exige (ARGUS_REQUIRE_MODELS=1),
de modo que una prueba omitida nunca oculta un fallo.
"""

import os

import pytest

from argus.infrastructure.nlp.embedding_model import (
    default_models_directory,
    embedding_model_directory,
    is_model_available,
)

REQUIRE_MODELS_ENV_VAR = "ARGUS_REQUIRE_MODELS"
MODEL_DIRECTORY = embedding_model_directory(default_models_directory())

requires_embedding_model = pytest.mark.skipif(
    not is_model_available(MODEL_DIRECTORY) and not os.environ.get(REQUIRE_MODELS_ENV_VAR),
    reason="Modelo de embeddings no descargado: uv run python -m argus.infrastructure.nlp.embedding_model",
)
