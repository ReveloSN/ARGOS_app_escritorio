from enum import StrEnum


class ArgusDomainError(Exception):
    """Base de los errores del dominio de ARGUS."""


class InvalidValueError(ArgusDomainError):
    """Un value object o entidad recibió un valor que viola sus invariantes."""


class UnreadableReason(StrEnum):
    """Por qué no se pudo leer un documento; la interfaz lo traduce a un mensaje de 3 partes."""

    NO_TEXT = "no_text"
    ENCRYPTED = "encrypted"
    CORRUPTED = "corrupted"
    TOO_LARGE = "too_large"
    NOT_FOUND = "not_found"
    UNSUPPORTED_FORMAT = "unsupported_format"


class UnreadableDocumentError(ArgusDomainError):
    def __init__(self, document_name: str, reason: UnreadableReason) -> None:
        super().__init__(f"No se pudo leer «{document_name}» ({reason}).")
        self.document_name = document_name
        self.reason = reason


class UnsupportedFormatError(UnreadableDocumentError):
    def __init__(self, document_name: str) -> None:
        super().__init__(document_name, UnreadableReason.UNSUPPORTED_FORMAT)


class SessionNotFoundError(ArgusDomainError):
    def __init__(self, session_id: str) -> None:
        super().__init__(f"No existe la sesión «{session_id}».")
        self.session_id = session_id


class AlertNotFoundError(ArgusDomainError):
    def __init__(self, session_id: str, alert_number: int) -> None:
        super().__init__(f"La sesión «{session_id}» no tiene la alerta {alert_number}.")
        self.session_id = session_id
        self.alert_number = alert_number


class ClosedSessionError(ArgusDomainError):
    """Una revisión cerrada queda en el historial como solo lectura."""

    def __init__(self, session_id: str) -> None:
        super().__init__(f"La sesión «{session_id}» está cerrada y no admite cambios.")
        self.session_id = session_id


class DocumentNotFoundError(ArgusDomainError):
    def __init__(self, session_id: str, document_name: str) -> None:
        super().__init__(f"La sesión «{session_id}» no tiene el archivo leído «{document_name}».")
        self.session_id = session_id
        self.document_name = document_name


class ArchivedFileMissingError(ArgusDomainError):
    """La copia del archivo ya no está en la carpeta del historial (se movió o se borró)."""

    def __init__(self, session_id: str, document_name: str) -> None:
        super().__init__(f"Falta la copia de «{document_name}» de la sesión «{session_id}».")
        self.session_id = session_id
        self.document_name = document_name


class HistoryFolderProblem(StrEnum):
    """Por qué no se pudo mover el historial a la carpeta elegida (mensaje de 3 partes)."""

    SAME_FOLDER = "same_folder"
    NOT_WRITABLE = "folder_not_writable"
    HAS_HISTORY = "folder_has_history"
    COPY_MISMATCH = "copy_mismatch"


class HistoryFolderError(ArgusDomainError):
    def __init__(self, problem: HistoryFolderProblem) -> None:
        super().__init__(f"No se pudo mover el historial: {problem}.")
        self.problem = problem


class ComparisonNotFoundError(ArgusDomainError):
    def __init__(self, comparison_id: str) -> None:
        super().__init__(f"No existe la comparación «{comparison_id}».")
        self.comparison_id = comparison_id


class NotEnoughDocumentsError(ArgusDomainError):
    """Cada modo de comparación necesita un mínimo de archivos (dos versiones, un correo…)."""

    def __init__(self, minimum: int, received: int) -> None:
        super().__init__(f"Se necesitan al menos {minimum} archivos y llegaron {received}.")
        self.minimum = minimum
        self.received = received
