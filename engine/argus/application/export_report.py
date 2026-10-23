import re
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from argus.application.ports.clock import Clock
from argus.application.ports.document_archive import FileOpener
from argus.application.ports.repositories import SessionRepository
from argus.domain.errors import ReportNotFoundError
from argus.domain.report_document import ReportDocument, ReportFormat

FILE_PREFIX = "Informe"
DATE_FORMAT = "%d%m%y"
UNSAFE_CHARACTERS = re.compile(r"[^\w\-]+")


class ReportRenderer(Protocol):
    def render(self, document: ReportDocument) -> bytes: ...


@dataclass(frozen=True)
class SavedReport:
    folder: str
    file_name: str


class ReportFolder(Protocol):
    """La carpeta donde se guardan los informes de cada expediente."""

    def folder_for(self, case_file: str) -> str: ...

    def save(self, case_file: str, file_name: str, content: bytes) -> SavedReport: ...

    def path_of(self, case_file: str, file_name: str) -> Path | None:
        """La ruta del informe guardado, o None si ya no está."""
        ...


def safe_name(text: str) -> str:
    """Un nombre que sirve como carpeta o archivo en Windows y Linux: «Expediente_2026-118»."""
    return UNSAFE_CHARACTERS.sub("_", text.strip()).strip("_") or FILE_PREFIX


@dataclass(frozen=True)
class ExportRequest:
    session_id: str
    format: ReportFormat
    document: ReportDocument


@dataclass(frozen=True)
class ReportTools:
    renderers: Mapping[ReportFormat, ReportRenderer]
    folder: ReportFolder
    clock: Clock


class ExportReport:
    """Caso de uso: maqueta el informe del expediente y lo guarda en su carpeta de Documentos."""

    def __init__(self, sessions: SessionRepository, tools: ReportTools) -> None:
        self._sessions = sessions
        self._tools = tools

    def folder(self, session_id: str) -> SavedReport:
        """Dónde quedará el informe y con qué nombre (sin extensión), antes de exportarlo."""
        case_file = self._case_file(session_id)
        stem = f"{FILE_PREFIX}_{case_file}_{self._tools.clock.now().strftime(DATE_FORMAT)}"
        return SavedReport(self._tools.folder.folder_for(case_file), stem)

    def execute(self, request: ExportRequest) -> SavedReport:
        planned = self.folder(request.session_id)
        content = self._tools.renderers[request.format].render(request.document)
        file_name = f"{planned.file_name}.{request.format}"
        return self._tools.folder.save(self._case_file(request.session_id), file_name, content)

    def _case_file(self, session_id: str) -> str:
        return safe_name(self._sessions.get(session_id).name)


class OpenReport:
    """«Abrir informe»: abre el archivo exportado con la aplicación del sistema."""

    def __init__(
        self, sessions: SessionRepository, folder: ReportFolder, opener: FileOpener
    ) -> None:
        self._sessions = sessions
        self._folder = folder
        self._opener = opener

    def execute(self, session_id: str, file_name: str) -> None:
        case_file = safe_name(self._sessions.get(session_id).name)
        path = self._folder.path_of(case_file, file_name)
        if path is None:
            raise ReportNotFoundError(file_name)
        self._opener.open(path)
