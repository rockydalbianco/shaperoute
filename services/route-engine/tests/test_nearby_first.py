"""The start's own plan told as soon as it is there (TASK-435, ADR-0361):
`plan_nearby(on_first=...)`.

On the synthetic grid and with the fake job of test_nearby_starts: no plan
is searched, and with `processes` False the nearby starts are planned in
this process, after the start, so the order of things is the test's.
"""

from dataclasses import dataclass, field
from typing import Any

import pytest
from test_nearby_starts import ORIGIN, GridSource, LoopJob, _grid, _latlon

from route_engine import nearby_starts as nearby_module
from route_engine.geo import LatLon
from route_engine.nearby_starts import plan_nearby
from route_engine.optimizer import Plan, ShapeNotDrawableError


@dataclass(frozen=True)
class Told(LoopJob):
    """A LoopJob that writes down what happens, in order: "plan" for the
    start's own plan, "here" for each nearby one."""

    events: list[str] = field(default_factory=list, compare=False)

    def plan(self, start: LatLon, source: Any) -> Plan:
        self.events.append("plan")
        return LoopJob.plan(self, start, source)

    def here(self, start: LatLon, source: Any) -> Plan:
        self.events.append("here")
        return LoopJob.plan(self, start, source)


def test_the_start_plan_is_told_once_before_the_nearby_starts_are_planned() -> None:
    job = Told()
    firsts: list[Plan] = []

    def on_first(plan: Plan) -> None:
        job.events.append("first")
        firsts.append(plan)

    found = plan_nearby(
        job, ORIGIN, GridSource(), count=4, processes=False, on_first=on_first
    )
    assert len(firsts) == 1
    assert job.events[:2] == ["plan", "first"]
    assert job.events.count("here") == len(found.tried) - 1 > 0
    # The start's own plan, as it is among the starts tried.
    assert firsts[0] is found.tried[0].plan
    assert firsts[0].result.points[0] == _latlon(_grid(), (0, 0))
    assert firsts[0].alternatives == []


def test_the_first_plan_is_told_also_when_a_nearby_start_wins() -> None:
    job = LoopJob(similarity=(((2, 0), 0.95),))
    firsts: list[Plan] = []
    found = plan_nearby(
        job, ORIGIN, GridSource(), count=4, processes=False, on_first=firsts.append
    )
    assert found.chosen != 0
    assert [plan.result.similarity for plan in firsts] == [0.80]
    assert found.plan.result.similarity == 0.95


@pytest.mark.parametrize(
    "job",
    [
        LoopJob(),
        LoopJob(similarity=(((2, 0), 0.95),)),
        LoopJob(similarity=(((2, 0), 0.81),)),
        LoopJob(converged=True),
    ],
)
def test_telling_the_first_plan_changes_nothing_of_the_answer(job: LoopJob) -> None:
    plain = plan_nearby(job, ORIGIN, GridSource(), count=4, processes=False)
    told = plan_nearby(
        job, ORIGIN, GridSource(), count=4, processes=False, on_first=lambda plan: None
    )
    assert told.chosen == plain.chosen
    assert told.plan.result == plain.plan.result
    assert [p.result for p in told.plan.alternatives] == [
        p.result for p in plain.plan.alternatives
    ]
    assert [t.score for t in told.tried] == [t.score for t in plain.tried]


def test_nothing_is_told_without_nearby_starts() -> None:
    firsts: list[Plan] = []
    found = plan_nearby(
        LoopJob(), ORIGIN, GridSource(), count=0, on_first=firsts.append
    )
    assert len(found.tried) == 1 and firsts == []


def test_nothing_is_told_when_no_worker_fits_in_memory() -> None:
    firsts: list[Plan] = []
    found = plan_nearby(
        LoopJob(),
        ORIGIN,
        GridSource(),
        count=2,
        free_mb=lambda: 0.0,
        on_first=firsts.append,
    )
    assert len(found.tried) == 1 and firsts == []


def test_nothing_is_told_on_a_graph_too_big_for_nearby_starts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(nearby_module, "NEARBY_MAX_NODES", 10)
    firsts: list[Plan] = []
    plan_nearby(
        LoopJob(), ORIGIN, GridSource(), processes=False, on_first=firsts.append
    )
    assert firsts == []


def test_nothing_is_told_when_the_start_has_no_route() -> None:
    firsts: list[Plan] = []
    found = plan_nearby(
        LoopJob(refused=((0, 0),)),
        ORIGIN,
        GridSource(),
        processes=False,
        on_first=firsts.append,
    )
    assert found.chosen != 0 and firsts == []


def test_nothing_is_told_when_no_start_draws() -> None:
    refused = tuple((i, j) for i in range(-20, 21) for j in range(-20, 21))
    firsts: list[Plan] = []
    with pytest.raises(ShapeNotDrawableError):
        plan_nearby(
            LoopJob(refused=refused),
            ORIGIN,
            GridSource(),
            processes=False,
            on_first=firsts.append,
        )
    assert firsts == []


def test_telling_does_not_move_the_deadline_of_the_nearby_starts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The clock is read for the deadline before the first plan is told:
    however long the telling takes, the nearby starts have until the same
    moment."""
    now = [100.0]
    monkeypatch.setattr(nearby_module.time, "monotonic", lambda: now[0])
    waits: list[float] = []

    class Workers:
        def __init__(self, job: Any, starts: list[LatLon], source: Any) -> None:
            pass

        def outcome(self, i: int, wait_s: float) -> None:
            waits.append(wait_s)
            return None

        def stop(self) -> None:
            pass

    monkeypatch.setattr(nearby_module, "_Workers", Workers)

    def slow(plan: Plan) -> None:
        now[0] += 2.0  # the telling took two seconds

    plan_nearby(
        LoopJob(),
        ORIGIN,
        GridSource(),
        count=2,
        grace_s=8.0,
        budget_s=25.0,
        free_mb=lambda: None,
        on_first=slow,
    )
    # 8 s from the start's plan, less the 2 s of the telling.
    assert waits and waits[0] == pytest.approx(6.0)
