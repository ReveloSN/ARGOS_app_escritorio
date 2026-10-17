from pathlib import Path
from typing import Protocol

from argus.domain.errors import HistoryFolderError, HistoryFolderProblem


class HistoryCopier(Protocol):
    def copy_to(self, target: Path) -> None:
        """Copia el historial completo y verifica la copia; HistoryFolderError si no se puede."""
        ...


class HistoryPointer(Protocol):
    def point_to(self, folder: Path) -> None:
        """Recuerda la carpeta del historial para el próximo arranque del motor."""
        ...


class ChangeHistoryFolder:
    """Ajustes > Privacidad > carpeta del historial: mueve los datos y vale desde el reinicio.

    La carpeta anterior no se borra: si algo sale mal después, el historial sigue allí.
    """

    def __init__(self, current: Path, copier: HistoryCopier, pointer: HistoryPointer) -> None:
        self._current = current
        self._copier = copier
        self._pointer = pointer

    def execute(self, target: Path) -> Path:
        if target.resolve() == self._current.resolve():
            raise HistoryFolderError(HistoryFolderProblem.SAME_FOLDER)
        self._copier.copy_to(target)
        self._pointer.point_to(target)
        return target
