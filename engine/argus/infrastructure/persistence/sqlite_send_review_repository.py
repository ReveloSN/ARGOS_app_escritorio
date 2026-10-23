from argus.domain.errors import SendReviewNotFoundError
from argus.domain.send_review import SendReview
from argus.infrastructure.persistence.send_review_serialization import (
    send_content_from_json,
    send_content_to_json,
)
from argus.infrastructure.persistence.sqlite_database import SqliteDatabase
from argus.infrastructure.persistence.timestamps import from_stored_timestamp, to_stored_timestamp


class SqliteSendReviewRepository:
    """Borradores revisados con su original, para poder armar la copia corregida después."""

    def __init__(self, database: SqliteDatabase) -> None:
        self._database = database

    def save(self, review: SendReview, original: bytes) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "INSERT INTO send_reviews (id, session_id, created_at, payload, original) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    review.id,
                    review.session_id,
                    to_stored_timestamp(review.created_at),
                    send_content_to_json(review.draft, review.issues),
                    original,
                ),
            )

    def get(self, review_id: str) -> SendReview:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT session_id, created_at, payload FROM send_reviews WHERE id = ?",
                (review_id,),
            ).fetchone()
        if row is None:
            raise SendReviewNotFoundError(review_id)
        session_id, created_at, payload = row
        draft, issues = send_content_from_json(payload)
        return SendReview(review_id, session_id, from_stored_timestamp(created_at), draft, issues)

    def original_of(self, review_id: str) -> bytes:
        with self._database.connect() as connection:
            row = connection.execute(
                "SELECT original FROM send_reviews WHERE id = ?", (review_id,)
            ).fetchone()
        if row is None:
            raise SendReviewNotFoundError(review_id)
        return bytes(row[0])
