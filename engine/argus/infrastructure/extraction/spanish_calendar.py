SPANISH_MONTHS: dict[str, int] = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

# Los nombres más largos primero, para que «septiembre» no se lea como otra alternativa.
MONTH_NAME_PATTERN = "|".join(sorted(SPANISH_MONTHS, key=len, reverse=True))


def month_number(month_text: str) -> int:
    """Número de mes a partir de «07» o de «julio» (sin importar mayúsculas)."""
    if month_text.isdigit():
        return int(month_text)
    return SPANISH_MONTHS[month_text.lower()]
