"""Reglas de capas de CLAUDE.md §3 verificadas sobre el código fuente.

Se comprueban con el AST para que una violación falle en CI aunque nadie la note en revisión.
"""

import ast
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[2] / "argus"

FORBIDDEN_IMPORTS_BY_LAYER: dict[str, tuple[str, ...]] = {
    "domain": (
        "argus.application",
        "argus.infrastructure",
        "argus.api",
        "fastapi",
        "pydantic",
        "uvicorn",
        "sqlite3",
    ),
    "application": ("argus.infrastructure", "argus.api", "fastapi", "uvicorn", "sqlite3"),
}


def imported_modules(source_file: Path) -> set[str]:
    tree = ast.parse(source_file.read_text(encoding="utf-8"))
    modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            modules.add(node.module)
    return modules


def is_within_package(module: str, package: str) -> bool:
    return module == package or module.startswith(f"{package}.")


def find_violations(layer_dir: Path, forbidden: tuple[str, ...]) -> list[str]:
    return [
        f"{source.name} importa {module}"
        for source in layer_dir.rglob("*.py")
        for module in imported_modules(source)
        if any(is_within_package(module, package) for package in forbidden)
    ]


@pytest.mark.parametrize("layer", FORBIDDEN_IMPORTS_BY_LAYER)
def test_layer_does_not_depend_on_outer_layers(layer: str) -> None:
    violations = find_violations(PACKAGE_ROOT / layer, FORBIDDEN_IMPORTS_BY_LAYER[layer])

    assert violations == []


def test_violation_is_detected_in_both_import_forms(tmp_path: Path) -> None:
    (tmp_path / "entity.py").write_text(
        "import fastapi\nfrom argus.infrastructure.sqlite import Store\n", encoding="utf-8"
    )

    violations = find_violations(tmp_path, FORBIDDEN_IMPORTS_BY_LAYER["domain"])

    assert sorted(violations) == [
        "entity.py importa argus.infrastructure.sqlite",
        "entity.py importa fastapi",
    ]


def test_package_with_similar_prefix_is_not_a_violation() -> None:
    assert not is_within_package("fastapix", "fastapi")
