"""Comparación de texto para buscar sin importar mayúsculas ni tildes («Bogotá» = «bogota»)."""

import unicodedata


def fold_for_search(text: str) -> str:
    """Texto en minúsculas y sin tildes, con el mismo largo que el original.

    Conservar el largo permite ubicar la coincidencia en el texto original para mostrarla.
    """
    return "".join(_fold_character(character) for character in text)


def _fold_character(character: str) -> str:
    base = unicodedata.normalize("NFD", character)[0].lower()
    # Algunas minúsculas tienen dos caracteres («İ»); se conserva uno para no correr posiciones.
    return base[0]
