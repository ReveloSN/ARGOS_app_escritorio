from pathlib import Path, PurePath

from platformdirs import user_documents_dir

from argus.application.export_report import SavedReport

APP_FOLDER = "ARGUS"


def default_reports_directory() -> Path:
    """Documentos/ARGUS del usuario, en Windows y en Linux."""
    return Path(user_documents_dir()) / APP_FOLDER


class DocumentsReportFolder:
    """Guarda cada informe en la carpeta de su expediente; reemplaza el del mismo nombre."""

    def __init__(self, root: Path) -> None:
        self._root = root

    def folder_for(self, case_file: str) -> str:
        return str(self._root / case_file)

    def save(self, case_file: str, file_name: str, content: bytes) -> SavedReport:
        folder = self._root / case_file
        folder.mkdir(parents=True, exist_ok=True)
        (folder / PurePath(file_name).name).write_bytes(content)
        return SavedReport(str(folder), PurePath(file_name).name)

    def path_of(self, case_file: str, file_name: str) -> Path | None:
        # Solo el nombre: nunca se abre algo fuera de la carpeta del expediente.
        path = self._root / case_file / PurePath(file_name).name
        return path if path.is_file() else None
