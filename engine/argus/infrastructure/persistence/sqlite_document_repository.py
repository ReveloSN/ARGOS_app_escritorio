import json
import sqlite3
from collections.abc import Iterator, Sequence

from argus.domain.document import NamedFragment, TextFragment
from argus.domain.errors import UnreadableReason
from argus.domain.ocr import ReadMethod
from argus.domain.read_outcome import DocumentReadOutcome, ReadSummary
from argus.domain.text_search import fold_for_search
from argus.infrastructure.persistence.alert_serialization import (
    location_from_json,
    location_payload,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase

LIKE_ESCAPE = "\\"

type FragmentRow = tuple[str, int, int, str, str, str, str]


class SqliteDocumentRepository:
    """Cómo se leyó cada archivo de una sesión y su texto, con una columna plegada para buscar."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def save_all(self, session_id: str, documents: Sequence[DocumentReadOutcome]) -> None:
        summaries = [
            (session_id, position, *_summary_columns(outcome))
            for position, outcome in enumerate(documents)
        ]
        fragments = list(_fragment_rows(session_id, documents))
        with self._database.connect() as connection:
            connection.executemany(
                "INSERT INTO documents (session_id, position, name, reason, fragment_count, "
                "read_method, page_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
                summaries,
            )
            connection.executemany(
                "INSERT INTO fragments (session_id, document_position, ordinal, document_name, "
                "location, text, search_text) VALUES (?, ?, ?, ?, ?, ?, ?)",
                fragments,
            )

    def list_for(self, session_id: str) -> tuple[ReadSummary, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT name, reason, fragment_count, read_method, page_count FROM documents "
                "WHERE session_id = ? ORDER BY position",
                (session_id,),
            ).fetchall()
        return tuple(_to_summary(row) for row in rows)

    def position_of(self, session_id: str, document_name: str) -> int | None:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT position FROM documents WHERE session_id = ? AND name = ? "
                "AND reason IS NULL UNION ALL "
                "SELECT document_position FROM fragments WHERE session_id = ? "
                "AND document_name = ? LIMIT 1",
                (session_id, document_name, session_id, document_name),
            ).fetchone()
        return None if row is None else int(row[0])

    def fragments_matching(
        self, session_id: str, folded_query: str, limit: int
    ) -> tuple[NamedFragment, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT document_name, location, text FROM fragments "
                "WHERE session_id = ? AND search_text LIKE ? ESCAPE ? "
                "ORDER BY document_position, ordinal LIMIT ?",
                (session_id, f"%{_escape_like(folded_query)}%", LIKE_ESCAPE, limit),
            ).fetchall()
        return tuple(_to_fragment(row) for row in rows)

    def fragments_for(self, session_id: str) -> tuple[NamedFragment, ...]:
        with self._database.connect() as connection:
            rows = connection.execute(
                "SELECT document_name, location, text FROM fragments WHERE session_id = ? "
                "ORDER BY document_position, ordinal",
                (session_id,),
            ).fetchall()
        return tuple(_to_fragment(row) for row in rows)


def _summary_columns(
    outcome: DocumentReadOutcome,
) -> tuple[str, str | None, int, str, int | None]:
    return (
        outcome.name,
        outcome.reason,
        outcome.fragment_count,
        outcome.method,
        outcome.page_count,
    )


def _to_summary(row: tuple[str, str | None, int, str, int | None]) -> ReadSummary:
    name, reason, count, method, page_count = row
    unreadable = UnreadableReason(reason) if reason else None
    return ReadSummary(name, unreadable, count, ReadMethod(method), page_count)


def _fragment_rows(
    session_id: str, documents: Sequence[DocumentReadOutcome]
) -> Iterator[FragmentRow]:
    readable = [
        (position, outcome.document)
        for position, outcome in enumerate(documents)
        if outcome.document is not None
    ]
    for position, document in readable:
        for ordinal, named in enumerate(document.named_fragments()):
            text = named.fragment.text
            location = json.dumps(location_payload(named.fragment.location), ensure_ascii=False)
            yield (
                session_id,
                position,
                ordinal,
                named.document_name,
                location,
                text,
                fold_for_search(text),
            )


def _to_fragment(row: sqlite3.Row | tuple[str, str, str]) -> NamedFragment:
    document_name, location, text = row
    return NamedFragment(document_name, TextFragment(text, location_from_json(location)))


def _escape_like(text: str) -> str:
    for special in (LIKE_ESCAPE, "%", "_"):
        text = text.replace(special, f"{LIKE_ESCAPE}{special}")
    return text
