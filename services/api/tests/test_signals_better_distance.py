"""The «Try N km» of the line under a route done (TASK-234 C, ADR-0197).

A `hint_taken` with `hint: better_distance`, added to the ones of TASK-142:
the bodies an app sent before keep being recorded as they were.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from route_engine.network import FileSource

from shaperoute_api.app import create_app
from shaperoute_api.insights import Insights
from shaperoute_api.insights.analyze import demand
from shaperoute_api.insights.events import EventLog, read_events

HERE = Path(__file__).parent
FIXTURES = HERE.parents[2] / "packages/shared-types/fixtures"
BETTER = json.loads((FIXTURES / "signal-better-distance.json").read_text())
SIGNALS = json.loads((FIXTURES / "signals.json").read_text())


def client(tmp_path: Path) -> TestClient:
    return TestClient(
        create_app(FileSource(HERE), insights=Insights(EventLog(tmp_path)))
    )


def test_the_try_under_a_route_done_is_recorded_with_both_distances(
    tmp_path: Path,
) -> None:
    api = client(tmp_path)
    assert api.post("/signals", json=BETTER).status_code == 204
    (event,) = read_events(tmp_path)
    assert event["kind"] == "hint_taken" and event["shape"] == "horse"
    assert (event["hint"], event["distance_m"], event["to_m"]) == (
        "better_distance",
        10000,
        8000,
    )
    # Counted apart from the «Try» of a failed route.
    assert demand([event])["hints"] == {"better_distance": 1}


def test_the_bodies_of_an_older_app_are_still_recorded(tmp_path: Path) -> None:
    api = client(tmp_path)
    for body in SIGNALS:
        assert api.post("/signals", json=body).status_code == 204
    assert len(list(read_events(tmp_path))) == len(SIGNALS)


@pytest.mark.parametrize(
    "body",
    [
        {**BETTER, "to_m": None},  # a «Try» says the distance tried
        {k: v for k, v in BETTER.items() if k != "to_m"},
        {**BETTER, "hint": "better_shape"},
        {**BETTER, "start": [46.0671, 11.1214]},  # never the start
    ],
)
def test_a_try_outside_the_contract_is_refused(tmp_path: Path, body: Any) -> None:
    assert client(tmp_path).post("/signals", json=body).status_code == 422
    assert list(read_events(tmp_path)) == []
