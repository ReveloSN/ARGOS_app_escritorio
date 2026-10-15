from pathlib import Path

from argus.application.ports.document_reader import DocumentSource
from argus.domain.document import Document

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def fixture_source(file_name: str) -> DocumentSource:
    return DocumentSource(file_name, (FIXTURES_DIR / file_name).read_bytes())


def all_text(document: Document) -> str:
    return "\n".join(fragment.text for fragment in document.fragments)
