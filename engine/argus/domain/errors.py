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


class ComparisonItemNotFoundError(ArgusDomainError):
    """El número no corresponde a ningún cambio ni inconsistencia de la comparación."""

    def __init__(self, comparison_id: str, number: int) -> None:
        super().__init__(f"La comparación «{comparison_id}» no tiene el elemento {number}.")
        self.comparison_id = comparison_id
        self.number = number


class FactNotFoundError(ArgusDomainError):
    def __init__(self, session_id: str, fact_id: int) -> None:
        super().__init__(f"La sesión «{session_id}» no tiene el dato {fact_id}.")
        self.session_id = session_id
        self.fact_id = fact_id


class UnrecognizedFactValueError(ArgusDomainError):
    """El texto escrito no contiene un valor del tipo elegido (un monto, una fecha…)."""

    def __init__(self, entity_type: str, text: str) -> None:
        super().__init__(f"No se reconoce un valor de tipo «{entity_type}» en «{text}».")
        self.entity_type = entity_type
        self.text = text


class SendReviewNotFoundError(ArgusDomainError):
    def __init__(self, review_id: str) -> None:
        super().__init__(f"No existe la revisión del borrador «{review_id}».")
        self.review_id = review_id


class SendIssueNotFoundError(ArgusDomainError):
    def __init__(self, review_id: str, number: int) -> None:
        super().__init__(f"El borrador «{review_id}» no tiene el problema {number}.")
        self.review_id = review_id
        self.number = number


class NotADraftEmailError(ArgusDomainError):
    """Lo que se eligió para revisar antes de enviar no es un correo (.eml)."""

    def __init__(self, file_name: str) -> None:
        super().__init__(f"«{file_name}» no es un borrador de correo (.eml).")
        self.file_name = file_name


class ReportNotFoundError(ArgusDomainError):
    """El informe exportado ya no está en su carpeta (se movió o se borró)."""

    def __init__(self, file_name: str) -> None:
        super().__init__(f"No se encontró el informe «{file_name}».")
        self.file_name = file_name


class KeychainUnavailableError(ArgusDomainError):
    """El llavero del sistema no está disponible (en Linux, sin Secret Service)."""


class ExplanationProviderError(ArgusDomainError):
    """El proveedor de IA no dio una explicación; `reason` elige el mensaje en la interfaz."""

    def __init__(self, reason: str) -> None:
        super().__init__(f"El proveedor de IA no respondió: {reason}.")
        self.reason = reason
