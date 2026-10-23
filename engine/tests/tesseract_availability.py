"""Pruebas que usan el Tesseract real.

En local se omiten si no está instalado; en el CI de Ubuntu se exige (ARGUS_REQUIRE_TESSERACT=1),
de modo que una prueba omitida nunca oculta un fallo del adaptador.
"""

import os

import pytest

from argus.infrastructure.ocr.tesseract import TesseractLocator

REQUIRE_TESSERACT_ENV_VAR = "ARGUS_REQUIRE_TESSERACT"

requires_tesseract = pytest.mark.skipif(
    not TesseractLocator().is_available() and not os.environ.get(REQUIRE_TESSERACT_ENV_VAR),
    reason="Tesseract no está instalado en este equipo.",
)
