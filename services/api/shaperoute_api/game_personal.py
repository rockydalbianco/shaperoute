"""The personal challenges and the streak of the shape game, pure (TASK-423
part C, ADR-0351, docs/GIOCO.md §6.6–6.7).

Nobody joins them: every week has three challenges and every month two, the
same for everyone, turning by the number of the week and of the month. Each
has three steps on one bar — bronze, silver, gold. The runs come in as the
game counted them (`Outing`); nothing here reads the database, the network
or a clock, so every rule has deterministic tests
(tests/test_game_personal.py).

Days, hours and weeks are the runner's own: each run carries the minutes its
phone was ahead of UTC (`utc_offset_min`); a run without them is in UTC.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Literal

# An outing: a run, walk, hike or skate the game counted, of at least this.
OUTING_M = 1_000
# Before this hour, «early»; from this one, «evening» (local time).
EARLY_BEFORE_HOUR = 8
EVENING_FROM_HOUR = 19
# The streak has three lines: weeks with at least 1, 2 and 3 outings.
STREAK_RUNS: tuple[int, ...] = (1, 2, 3)

Period = Literal["week", "month"]
# What a challenge's number is: metres, a count, days, or seconds a km
# (lower is better).
Unit = Literal["m", "count", "days", "pace_s"]


@dataclass(frozen=True)
class Outing:
    """A run of the account that the game counted (any length): when it
    started, in UTC, with its phone's offset; its counted metres; whether it
    was a run (only runs have best times)."""

    started_at: datetime
    utc_offset_min: int | None
    counted_m: int
    running: bool
    best_s: Mapping[int, float] = field(default_factory=dict)

    @property
    def local(self) -> datetime:
        """The start on the runner's clock, without a zone."""
        utc = self.started_at.astimezone(UTC).replace(tzinfo=None)
        return utc + timedelta(minutes=self.utc_offset_min or 0)

    @property
    def is_outing(self) -> bool:
        return self.counted_m >= OUTING_M


Measure = Callable[[Sequence[Outing]], float | None]


@dataclass(frozen=True)
class Challenge:
    id: str
    period: Period
    unit: Unit
    # Bronze, silver, gold: for a pace, seconds a km to beat; else to reach.
    tiers: tuple[float, float, float]
    measure: Measure

    def tier(self, value: float | None) -> int:
        """0 to 3: the steps `value` reached."""
        if value is None:
            return 0
        if self.unit == "pace_s":
            return sum(1 for t in self.tiers if value <= t)
        return sum(1 for t in self.tiers if value >= t)


# --- What the challenges measure ---


def _outings(runs: Sequence[Outing]) -> list[Outing]:
    return [r for r in runs if r.is_outing]


def _metres(runs: Sequence[Outing]) -> float:
    return float(sum(r.counted_m for r in runs))


def _days(runs: Sequence[Outing]) -> float:
    return float(len({r.local.date() for r in _outings(runs)}))


def _at_least(metres: int, running: bool = False) -> Measure:
    def count(runs: Sequence[Outing]) -> float:
        return float(
            sum(
                1
                for r in runs
                if r.counted_m >= max(metres, OUTING_M) and (r.running or not running)
            )
        )

    return count


def _early(runs: Sequence[Outing]) -> float:
    return float(sum(1 for r in _outings(runs) if r.local.hour < EARLY_BEFORE_HOUR))


def _evening(runs: Sequence[Outing]) -> float:
    return float(sum(1 for r in _outings(runs) if r.local.hour >= EVENING_FROM_HOUR))


def _weekend_metres(runs: Sequence[Outing]) -> float:
    return float(sum(r.counted_m for r in runs if r.local.weekday() >= 5))


def _longest(runs: Sequence[Outing]) -> float | None:
    return float(max((r.counted_m for r in runs), default=0)) or None


def _pace(distance_m: int) -> Measure:
    """The best pace over `distance_m` of a run, in seconds a km."""

    def best(runs: Sequence[Outing]) -> float | None:
        times = [r.best_s[distance_m] for r in runs if distance_m in r.best_s]
        return round(min(times) * 1000 / distance_m, 1) if times else None

    return best


# --- The challenges, and which ones a week and a month have ---

_ALL: tuple[Challenge, ...] = (
    # Weeks, first place: volume.
    Challenge("week_km", "week", "m", (10_000, 20_000, 40_000), _metres),
    Challenge("week_days", "week", "days", (2, 4, 6), _days),
    Challenge("week_long_outings", "week", "count", (2, 3, 5), _at_least(3_000)),
    # Second place: habit.
    Challenge("early", "week", "count", (1, 2, 3), _early),
    Challenge("weekend_km", "week", "m", (5_000, 10_000, 20_000), _weekend_metres),
    Challenge("evening", "week", "count", (1, 2, 3), _evening),
    # Third place: running.
    Challenge("pace_5k", "week", "pace_s", (420, 360, 300), _pace(5_000)),
    Challenge("long_run", "week", "m", (8_000, 12_000, 18_000), _longest),
    Challenge("fast_1k", "week", "pace_s", (360, 300, 255), _pace(1_000)),
    Challenge("pace_10k", "week", "pace_s", (450, 390, 330), _pace(10_000)),
    Challenge("double_5k", "week", "count", (2, 3, 4), _at_least(5_000, True)),
    # Months: odd ones, then even ones.
    Challenge("month_km", "month", "m", (50_000, 100_000, 200_000), _metres),
    Challenge("month_long", "month", "count", (1, 3, 6), _at_least(10_000)),
    Challenge("month_days", "month", "days", (8, 12, 16), _days),
    Challenge("month_early", "month", "count", (3, 6, 10), _early),
)
CHALLENGES: dict[str, Challenge] = {c.id: c for c in _ALL}

WEEK_SLOTS: tuple[tuple[str, ...], ...] = (
    ("week_km", "week_days", "week_long_outings"),
    ("early", "weekend_km", "evening"),
    ("pace_5k", "long_run", "fast_1k", "pace_10k", "double_5k"),
)
# January is odd.
ODD_MONTH: tuple[str, ...] = ("month_km", "month_long")
EVEN_MONTH: tuple[str, ...] = ("month_days", "month_early")


def week_of(day: date) -> date:
    """The Monday of `day`'s week."""
    return day - timedelta(days=day.weekday())


def month_of(day: date) -> date:
    return day.replace(day=1)


def week_end(monday: date) -> date:
    """The day after the week: its next Monday."""
    return monday + timedelta(days=7)


def month_end(first: date) -> date:
    """The first day of the next month."""
    return (first + timedelta(days=32)).replace(day=1)


def week_number(monday: date) -> int:
    """Weeks since the first Monday of the calendar (1 January of year 1)."""
    return (monday.toordinal() - 1) // 7


def week_challenges(monday: date) -> list[Challenge]:
    """The three challenges of the week of `monday`, one a place, each
    place turning on its own list: the same for everyone, every 15 weeks
    the same three again."""
    n = week_number(monday)
    return [CHALLENGES[slot[n % len(slot)]] for slot in WEEK_SLOTS]


def month_challenges(first: date) -> list[Challenge]:
    ids = ODD_MONTH if first.month % 2 == 1 else EVEN_MONTH
    return [CHALLENGES[i] for i in ids]


def in_week(runs: Iterable[Outing], monday: date) -> list[Outing]:
    return [r for r in runs if week_of(r.local.date()) == monday]


def in_month(runs: Iterable[Outing], first: date) -> list[Outing]:
    return [r for r in runs if month_of(r.local.date()) == first]


@dataclass(frozen=True)
class Standing:
    """A challenge of a period, for an account: its number and its step."""

    challenge: Challenge
    value: float | None
    tier: int


def standings(
    challenges: Sequence[Challenge], runs: Sequence[Outing]
) -> list[Standing]:
    """Each challenge measured on the runs of its period."""
    result: list[Standing] = []
    for challenge in challenges:
        value = challenge.measure(runs)
        result.append(Standing(challenge, value, challenge.tier(value)))
    return result


# --- The streak ---


@dataclass(frozen=True)
class Streak:
    runs: int
    current: int
    best: int


def week_counts(runs: Iterable[Outing]) -> Counter[date]:
    """The outings of each local week, by its Monday."""
    return Counter(week_of(r.local.date()) for r in runs if r.is_outing)


def streak(counts: Mapping[date, int], this_week: date, runs: int) -> Streak:
    """The weeks in a row with at least `runs` outings: the finished ones up
    to the last, and this one if it already has them (a week under way does
    not break it until it ends); and the longest ever."""
    week = this_week if counts.get(this_week, 0) >= runs else this_week - timedelta(7)
    current = 0
    while counts.get(week, 0) >= runs:
        current += 1
        week -= timedelta(days=7)
    best, length, previous = 0, 0, None
    for monday in sorted(m for m, n in counts.items() if n >= runs):
        length = length + 1 if previous == monday - timedelta(days=7) else 1
        best = max(best, length)
        previous = monday
    return Streak(runs, current, max(best, current))


def streaks(runs: Iterable[Outing], this_week: date) -> list[Streak]:
    counts = week_counts(runs)
    return [streak(counts, this_week, n) for n in STREAK_RUNS]
