import subprocess
from pathlib import Path

import pytest

from argus.domain.errors import OcrUnavailableError
from argus.domain.ocr import PageCount, ReadMethod
from argus.infrastructure.ocr.pdfium_page_renderer import PdfiumPageRenderer
from argus.infrastructure.ocr.tesseract import TesseractCommand, TesseractLocator
from argus.infrastructure.ocr.tesseract_ocr_engine import TesseractOcrEngine
from tests.infrastructure.conftest import FIXTURES_DIR

PNG_SIGNATURE = bytes([0x89]) + b"PNG"


class FixedLocator(TesseractLocator):
    def __init__(self, executable: Path | None) -> None:
        super().__init__(Path("no-existe"))
        self._executable = executable

    def locate(self) -> Path | None:
        return self._executable


class TwoPages:
    def render(self, content: bytes) -> tuple[bytes, ...]:
        return (b"pagina-1", b"pagina-2")


class RecordingRun:
    """Sustituye a subprocess.run: anota cada orden y responde un texto fijo."""

    def __init__(self, stdout: bytes) -> None:
        self.stdout = stdout
        self.commands: list[list[str]] = []
        self.inputs: list[bytes] = []
        self.environments: list[dict[str, str]] = []

    def __call__(
        self,
        command: list[str],
        *,
        input: bytes,
        env: dict[str, str],
        **options: object,
    ) -> subprocess.CompletedProcess[bytes]:
        self.commands.append(command)
        self.inputs.append(input)
        self.environments.append(env)
        return subprocess.CompletedProcess(command, 0, stdout=self.stdout)


def test_each_page_goes_to_tesseract_in_spanish_and_english(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    run = RecordingRun(b"Contrato No. 4587")
    monkeypatch.setattr(subprocess, "run", run)
    pages: list[PageCount] = []
    engine = TesseractOcrEngine(TwoPages(), FixedLocator(tmp_path / "tesseract"))

    result = engine.recognize(b"%PDF", pages.append)

    assert result.page_texts == ("Contrato No. 4587", "Contrato No. 4587")
    assert result.method is ReadMethod.LOCAL_OCR
    assert pages == [PageCount(1, 2), PageCount(2, 2)]
    assert run.commands[0][1:] == ["stdin", "stdout", "-l", "spa+eng"]
    assert run.inputs == [b"pagina-1", b"pagina-2"]


def test_the_bundled_tesseract_uses_its_own_languages(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    (tmp_path / "tessdata").mkdir()
    run = RecordingRun(b"texto")
    monkeypatch.setattr(subprocess, "run", run)

    TesseractCommand(tmp_path / "tesseract").recognize(b"imagen")

    assert run.environments[0]["TESSDATA_PREFIX"] == str(tmp_path / "tessdata")


def test_a_tesseract_that_hangs_is_unavailable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    def hang(command: list[str], **options: object) -> None:
        raise subprocess.TimeoutExpired(command, 60)

    monkeypatch.setattr(subprocess, "run", hang)

    with pytest.raises(OcrUnavailableError):
        TesseractCommand(tmp_path / "tesseract").recognize(b"imagen")


def test_without_tesseract_the_local_ocr_is_unavailable() -> None:
    engine = TesseractOcrEngine(TwoPages(), FixedLocator(None))

    with pytest.raises(OcrUnavailableError):
        engine.recognize(b"%PDF", lambda pages: None)


def test_the_configured_path_wins(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    executable = tmp_path / "mi-tesseract.exe"
    executable.write_bytes(b"")
    monkeypatch.setenv("ARGUS_TESSERACT", str(executable))

    locator = TesseractLocator(tmp_path / "sin-tesseract")

    assert locator.locate() == executable
    assert locator.is_available()


def test_without_any_tesseract_nothing_is_found(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.delenv("ARGUS_TESSERACT", raising=False)
    monkeypatch.setenv("PATH", str(tmp_path))

    assert TesseractLocator(tmp_path / "sin-tesseract").locate() is None


def test_each_page_of_a_scanned_pdf_becomes_a_png() -> None:
    images = PdfiumPageRenderer().render((FIXTURES_DIR / "anexo_3.pdf").read_bytes())

    assert len(images) == 1
    assert images[0].startswith(PNG_SIGNATURE)


def test_a_damaged_pdf_cannot_be_rendered() -> None:
    with pytest.raises(OcrUnavailableError):
        PdfiumPageRenderer().render((FIXTURES_DIR / "danado.pdf").read_bytes())
