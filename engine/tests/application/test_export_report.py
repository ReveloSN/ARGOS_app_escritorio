from pathlib import Path

import pytest

from argus.application.export_report import (
    ExportReport,
    ExportRequest,
    OpenReport,
    ReportTools,
    SavedReport,
    safe_name,
)
from argus.application.review_session_use_cases import StartReviewSession
from argus.domain.errors import ReportNotFoundError, SessionNotFoundError
from argus.domain.report_document import ReportDocument, ReportFormat
from argus.domain.review_session import ReviewSession
from tests.application.in_memory_repositories import (
    InMemoryAlertRepository,
    InMemorySessionRepository,
    RecordingFileOpener,
    SteppingClock,
)
from tests.domain.report_builders import report_document


class TitleRenderer:
    def __init__(self, extension: str) -> None:
        self._extension = extension

    def render(self, document: ReportDocument) -> bytes:
        return f"{self._extension}:{document.title}".encode()


class InMemoryReportFolder:
    def __init__(self) -> None:
        self.files: dict[tuple[str, str], bytes] = {}

    def folder_for(self, case_file: str) -> str:
        return f"Documentos/ARGUS/{case_file}"

    def save(self, case_file: str, file_name: str, content: bytes) -> SavedReport:
        self.files[(case_file, file_name)] = content
        return SavedReport(self.folder_for(case_file), file_name)

    def path_of(self, case_file: str, file_name: str) -> Path | None:
        return Path(case_file, file_name) if (case_file, file_name) in self.files else None


def case_file() -> tuple[InMemorySessionRepository, ReviewSession]:
    sessions = InMemorySessionRepository()
    session = StartReviewSession(sessions, InMemoryAlertRepository(), SteppingClock()).execute(
        "Expediente 2026-118", ("a.pdf",), []
    )
    return sessions, session


def exporter(folder: InMemoryReportFolder) -> tuple[ExportReport, ReviewSession]:
    sessions, session = case_file()
    renderers = {ReportFormat.PDF: TitleRenderer("pdf"), ReportFormat.DOCX: TitleRenderer("docx")}
    return ExportReport(sessions, ReportTools(renderers, folder, SteppingClock())), session


def test_names_the_report_after_the_case_file_and_the_date() -> None:
    export, session = exporter(InMemoryReportFolder())

    assert export.folder(session.id) == SavedReport(
        "Documentos/ARGUS/Expediente_2026-118", "Informe_Expediente_2026-118_131026"
    )


def test_exports_in_the_chosen_format_into_the_case_file_folder() -> None:
    folder = InMemoryReportFolder()
    export, session = exporter(folder)

    saved = export.execute(ExportRequest(session.id, ReportFormat.DOCX, report_document()))

    assert saved.file_name == "Informe_Expediente_2026-118_131026.docx"
    assert folder.files[("Expediente_2026-118", saved.file_name)] == (
        b"docx:Informe de revisi\xc3\xb3n documental"
    )


def test_an_unknown_case_file_has_no_report() -> None:
    export, _ = exporter(InMemoryReportFolder())

    with pytest.raises(SessionNotFoundError):
        export.folder("no-existe")


def test_opens_only_a_report_that_is_still_there() -> None:
    folder, opener = InMemoryReportFolder(), RecordingFileOpener()
    export, session = exporter(folder)
    saved = export.execute(ExportRequest(session.id, ReportFormat.PDF, report_document()))
    sessions, _ = case_file()
    sessions.save(session)
    report = OpenReport(sessions, folder, opener)

    report.execute(session.id, saved.file_name)

    assert opener.opened == [Path("Expediente_2026-118", saved.file_name)]
    with pytest.raises(ReportNotFoundError):
        report.execute(session.id, "otro.pdf")


def test_safe_names_work_as_folders_on_every_system() -> None:
    assert safe_name("Contrato 4857: v3/final") == "Contrato_4857_v3_final"
    assert safe_name("***") == "Informe"
