"""The prizes of the shape game, as pure rules (TASK-423 part E, ADR-0351,
docs/GIOCO.md §5.4): only inside the app, never money.

- **Editions**: a pace or milestone shape (70 of the 94) is bronze once
  unlocked (its 'solo' row), **silver** once its goal is met in 3 different
  runs, **gold** in 10. The shapes of the total kilometres have none: the
  next step is the next shape.
- **Frames**: one per collection, once all its shapes are unlocked.
- **Titles** (8) and **badges** (8): from what the game already keeps (the
  counted metres, the best times, the streak, the medals of the personal
  challenges, the gold editions, the teams' challenges completed).

Nothing here reads the database: game_prizes_api.py gathers the `Facts` of
an account and asks these rules what they are worth.
"""

from __future__ import annotations

from collections.abc import Callable, Collection, Iterable, Mapping
from dataclasses import dataclass
from typing import Literal

from shaperoute_api.game_catalog import CATALOG, COLLECTIONS, GameShape
from shaperoute_api.game_rules import PaceGoal

Edition = Literal["silver", "gold"]

# The runs that meet a shape's goal for each edition, in order.
EDITION_RUNS: tuple[tuple[Edition, int], ...] = (("silver", 3), ("gold", 10))

# The most badges a profile shows.
MAX_SHOWN_BADGES = 3


def has_editions(shape: GameShape) -> bool:
    """A pace or milestone shape: one run meets its goal, or not."""
    return isinstance(shape.goal, PaceGoal)


EDITION_SHAPES: tuple[GameShape, ...] = tuple(s for s in CATALOG if has_editions(s))


def meets(goal: PaceGoal, run_best_s: Mapping[int, float]) -> bool:
    """Whether one run, by its best times, meets a pace goal."""
    best = run_best_s.get(goal.distance_m)
    return best is not None and best <= goal.target_s


def editions_of(runs: int) -> list[Edition]:
    """The editions `runs` runs meeting the goal give, lowest first."""
    return [edition for edition, needed in EDITION_RUNS if runs >= needed]


def edition_runs(
    runs: Iterable[Mapping[int, float]],
) -> dict[str, int]:
    """For each shape with editions, how many of `runs` (each its best
    times) meet its goal."""
    kept = list(runs)
    return {
        shape.id: sum(1 for best in kept if meets(pace_goal(shape), best))
        for shape in EDITION_SHAPES
    }


def pace_goal(shape: GameShape) -> PaceGoal:
    """The goal of a shape with editions."""
    assert isinstance(shape.goal, PaceGoal)
    return shape.goal


# --- Frames ---


def complete_collections(unlocked: Collection[str]) -> list[str]:
    """The collections whose shapes are all among `unlocked`, in order: each
    gives its frame."""
    return [
        c.id
        for c in COLLECTIONS
        if all(s.id in unlocked for s in CATALOG if s.collection == c.id)
    ]


# --- Titles and badges ---


@dataclass(frozen=True)
class Facts:
    """What an account did, as the prizes read it."""

    counted_m: int
    best_s: Mapping[int, float]
    # The longest streak of weeks with at least one outing.
    longest_streak: int
    # The collections completed.
    collections_done: int
    # The steps reached in the personal challenges, one per challenge and
    # period (game_personal).
    medals: int
    gold_editions: int
    # The teams' challenges completed that the account ran a piece of.
    team_challenges: int


@dataclass(frozen=True)
class Prize:
    """A title or a badge: what it counts, and how much it asks."""

    id: str
    value: Callable[[Facts], float]
    target: float


@dataclass(frozen=True)
class PrizeState:
    id: str
    got: bool
    # How far along: `value` of `target`, in the prize's own unit (metres,
    # weeks, medals…); 1 of 1 for a prize that is reached at once.
    value: float
    target: float


def _ran(distance_m: int) -> Callable[[Facts], float]:
    return lambda f: 1.0 if distance_m in f.best_s else 0.0


TITLES: tuple[Prize, ...] = (
    Prize("runner", lambda f: f.counted_m, 100_000),
    Prize("explorer", lambda f: f.counted_m, 1_000_000),
    Prize("traveller", lambda f: f.counted_m, 3_000_000),
    Prize("globetrotter", lambda f: f.counted_m, 10_000_000),
    Prize("marathoner", _ran(42_195), 1),
    Prize("ultra", _ran(50_000), 1),
    Prize("steady", lambda f: f.longest_streak, 26),
    Prize("collector", lambda f: f.collections_done, len(COLLECTIONS)),
)

BADGES: tuple[Prize, ...] = (
    Prize("streak_4", lambda f: f.longest_streak, 4),
    Prize("streak_12", lambda f: f.longest_streak, 12),
    Prize("streak_52", lambda f: f.longest_streak, 52),
    Prize("medals_10", lambda f: f.medals, 10),
    Prize("medals_50", lambda f: f.medals, 50),
    Prize("gold_10", lambda f: f.gold_editions, 10),
    Prize("team_1", lambda f: f.team_challenges, 1),
    Prize("team_10", lambda f: f.team_challenges, 10),
)

TITLE_IDS: frozenset[str] = frozenset(p.id for p in TITLES)
BADGE_IDS: frozenset[str] = frozenset(p.id for p in BADGES)


def states(prizes: Iterable[Prize], facts: Facts) -> list[PrizeState]:
    """Each prize, reached or not, with how far along the account is."""
    out = []
    for prize in prizes:
        value = float(prize.value(facts))
        out.append(
            PrizeState(
                prize.id, value >= prize.target, min(value, prize.target), prize.target
            )
        )
    return out


def got(prizes: Iterable[Prize], facts: Facts) -> set[str]:
    return {s.id for s in states(prizes, facts) if s.got}
