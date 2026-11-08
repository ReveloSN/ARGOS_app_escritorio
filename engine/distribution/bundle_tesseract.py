"""Tesseract para los instaladores (ADR 027): copia el programa, sus bibliotecas y los idiomas.

Deja en `engine/dist/tesseract/` lo que Tauri incluye como recurso:
- `tesseract(.exe)` y, en Windows, sus DLL; en Linux, sus bibliotecas en `lib/` (sin la glibc,
  que pone el sistema); en macOS, sus `.dylib` en `lib/` con las rutas reescritas a
  `@loader_path` y firmadas ad hoc (sin las de `/usr/lib` y `/System`, que pone el sistema);
- `tessdata/` con español e inglés (tessdata_fast 4.1.0, verificados por SHA-256);
- `LICENSE` de Tesseract (Apache 2.0), que exige acompañar cada copia redistribuida.

Uso, desde engine/ y con Tesseract instalado en el equipo de compilación:
    uv run python distribution/bundle_tesseract.py [ruta/al/tesseract]
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from argus.infrastructure.nlp.embedding_model import ModelFile, download_model

ENGINE_DIR = Path(__file__).resolve().parent.parent
TARGET = ENGINE_DIR / "dist" / "tesseract"
TESSDATA_URL = "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0"
LANGUAGES = (
    ModelFile(
        "spa.traineddata",
        f"{TESSDATA_URL}/spa.traineddata",
        "6f2e04d02774a18f01bed44b1111f2cd7f3ba7ac9dc4373cd3f898a40ea6b464",
    ),
    ModelFile(
        "eng.traineddata",
        f"{TESSDATA_URL}/eng.traineddata",
        "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2",
    ),
)
LICENSE = ModelFile(
    "LICENSE",
    "https://raw.githubusercontent.com/tesseract-ocr/tesseract/5.5.0/LICENSE",
    "cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30",
)
WINDOWS_DEFAULT = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
# Las pone cualquier Linux con una glibc igual o más nueva que la de compilación.
SYSTEM_LIBRARIES = re.compile(
    r"^(linux-vdso|ld-linux|libc|libm|libpthread|libdl|librt|libresolv)\.so"
)
LDD_LINE = re.compile(r"=>\s+(/\S+)")
# macOS: las bibliotecas del sistema no se copian; las demás (Homebrew) viajan en lib/.
MACOS_SYSTEM_PREFIXES = ("/usr/lib/", "/System/")
MACOS_RELATIVE_PREFIXES = ("@rpath/", "@loader_path/", "@executable_path/")
MACOS_SEARCH_FOLDERS = (Path("/opt/homebrew/lib"), Path("/usr/local/lib"))
OTOOL_LINE = re.compile(r"^\s+(\S+) \(compatibility")


def find_tesseract(argument: str | None) -> Path:
    candidates = [argument, shutil.which("tesseract"), str(WINDOWS_DEFAULT)]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    sys.exit("No se encontró Tesseract: instálelo o indique su ruta.")


def copy_windows(executable: Path) -> None:
    for item in executable.parent.iterdir():
        if item.suffix.lower() in {".exe", ".dll"}:
            shutil.copy2(item, TARGET / item.name)


def linux_libraries(executable: Path) -> list[Path]:
    output = subprocess.run(
        ["ldd", str(executable)], capture_output=True, text=True, check=True
    ).stdout
    found = (LDD_LINE.search(line) for line in output.splitlines())
    paths = [Path(match.group(1)) for match in found if match]
    return [path for path in paths if not SYSTEM_LIBRARIES.match(path.name)]


def copy_linux(executable: Path) -> None:
    shutil.copy2(executable, TARGET / "tesseract")
    library_folder = TARGET / "lib"
    library_folder.mkdir()
    for library in linux_libraries(executable):
        shutil.copy2(library.resolve(), library_folder / library.name)


def macos_dependencies(binary: Path) -> list[str]:
    output = subprocess.run(
        ["otool", "-L", str(binary)], capture_output=True, text=True, check=True
    ).stdout
    found = (OTOOL_LINE.match(line) for line in output.splitlines()[1:])
    names = [match.group(1) for match in found if match]
    return [name for name in names if not name.startswith(MACOS_SYSTEM_PREFIXES)]


def resolve_macos_library(reference: str, owner: Path) -> Path:
    if not reference.startswith(MACOS_RELATIVE_PREFIXES):
        return Path(reference).resolve()
    name = reference.split("/", 1)[1]
    for folder in (owner.parent, *MACOS_SEARCH_FOLDERS):
        if (folder / name).is_file():
            return (folder / name).resolve()
    sys.exit(f"No se encontró la biblioteca {reference} que necesita {owner.name}.")


def new_macos_libraries(owner: Path, known: dict[str, Path]) -> dict[str, Path]:
    references = macos_dependencies(owner)
    return {
        Path(reference).name: resolve_macos_library(reference, owner)
        for reference in references
        if Path(reference).name not in known
    }


def collect_macos_libraries(executable: Path) -> dict[str, Path]:
    """Cada biblioteca de Homebrew que Tesseract necesita, directa o indirectamente, por el
    nombre con que se la referencia (un enlace como liblept.5.dylib) y su archivo real."""
    found: dict[str, Path] = {}
    pending = [executable]
    while pending:
        added = new_macos_libraries(pending.pop(), found)
        found.update(added)
        pending.extend(added.values())
    return found


def relink_macos(binary: Path, anchor: str) -> None:
    for reference in macos_dependencies(binary):
        name = Path(reference).name
        if name == binary.name:
            continue
        subprocess.run(
            ["install_name_tool", "-change", reference, f"{anchor}/{name}", str(binary)],
            check=True,
            capture_output=True,
        )


def copy_macos(executable: Path) -> None:
    library_folder = TARGET / "lib"
    library_folder.mkdir()
    copies = []
    for name, original in collect_macos_libraries(executable).items():
        copy = library_folder / name
        shutil.copy2(original, copy)
        copy.chmod(0o755)
        copies.append(copy)
    shutil.copy2(executable, TARGET / "tesseract")
    for copy in copies:
        relink_macos(copy, "@loader_path")
    relink_macos(TARGET / "tesseract", "@executable_path/lib")
    # install_name_tool invalida la firma; en Apple silicon un binario sin firma no arranca.
    for binary in (*copies, TARGET / "tesseract"):
        subprocess.run(["codesign", "--force", "--sign", "-", str(binary)], check=True)


def main() -> None:
    executable = find_tesseract(sys.argv[1] if len(sys.argv) > 1 else None)
    shutil.rmtree(TARGET, ignore_errors=True)
    TARGET.mkdir(parents=True)
    if os.name == "nt":
        copy_windows(executable)
    elif sys.platform == "darwin":
        copy_macos(executable)
    else:
        copy_linux(executable)
    download_model(TARGET / "tessdata", LANGUAGES)
    download_model(TARGET, (LICENSE,))
    sys.stdout.write(f"Tesseract listo en {TARGET}\n")


if __name__ == "__main__":
    main()
