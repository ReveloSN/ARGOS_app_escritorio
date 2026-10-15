from typing import Annotated

from fastapi import APIRouter, File, Form, UploadFile
from starlette.concurrency import run_in_threadpool

from argus.api.review_response import to_review_response
from argus.api.schemas.review import ReviewResponse
from argus.application.ports.document_reader import DocumentSource
from argus.application.run_review import ReviewRequest, RunReview

UNNAMED_FILE = "archivo_sin_nombre"


def build_reviews_router(run_review: RunReview) -> APIRouter:
    router = APIRouter()

    @router.post("/reviews")
    async def create_review(
        name: Annotated[str, Form(min_length=1)],
        files: Annotated[list[UploadFile], File()],
    ) -> ReviewResponse:
        sources = tuple(
            [DocumentSource(file.filename or UNNAMED_FILE, await file.read()) for file in files]
        )
        # Leer y comparar es trabajo de CPU: fuera del bucle de eventos para no bloquear /health.
        outcome = await run_in_threadpool(run_review.execute, ReviewRequest(name.strip(), sources))
        return to_review_response(outcome)

    return router
