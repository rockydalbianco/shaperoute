"""Candidate outlines, kept out of the package until judged (TASK-2001)."""

from pathlib import Path

import pytest

from route_engine.shapes import OUTLINES, SHAPES
from route_engine.shapes.outline import read_outline

CANDIDATES = Path(__file__).resolve().parents[1] / "candidates"
N = 64


def test_there_are_candidates() -> None:
    assert sorted(CANDIDATES.glob("*.json"))


@pytest.mark.parametrize(
    "path", sorted(CANDIDATES.glob("*.json")), ids=lambda p: p.stem
)
def test_every_candidate_is_a_valid_outline(path: Path) -> None:
    outline = read_outline(path)
    assert outline.name == path.stem
    for x, y in outline(N):
        assert -1.0 - 1e-9 <= x <= 1.0 + 1e-9
        assert -1.0 - 1e-9 <= y <= 1.0 + 1e-9


def test_no_candidate_is_in_the_package_or_the_catalogue() -> None:
    names = {path.stem for path in CANDIDATES.glob("*.json")}
    assert not names & {path.stem for path in OUTLINES.glob("*.json")}
    assert not names & set(SHAPES)
