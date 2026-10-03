"""Build the two files that let the app draw routes on the phone (TASK-214,
ADR-0177): Python in WebAssembly and the route engine, as assets of the app.

Usage (from the repository root):

    python tools/phone_engine/phone_engine.py            # both files
    python tools/phone_engine/phone_engine.py engine     # the engine only

It writes, in ``apps/mobile/assets/engine/``:

- ``pyodide.zip``: Pyodide 314.0.7 (Python 3.14 in WebAssembly) and the
  nine packages the engine imports, at fixed versions. They are downloaded once
  from the Pyodide CDN into ``out/phone_engine/`` and checked against the
  SHA-256 written here and in Pyodide's lock file. The lock file in the zip
  holds those nine packages only. It changes only when PYODIDE_VERSION does.
- ``engine.zip``: ``route_engine`` as it is in the repository, and the
  modules of the API and of the AI service that ``shaperoute_api.on_phone``
  imports, read from their ``import`` lines. It changes with the engine:
  ``tools/phone_engine/test_phone_engine.py`` fails, in CI, when it is older
  than the code, and says to run this script with ``engine``.

Both zips are stored, not compressed: the app's WebView reads them with a
few lines of JavaScript (apps/mobile/src/engine/page.ts), and the same code
gives the same bytes. Standard library only, as every script of tools/.
"""

from __future__ import annotations

import argparse
import ast
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from collections.abc import Iterable, Sequence
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "apps" / "mobile" / "assets" / "engine"
DOWNLOADS = ROOT / "out" / "phone_engine"

PYODIDE_VERSION = "314.0.7"
CDN = f"https://cdn.jsdelivr.net/pyodide/v{PYODIDE_VERSION}/full/"
# The files of Pyodide itself, as the CDN and the npm package give them.
CORE = {
    "pyodide.js": "3141b814715a72e59b51b1b18b9ceae5bf19f7c852417e431bb0a34feadf825c",
    "pyodide.asm.mjs": (
        "f7cdc8ece80678ceb712f8e65ebe6d3a83203a180c399865f49612a051693635"
    ),
    "pyodide.asm.wasm": (
        "cc36e3cab04fdfc9a63ff13eb52eae2b911bf46c025cc7b281f394bd3de1d5e6"
    ),
    "python_stdlib.zip": (
        "fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a"
    ),
    "pyodide-lock.json": (
        "5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010"
    ),
}
LOCK = "pyodide-lock.json"
# What the engine and the API's job import, with what they import in turn.
PACKAGES = (
    "numpy",
    "networkx",
    "shapely",
    "pillow",
    "pydantic",
    "pydantic-core",
    "typing-extensions",
    "annotated-types",
    "typing-inspection",
)
# Pyodide's networkx asks for matplotlib, setuptools and decorator, 10 MB
# the engine never imports: networkx 3 imports none of them.
DEPENDS = {"networkx": ["numpy"]}
NOTICE = "THIRD_PARTY.txt"
LICENSES = (
    ("Pyodide", PYODIDE_VERSION, "MPL-2.0", "https://github.com/pyodide/pyodide"),
    ("CPython (in Pyodide)", "3.14", "PSF-2.0", "https://github.com/python/cpython"),
    ("NumPy", "", "BSD-3-Clause", "https://github.com/numpy/numpy"),
    ("NetworkX", "", "BSD-3-Clause", "https://github.com/networkx/networkx"),
    ("Shapely", "", "BSD-3-Clause", "https://github.com/shapely/shapely"),
    ("Pillow", "", "MIT-CMU (HPND)", "https://github.com/python-pillow/Pillow"),
    ("pydantic", "", "MIT", "https://github.com/pydantic/pydantic"),
    ("pydantic-core", "", "MIT", "https://github.com/pydantic/pydantic-core"),
    ("typing_extensions", "", "PSF-2.0", "https://github.com/python/typing_extensions"),
    (
        "annotated-types",
        "",
        "MIT",
        "https://github.com/annotated-types/annotated-types",
    ),
    ("typing-inspection", "", "MIT", "https://github.com/pydantic/typing-inspection"),
)

# Where each top-level package of the engine zip lives in the repository.
SOURCES = {
    "route_engine": ROOT / "services" / "route-engine",
    "shaperoute_api": ROOT / "services" / "api",
    "shaperoute_ai": ROOT / "services" / "ai",
}
ENTRY = "shaperoute_api.on_phone"
# Taken whole, with its data (letters, outlines); the others module by module.
WHOLE = "route_engine"

# A fixed date: the same files give the same zip.
DATE = (1980, 1, 1, 0, 0, 0)


class BuildError(RuntimeError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def stored_zip(files: Iterable[tuple[str, bytes]]) -> bytes:
    """A zip of `files`, by name, not compressed, with no dates."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        for name, data in sorted(files):
            info = zipfile.ZipInfo(name, date_time=DATE)
            info.create_system = 3
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
    return buffer.getvalue()


def zip_files(data: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        return {name: archive.read(name) for name in archive.namelist()}


# --- engine.zip -------------------------------------------------------------


def module_path(module: str, sources: dict[str, Path] = SOURCES) -> Path | None:
    """The file of `module` in the repository, None if it is not ours."""
    top = module.split(".")[0]
    if top not in sources:
        return None
    base = sources[top].joinpath(*module.split("."))
    if (base / "__init__.py").is_file():
        return base / "__init__.py"
    if base.with_suffix(".py").is_file():
        return base.with_suffix(".py")
    return None


def imported(module: str, path: Path) -> set[str]:
    """Every module `path` names in an import, at the top or in a function:
    for `from a import b`, both `a` and `a.b` (b may be a module)."""
    package = module if path.name == "__init__.py" else module.rpartition(".")[0]
    names: set[str] = set()
    for node in ast.walk(ast.parse(path.read_bytes(), filename=str(path))):
        if isinstance(node, ast.Import):
            names.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            if node.level:
                parts = package.split(".")
                parts = parts[: len(parts) - node.level + 1]
                base = ".".join(parts + ([node.module] if node.module else []))
            else:
                base = node.module or ""
            names.add(base)
            names.update(f"{base}.{alias.name}" for alias in node.names)
    return names


def closure(entry: str, sources: dict[str, Path] = SOURCES) -> dict[str, Path]:
    """`entry` and every module of ours it imports, directly or not, with
    the packages that hold them."""
    found: dict[str, Path] = {}
    todo = [entry]
    while todo:
        module = todo.pop()
        if module in found:
            continue
        path = module_path(module, sources)
        if path is None:
            continue
        found[module] = path
        parts = module.split(".")
        todo.extend(".".join(parts[:i]) for i in range(1, len(parts)))
        todo.extend(imported(module, path))
    return found


def package_files(top: str, sources: dict[str, Path] = SOURCES) -> dict[str, Path]:
    """Every file of the package `top`, by its name in the zip."""
    root = sources[top]
    return {
        path.relative_to(root).as_posix(): path
        for path in sorted((root / top).rglob("*"))
        if path.is_file()
        and "__pycache__" not in path.parts
        and not path.name.startswith(".")
        and path.suffix != ".pyc"
    }


def engine_files(sources: dict[str, Path] = SOURCES) -> dict[str, bytes]:
    """The files of engine.zip, by name: the whole engine, and of the rest
    only what `ENTRY` imports."""
    files = {
        name: path.read_bytes() for name, path in package_files(WHOLE, sources).items()
    }
    for module, path in closure(ENTRY, sources).items():
        if module.split(".")[0] != WHOLE:
            files[path.relative_to(sources[module.split(".")[0]]).as_posix()] = (
                path.read_bytes()
            )
    return files


def build_engine(assets: Path = ASSETS) -> Path:
    assets.mkdir(parents=True, exist_ok=True)
    target = assets / "engine.zip"
    target.write_bytes(stored_zip(engine_files().items()))
    return target


# --- pyodide.zip ------------------------------------------------------------


def download(name: str, expected: str, downloads: Path = DOWNLOADS) -> bytes:
    """The file `name` of the Pyodide CDN, kept in `downloads`, checked."""
    path = downloads / PYODIDE_VERSION / name
    if not path.is_file():
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {name}", file=sys.stderr)
        with urllib.request.urlopen(CDN + name, timeout=120) as answer:
            data = answer.read()
        if sha256(data) != expected:
            raise BuildError(f"{name}: the CDN gave a file with another SHA-256")
        path.write_bytes(data)
    data = path.read_bytes()
    if sha256(data) != expected:
        raise BuildError(f"{path}: not the expected file; delete it and run again")
    return data


def trimmed_lock(lock: dict) -> dict:
    """Pyodide's lock file with only PACKAGES, and their dependencies
    among them."""
    packages = {}
    for name in PACKAGES:
        package = dict(lock["packages"][name])
        package["depends"] = DEPENDS.get(name, package["depends"])
        packages[name] = package
    known = {_key(name) for name in packages}
    for name, package in packages.items():
        missing = [d for d in package["depends"] if _key(d) not in known]
        if missing:
            raise BuildError(f"{name} depends on {missing}, not in PACKAGES")
    return {"info": lock["info"], "packages": packages}


def _key(name: str) -> str:
    return name.lower().replace("_", "-")


def notice(lock: dict) -> bytes:
    """Who wrote what is in pyodide.zip, under which license."""
    versions = {_key(p["name"]): p["version"] for p in lock["packages"].values()}
    lines = [
        "Third-party software in pyodide.zip, run by Sgrava's WebView to draw",
        "routes on the phone (TASK-214). Sources at the addresses below.",
        "",
    ]
    for name, version, license_, url in LICENSES:
        version = version or versions.get(_key(name), "")
        lines.append(f"{name} {version}: {license_}, {url}")
    return ("\n".join(lines) + "\n").encode()


def pyodide_files(downloads: Path = DOWNLOADS) -> dict[str, bytes]:
    files = {name: download(name, digest, downloads) for name, digest in CORE.items()}
    lock = trimmed_lock(json.loads(files[LOCK]))
    files[LOCK] = json.dumps(lock, sort_keys=True, separators=(",", ":")).encode()
    for package in lock["packages"].values():
        name = package["file_name"]
        files[name] = download(name, package["sha256"], downloads)
    files[NOTICE] = notice(lock)
    return files


def build_pyodide(assets: Path = ASSETS, downloads: Path = DOWNLOADS) -> Path:
    assets.mkdir(parents=True, exist_ok=True)
    target = assets / "pyodide.zip"
    target.write_bytes(stored_zip(pyodide_files(downloads).items()))
    return target


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "what", nargs="?", choices=("all", "engine", "pyodide"), default="all"
    )
    what = parser.parse_args(argv).what
    built = []
    if what in ("all", "pyodide"):
        built.append(build_pyodide())
    if what in ("all", "engine"):
        built.append(build_engine())
    for path in built:
        print(f"{path.relative_to(ROOT)}: {path.stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
