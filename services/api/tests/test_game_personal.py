"""The personal challenges and the streak, pure (TASK-423 part C, ADR-0351,
docs/GIOCO.md §6.6–6.7): runs written by hand, each with its UTC start and
its phone's offset, so every day, hour and week is known before the rules
read it."""

from __future__ import annotations

from collections import Counter
from datetime import UTC, date, datetime, timedelta

import pytest

from shaperoute_api.game_personal import (
    CHALLENGES,
    EVEN_MONTH,
    ODD_MONTH,
    WEEK_SLOTS,
    Outing,
    in_month,
    in_week,
    month_challenges,
    month_end,
    standings,
    streak,
    streaks,
    week_challenges,
    week_counts,
    week_end,
    week_of,
)

MONDAY = date(2026, 11, 9)


def at(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=UTC)


def run(
    start: datetime,
    metres: int = 5_000,
    offset: int | None = None,
    running: bool = True,
    best: dict[int, float] | None = None,
) -> Outing:
    return Outing(start, offset, metres, running, best or {})


def value(challenge_id: str, runs: list[Outing]) -> float | None:
    return CHALLENGES[challenge_id].measure(runs)


def tier(challenge_id: str, runs: list[Outing]) -> int:
    return CHALLENGES[challenge_id].tier(value(challenge_id, runs))


# --- The calendar ---


def test_a_week_runs_from_monday_and_a_month_from_its_first() -> None:
    assert week_of(date(2026, 11, 15)) == MONDAY  # a Sunday
    assert week_of(MONDAY) == MONDAY
    assert week_end(MONDAY) == date(2026, 11, 16)
    assert month_end(date(2026, 12, 1)) == date(2027, 1, 1)
    assert month_end(date(2027, 2, 1)) == date(2027, 3, 1)


def test_each_week_has_one_challenge_from_each_place_turning() -> None:
    weeks = [MONDAY + timedelta(weeks=k) for k in range(15)]
    seen = [[c.id for c in week_challenges(w)] for w in weeks]
    for place, slot in enumerate(WEEK_SLOTS):
        ids = [three[place] for three in seen]
        # Every challenge of the place, as often as the others.
        assert Counter(ids) == {i: 15 // len(slot) for i in slot}
        # Never the same two weeks running.
        assert all(a != b for a, b in zip(ids, ids[1:], strict=False))
    # After 15 weeks, the same three again.
    assert [c.id for c in week_challenges(MONDAY + timedelta(weeks=15))] == seen[0]
    # The weeks of the proposal's first month, as the app will show them.
    assert seen[0] == ["week_long_outings", "evening", "double_5k"]


def test_odd_and_even_months_take_turns() -> None:
    assert [c.id for c in month_challenges(date(2026, 11, 1))] == list(ODD_MONTH)
    assert [c.id for c in month_challenges(date(2026, 12, 1))] == list(EVEN_MONTH)
    assert all(CHALLENGES[i].period == "month" for i in ODD_MONTH + EVEN_MONTH)
    assert all(CHALLENGES[i].period == "week" for s in WEEK_SLOTS for i in s)


# --- The runner's clock ---


def test_the_offset_moves_the_hour_and_the_day() -> None:
    # 06:30 UTC: 08:30 in Rome in summer, 05:30 in the Azores.
    rome = run(at(MONDAY, 6, 30), offset=120)
    azores = run(at(MONDAY, 6, 30), offset=-60)
    assert value("early", [rome]) == 0 and value("early", [azores]) == 1
    # Sunday 23:30 UTC is Monday morning in Rome: the next week.
    late = run(at(MONDAY - timedelta(days=1), 23, 30), offset=60)
    assert in_week([late], MONDAY) == [late]
    assert in_week([late], MONDAY - timedelta(weeks=1)) == []


def test_without_an_offset_the_clock_is_utc() -> None:
    early = run(at(MONDAY, 7, 59))
    assert value("early", [early]) == 1
    assert value("evening", [run(at(MONDAY, 19, 0))]) == 1
    assert value("evening", [run(at(MONDAY, 18, 59))]) == 0


def test_a_month_holds_the_runs_of_its_local_days() -> None:
    # 31 October 23:30 UTC, an hour ahead: 1 November.
    first = run(at(date(2026, 10, 31), 23, 30), offset=60)
    assert in_month([first], date(2026, 11, 1)) == [first]
    assert in_month([first], date(2026, 10, 1)) == []


# --- What each challenge measures ---


def test_the_km_of_the_week_have_three_steps() -> None:
    assert tier("week_km", [run(at(MONDAY, 9), 9_999)]) == 0
    assert tier("week_km", [run(at(MONDAY, 9), 6_000), run(at(MONDAY, 18), 4_000)]) == 1
    assert tier("week_km", [run(at(MONDAY, 9), 20_000)]) == 2
    assert tier("week_km", [run(at(MONDAY, 9), 40_000)]) == 3


def test_an_outing_is_at_least_one_km() -> None:
    short = run(at(MONDAY, 9), 999)
    # Its metres count; as a day out, as a morning, it does not.
    assert value("week_km", [short]) == 999
    assert value("week_days", [short]) == 0
    assert value("early", [run(at(MONDAY, 6), 999)]) == 0


def test_days_count_once_each() -> None:
    runs = [run(at(MONDAY, 7)), run(at(MONDAY, 19)), run(at(MONDAY + timedelta(1), 7))]
    assert value("week_days", runs) == 2


def test_the_weekend_counts_saturday_and_sunday() -> None:
    saturday, sunday = MONDAY + timedelta(5), MONDAY + timedelta(6)
    runs = [run(at(MONDAY + timedelta(4), 9), 8_000), run(at(saturday, 9), 6_000)]
    runs.append(run(at(sunday, 9), 4_000))
    assert value("weekend_km", runs) == 10_000
    assert tier("weekend_km", runs) == 2


def test_the_long_outings_and_the_long_run() -> None:
    runs = [run(at(MONDAY, 9), 2_999), run(at(MONDAY, 10), 3_000)]
    runs.append(run(at(MONDAY, 11), 12_500, running=False))
    assert value("week_long_outings", runs) == 2
    # A walk is an outing: the longest one, whatever it was.
    assert value("long_run", runs) == 12_500 and tier("long_run", runs) == 2
    assert value("long_run", []) is None


def test_a_pace_challenge_reads_the_best_times_and_lower_is_better() -> None:
    # 5 km in 25:00 (5:00 a km), and in 32:00 (6:24).
    fast = run(at(MONDAY, 9), best={5_000: 1_500.0, 1_000: 290.0})
    slow = run(at(MONDAY, 18), best={5_000: 1_920.0})
    assert value("pace_5k", [fast, slow]) == 300.0
    assert tier("pace_5k", [fast, slow]) == 3
    assert tier("pace_5k", [slow]) == 1
    # 4:50 a km over 1 km: silver, not gold (4:15).
    assert tier("fast_1k", [fast]) == 2
    # A walk has no best times: no pace at all.
    assert value("pace_5k", [run(at(MONDAY, 9), running=False)]) is None
    assert tier("pace_10k", [slow]) == 0


def test_the_double_counts_runs_of_five_km_only() -> None:
    runs = [run(at(MONDAY, 9), 5_000), run(at(MONDAY + timedelta(1), 9), 6_000)]
    runs.append(run(at(MONDAY + timedelta(2), 9), 8_000, running=False))
    runs.append(run(at(MONDAY + timedelta(3), 9), 4_999))
    assert value("double_5k", runs) == 2 and tier("double_5k", runs) == 1


def test_the_months_challenges() -> None:
    first = date(2026, 11, 1)
    runs = [run(at(first + timedelta(d), 6), 10_000) for d in range(0, 12)]
    assert value("month_km", runs) == 120_000 and tier("month_km", runs) == 2
    assert value("month_long", runs) == 12 and tier("month_long", runs) == 3
    assert value("month_days", runs) == 12 and tier("month_days", runs) == 2
    assert value("month_early", runs) == 12 and tier("month_early", runs) == 3


def test_standings_measure_each_challenge_of_the_period() -> None:
    runs = [run(at(MONDAY, 20), 3_500), run(at(MONDAY + timedelta(2), 20), 3_000)]
    found = standings(week_challenges(MONDAY), runs)
    assert [(s.challenge.id, s.value, s.tier) for s in found] == [
        ("week_long_outings", 2.0, 1),
        ("evening", 2.0, 2),
        ("double_5k", 0.0, 0),
    ]


# --- The streak ---


def counts(*weeks: tuple[int, int]) -> Counter[date]:
    """Outings by week, the weeks counted back from MONDAY: (0, 2) is two
    outings this week, (1, 3) three the week before."""
    return Counter({MONDAY - timedelta(weeks=back): n for back, n in weeks})


def test_a_week_under_way_does_not_break_the_streak() -> None:
    # Three weeks done, nothing yet this week: still 3.
    weeks = counts((1, 1), (2, 1), (3, 1))
    assert streak(weeks, MONDAY, 1).current == 3
    # This week done too: 4.
    assert streak(counts((0, 1), (1, 1), (2, 1), (3, 1)), MONDAY, 1).current == 4


def test_a_week_missed_ends_the_streak() -> None:
    weeks = counts((0, 1), (2, 1), (3, 1), (4, 1))
    found = streak(weeks, MONDAY, 1)
    assert found.current == 1 and found.best == 3
    # Last week missed, this one not done yet: none now.
    assert streak(counts((2, 1), (3, 1)), MONDAY, 1).current == 0


@pytest.mark.parametrize(
    ("runs", "current", "best"),
    [(1, 4, 4), (2, 2, 2), (3, 0, 1)],
)
def test_each_line_asks_its_outings_a_week(runs: int, current: int, best: int) -> None:
    weeks = counts((0, 2), (1, 2), (2, 1), (3, 3))
    found = streak(weeks, MONDAY, runs)
    assert (found.current, found.best) == (current, best)


def test_the_streaks_read_the_local_weeks_of_the_outings() -> None:
    sunday_night = run(at(MONDAY - timedelta(days=1), 23, 30), offset=60)
    before = run(at(MONDAY - timedelta(weeks=1), 9))
    short = run(at(MONDAY - timedelta(weeks=2), 9), 500)
    assert week_counts([sunday_night, before, short]) == {
        MONDAY: 1,
        MONDAY - timedelta(weeks=1): 1,
    }
    assert [
        (s.runs, s.current, s.best) for s in streaks([sunday_night, before], MONDAY)
    ] == [
        (1, 2, 2),
        (2, 0, 0),
        (3, 0, 0),
    ]
