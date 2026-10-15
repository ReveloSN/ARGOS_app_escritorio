from datetime import UTC, datetime


def to_stored_timestamp(moment: datetime) -> str:
    """UTC con microsegundos fijos: así las fechas guardadas se ordenan bien como texto."""
    return moment.astimezone(UTC).isoformat(timespec="microseconds")


def from_stored_timestamp(text: str) -> datetime:
    return datetime.fromisoformat(text)
