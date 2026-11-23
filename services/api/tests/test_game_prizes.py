"""The pure rules of the game's prizes (TASK-423 part E, ADR-0351,
docs/GIOCO.md §5.4): which shapes have editions, when a run meets a goal,
the editions of a count, the frames, the titles and the badges."""

from __future__ import annotations

from shaperoute_api.game_catalog import CATALOG, COLLECTIONS
from shaperoute_api.game_prizes import (
    BADGES,
    EDITION_SHAPES,
    TITLES,
    Facts,
    complete_collections,
    edition_runs,
    editions_of,
    got,
    has_editions,
    meets,
    pace_goal,
    states,
)
from shaperoute_api.game_rules import DistanceGoal, PaceGoal

NOTHING = Facts(
    counted_m=0,
    best_s={},
    longest_streak=0,
    collections_done=0,
    medals=0,
    gold_editions=0,
    team_challenges=0,
)


def test_the_pace_and_milestone_shapes_have_editions_the_km_ones_none() -> None:
    assert len(EDITION_SHAPES) == 70
    assert sum(1 for s in CATALOG if isinstance(s.goal, DistanceGoal)) == 24
    assert all(isinstance(s.goal, PaceGoal) for s in EDITION_SHAPES)
    by_id = {s.id: s for s in CATALOG}
    assert has_editions(by_id["lightning"]) and has_editions(by_id["balloon"])
    assert not has_editions(by_id["triangle"])


def test_a_run_meets_a_goal_by_its_best_time_over_the_distance() -> None:
    lightning = PaceGoal(1_000, 300)
    assert meets(lightning, {1_000: 299.0})
    assert meets(lightning, {1_000: 300.0})
    assert not meets(lightning, {1_000: 301.0})
    # Never that far in one go: not met.
    assert not meets(lightning, {400: 100.0})
    # A milestone: any run of the distance.
    balloon = PaceGoal(5_000, 1_200, single_run=True)
    assert meets(balloon, {5_000: 3_000.0})


def test_silver_in_3_runs_gold_in_10() -> None:
    assert editions_of(0) == [] and editions_of(2) == []
    assert editions_of(3) == ["silver"]
    assert editions_of(9) == ["silver"]
    assert editions_of(10) == ["silver", "gold"]


def test_the_runs_meeting_each_goal_are_counted() -> None:
    runs = [{1_000: 290.0}, {1_000: 310.0}, {1_000: 295.0, 5_000: 1_600.0}]
    counted = edition_runs(runs)
    assert set(counted) == {s.id for s in EDITION_SHAPES}
    assert counted["lightning"] == 2  # under 5:00 /km twice
    assert counted["penguin"] == 3  # under 7:00 /km every time
    assert counted["balloon"] == 1  # one run of 5 km
    assert pace_goal(next(s for s in CATALOG if s.id == "balloon")).single_run


def test_a_frame_for_each_collection_whose_shapes_are_all_unlocked() -> None:
    assert complete_collections(set()) == []
    sea = {s.id for s in CATALOG if s.collection == "sea"}
    assert complete_collections(sea) == ["sea"]
    assert complete_collections(sea - {next(iter(sea))}) == []
    every = {s.id for s in CATALOG}
    assert complete_collections(every) == [c.id for c in COLLECTIONS]


def test_eight_titles_and_eight_badges_with_how_far_along() -> None:
    assert [p.id for p in TITLES] == [
        "runner",
        "explorer",
        "traveller",
        "globetrotter",
        "marathoner",
        "ultra",
        "steady",
        "collector",
    ]
    assert [p.id for p in BADGES] == [
        "streak_4",
        "streak_12",
        "streak_52",
        "medals_10",
        "medals_50",
        "gold_10",
        "team_1",
        "team_10",
    ]
    assert got(TITLES, NOTHING) == set() and got(BADGES, NOTHING) == set()
    runner = states(TITLES, Facts(**{**NOTHING.__dict__, "counted_m": 42_000}))[0]
    assert (runner.id, runner.got, runner.value, runner.target) == (
        "runner",
        False,
        42_000,
        100_000,
    )


def test_what_each_title_and_badge_asks() -> None:
    facts = Facts(
        counted_m=1_200_000,
        best_s={42_195: 14_400.0},
        longest_streak=13,
        collections_done=10,
        medals=12,
        gold_editions=10,
        team_challenges=1,
    )
    assert got(TITLES, facts) == {"runner", "explorer", "marathoner", "collector"}
    assert got(BADGES, facts) == {
        "streak_4",
        "streak_12",
        "medals_10",
        "gold_10",
        "team_1",
    }
    # A value past the target stops there: the bar is full.
    streak_4 = next(s for s in states(BADGES, facts) if s.id == "streak_4")
    assert (streak_4.value, streak_4.target) == (4, 4)
    ultra = Facts(
        **{**NOTHING.__dict__, "best_s": {50_000: 20_000.0}, "longest_streak": 26}
    )
    assert got(TITLES, ultra) == {"ultra", "steady"}
