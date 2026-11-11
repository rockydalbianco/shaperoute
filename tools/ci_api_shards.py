"""The API's test files split into shards, for the `api-tests` matrix of
.github/workflows/ci.yml (TASK-438).

The whole suite on one runner took 27 to 39 minutes, and no single file
weighs more than 5 % of it: the time is spread over every test. So the suite
runs in N jobs side by side, each on its own share of the test files, and
every file belongs to exactly one share.

    python tools/ci_api_shards.py --shard 2 --of 4
        prints the files of the second of four shards, one per line, as
        paths relative to services/api (where pytest runs).

    python tools/ci_api_shards.py --of 4 --check collected.txt
        reads the output of `pytest --collect-only -q` and fails when pytest
        collects a test from a file that no shard runs.

The split is a function of the files alone: no saved timings to go stale, no
randomness. A file weighs as many `def test_` as it has; files go, heaviest
first, to the lightest shard so far. On the runs of 2026-11-10 the slowest of
four shards was within 10 % of a perfect split.

Standard library only: it runs before anything is installed.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections.abc import Iterable, Mapping
from pathlib import Path

API = Path(__file__).resolve().parent.parent / "services" / "api"
TESTS = "tests"

# The names pytest collects by default (`python_files`): services/api's
# pyproject.toml does not change them.
PATTERNS = ("test_*.py", "*_test.py")

TEST_FUNCTION = re.compile(r"^[ \t]*(?:async[ \t]+)?def test_", re.MULTILINE)


def api_test_files(api: Path = API) -> list[str]:
    """Every test file under services/api/tests, as sorted posix paths
    relative to services/api."""
    found = {
        path.relative_to(api).as_posix()
        for pattern in PATTERNS
        for path in (api / TESTS).rglob(pattern)
        if path.is_file()
    }
    return sorted(found)


def weight(source: str) -> int:
    """How much a file counts: its test functions, never less than one. A
    parametrized test counts once: close enough to share the time out."""
    return max(1, len(TEST_FUNCTION.findall(source)))


def weights(api: Path = API) -> dict[str, int]:
    return {
        name: weight((api / name).read_text(encoding="utf-8"))
        for name in api_test_files(api)
    }


def split(sizes: Mapping[str, int], count: int) -> list[list[str]]:
    """`count` lists of files that together hold every file once. Heaviest
    first (then by name), each to the lightest shard so far (then the first):
    the same files and sizes always give the same shards."""
    if count < 1:
        raise ValueError(f"at least one shard, not {count}")
    shards: list[list[str]] = [[] for _ in range(count)]
    loads = [0] * count
    for name in sorted(sizes, key=lambda name: (-sizes[name], name)):
        lightest = min(range(count), key=lambda index: (loads[index], index))
        shards[lightest].append(name)
        loads[lightest] += sizes[name]
    return [sorted(shard) for shard in shards]


def collected_files(lines: Iterable[str]) -> set[str]:
    """The files of the tests listed by `pytest --collect-only -q`: one
    `tests/test_x.py::test_name` per line, then a summary without `::`."""
    return {line.split("::", 1)[0].strip() for line in lines if "::" in line}


def not_covered(lines: Iterable[str], files: Iterable[str]) -> list[str]:
    """The files pytest collects tests from that are in no shard."""
    return sorted(collected_files(lines) - set(files))


def main(argv: list[str] | None = None, api: Path = API) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--of", type=int, required=True, help="how many shards")
    parser.add_argument("--shard", type=int, help="which one, from 1")
    parser.add_argument("--check", type=Path, help="pytest --collect-only -q output")
    args = parser.parse_args(argv)
    if (args.shard is None) == (args.check is None):
        parser.error("give --shard or --check, one of the two")

    sizes = weights(api)
    if args.of < 1 or args.of > len(sizes):
        # An empty shard would call pytest without files: the whole suite.
        print(f"{args.of} shards for {len(sizes)} test files", file=sys.stderr)
        return 1
    shards = split(sizes, args.of)

    if args.check is not None:
        lines = args.check.read_text(encoding="utf-8").splitlines()
        tests = sum(1 for line in lines if "::" in line)
        missing = not_covered(lines, sizes)
        if missing or not tests:
            for name in missing:
                print(f"::error::{name} has tests that no shard runs")
            if not tests:
                print(f"::error::no test listed in {args.check}")
            return 1
        print(
            f"{tests} tests collected from {len(collected_files(lines))} files;"
            f" {len(sizes)} test files in {args.of} shards, each file in one."
        )
        for number, shard in enumerate(shards, start=1):
            load = sum(sizes[name] for name in shard)
            print(f"  shard {number}: {len(shard)} files, {load} test functions")
        return 0

    if not 1 <= args.shard <= args.of:
        print(f"shard {args.shard} of {args.of}", file=sys.stderr)
        return 1
    print("\n".join(shards[args.shard - 1]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
