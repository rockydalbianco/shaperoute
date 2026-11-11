"""Many more words for the "Explore" catalogue, and the drawings already
made that never entered it (TASK-441, parts A1 and A2).

Usage (from the repository root; `--run` wants the route engine's
environment, everything else the standard library alone):

    python tools/catalog_words.py --plan
    services/api/.venv/bin/python tools/catalog_words.py --run
    python tools/catalog_words.py --propose > out/TASK-441/kept-proposal.json
    python tools/catalog_words.py --write

`tools/catalog_seed.py` (TASK-419) is used as it is: its cities and squares,
its run loop (`run_cities`), its filter and its score. This module only says
which short words are written in which city, never downloads a zone (the
foot zones of `data/cache` are enough), keeps its own run log, and proposes
the keys to add to `tools/catalog_kept.json`:

- **A1**: every drawing of TASK-419's log that passes the filter and is
  not kept yet, of a shape the engine has (`registered_shapes`);
- **A2**: for every city and new word, the better of its two styles, when
  it passes the filter.

Words are short on purpose: on one line the filter passes 2-4 letters nine
times in ten and 5 letters one in five (TASK-311, TASK-419's log); longer
ones want the pen up, which the catalogue cannot hold yet (part B).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections.abc import Iterable, Sequence
from pathlib import Path

import catalog_seed as cs

REPO_ROOT = cs.REPO_ROOT
DEFAULT_LOG = REPO_ROOT / "out" / "TASK-441" / "runs.jsonl"
OLD_LOG = cs.DEFAULT_LOG
SHAPES_PY = (
    REPO_ROOT / "services" / "route-engine" / "route_engine" / "shapes" / "__init__.py"
)

# On one line a word reads up to here (see the module's note).
MAX_LETTERS = 4

# --- The words -----------------------------------------------------------------

# Written anywhere: every city gets `POOL_PER_CITY` of these, in turn, so a
# word shows up in about ten cities and no city has them all.
EVERYWHERE: tuple[str, ...] = (
    "RUN",
    "GO",
    "MUW",
    "WOW",
    "LOVE",
    "YES",
    "HI",
    "OK",
    "FUN",
    "JOY",
    "ZEN",
    "FREE",
    "FAST",
    "GOAL",
    "STAR",
    "COOL",
    "YOLO",
    "HOME",
    "KISS",
    "XOXO",
    "MOM",
    "DAD",
    "BFF",
)
# What people write these months: the season, and words of the moment.
SEASON: tuple[str, ...] = ("XMAS", "NOEL", "SNOW", "SKI")
TRENDS: tuple[str, ...] = (
    "GOAT",
    "SLAY",
    "VIBE",
    "MOOD",
    "AURA",
    "BRO",
    "GG",
    "LOL",
    "OMG",
)
POOL: tuple[str, ...] = EVERYWHERE + SEASON + TRENDS
POOL_PER_CITY = 6

# In the language spoken in the city, all of them.
LOCAL: dict[str, tuple[str, ...]] = {
    "it": ("CIAO", "VAI", "DAI", "BACI", "PACE", "AMO", "TVB", "SI"),
    "en": ("HEY", "HI", "RUN", "LOVE"),
    "es": ("HOLA", "OLE", "AMOR", "VIDA"),
    "pt": ("OLA", "AMOR", "VIDA"),
    "fr": ("OUI", "VIVE", "BISE"),
    "de": ("JA", "LOS", "HEY"),
    "nl": ("HOI", "JA"),
    "scan": ("HEJ", "SKOL"),
    "int": ("LOVE", "HEY"),
}
# The cities that do not speak Italian; every other city of catalog_seed
# does. "int": a language whose greeting the user has not approved.
LANGUAGE: dict[str, str] = {
    "newyork": "en",
    "london": "en",
    "sydney": "en",
    "sanfrancisco": "en",
    "dublin": "en",
    "edinburgh": "en",
    "tokyo": "int",
    "dubai": "int",
    "prague": "int",
    "budapest": "int",
    "athens": "int",
    "krakow": "int",
    "ljubljana": "int",
    "zagreb": "int",
    "barcelona": "es",
    "madrid": "es",
    "seville": "es",
    "valencia": "es",
    "lisbon": "pt",
    "porto": "pt",
    "paris": "fr",
    "nice": "fr",
    "lyon": "fr",
    "brussels": "fr",
    "berlin": "de",
    "vienna": "de",
    "munich": "de",
    "zurich": "de",
    "hamburg": "de",
    "amsterdam": "nl",
    "copenhagen": "scan",
    "stockholm": "scan",
}
# A word of one city alone: its short name, or how it greets.
OWN: dict[str, tuple[str, ...]] = {
    "roma": ("ROMA", "DAJE", "AO"),
    "pisa": ("PISA",),
    "bari": ("BARI", "UE"),
    "napoli": ("UE",),
    "milano": ("UELA",),
    "firenze": ("BONA",),
    "vienna": ("WIEN",),
    "nice": ("NICE",),
    "lyon": ("LYON",),
    "hamburg": ("MOIN",),
    "newyork": ("NYC",),
    "sanfrancisco": ("SF",),
}


def language_of(city: str) -> str:
    return LANGUAGE.get(city, "it")


def words_of(city: str, index: int) -> tuple[str, ...]:
    """What is written in `city`, the `index`-th of the catalogue: its own
    words, those of its language, then its turn of the pool. No word twice,
    none longer than MAX_LETTERS."""
    start = index * POOL_PER_CITY
    turn = tuple(POOL[(start + k) % len(POOL)] for k in range(POOL_PER_CITY))
    words = OWN.get(city, ()) + LOCAL[language_of(city)] + turn
    return tuple(dict.fromkeys(w for w in words if len(w) <= MAX_LETTERS))


def word_keys(city: cs.City, word: str) -> list[str]:
    d = cs.word_distance(word)
    return [cs.Case(city.name, word, d, s).key for s in cs.STYLES]


def cities(done: Iterable[str] = (), names: Sequence[str] = ()) -> list[cs.City]:
    """The cities of catalog_seed with the words of this module and no
    shape; a word whose two styles are both in `done` (drawn for TASK-419)
    is left out. `names` narrows them."""
    done = set(done)
    out = []
    for i, c in enumerate(cs.CITIES):
        if names and c.name not in names:
            continue
        words = tuple(
            w
            for w in words_of(c.name, i)
            if not all(k in done for k in word_keys(c, w))
        )
        out.append(cs.City(c.name, c.square, c.group, words, (), c.distances))
    return out


def plan(done: Iterable[str] = (), names: Sequence[str] = ()) -> list[cs.Case]:
    return cs.plan(cities(done, names))


# --- What to add ---------------------------------------------------------------


def registered_shapes(source: str | None = None) -> frozenset[str]:
    """The names in the engine's SHAPES, read from its source: this module
    must run without the engine."""
    text = SHAPES_PY.read_text(encoding="utf-8") if source is None else source
    body = text.split("SHAPES:", 1)[1].split("\n}\n", 1)[0]
    return frozenset(re.findall(r'^\s+"([a-z_]+)":', body, flags=re.M))


def spare(
    runs: Iterable[cs.Run], kept: Iterable[str], shapes: Iterable[str]
) -> list[str]:
    """A1: the keys of the runs passing the filter and not kept, of a word
    or of a shape among `shapes`, the best first."""
    kept, shapes = set(kept), set(shapes)
    good = [
        r
        for r in cs.passing(runs)
        if r["key"] not in kept and ("word" in r or r["shape"] in shapes)
    ]
    good.sort(key=lambda r: (-cs.score(r), r["key"]))
    return [r["key"] for r in good]


def best_words(runs: Iterable[cs.Run], kept: Iterable[str] = ()) -> list[str]:
    """A2: for every city and word, the key of the better style among those
    passing the filter; none for a word that city already has kept."""
    have = {tuple(k.split("/")[:2]) for k in kept}
    have = {(city, what.split(":")[0]) for city, what in have}
    best: dict[tuple[str, str], cs.Run] = {}
    for r in cs.passing(runs):
        if "word" not in r:
            continue
        at = (r["city"], r["word"])
        if at in have:
            continue
        old = best.get(at)
        if old is None or (-cs.score(r), r["key"]) < (-cs.score(old), old["key"]):
            best[at] = r
    return [best[at]["key"] for at in sorted(best)]


def propose(
    old_runs: Sequence[cs.Run],
    word_runs: Sequence[cs.Run],
    kept: Sequence[str],
    shapes: Iterable[str],
) -> list[str]:
    """The kept keys, then A1, then A2, none twice."""
    a1 = spare(old_runs, kept, shapes)
    a2 = best_words(word_runs, list(kept) + a1)
    return list(dict.fromkeys([*kept, *a1, *a2]))


# --- Command line ---------------------------------------------------------------


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python tools/catalog_words.py",
        description="More words for the Explore catalogue (TASK-441).",
    )
    p.add_argument("--plan", action="store_true", help="print the cases and stop")
    p.add_argument(
        "--run",
        action="store_true",
        help="plan the cases not yet in the log (the engine; no download)",
    )
    p.add_argument(
        "--propose",
        action="store_true",
        help="print the keys to keep: the kept ones, A1 and A2",
    )
    p.add_argument(
        "--write",
        action="store_true",
        help="rebuild catalog/seed from --kept and the two logs",
    )
    p.add_argument(
        "--cities", type=lambda v: v.split(","), default=[], help="comma-separated"
    )
    p.add_argument("--log", type=Path, default=DEFAULT_LOG)
    p.add_argument("--old-log", type=Path, default=OLD_LOG)
    p.add_argument("--kept", type=Path, default=cs.DEFAULT_KEPT)
    p.add_argument("--out", type=Path, default=cs.DEFAULT_SEED)
    p.add_argument("--cache-dir", type=Path, default=cs.DEFAULT_CACHE)
    return p


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    unknown = [n for n in args.cities if n not in cs.BY_NAME]
    if unknown:
        print(f"unknown city: {', '.join(unknown)}", file=sys.stderr)
        return 2
    old_runs = cs.read_runs(args.old_log)
    todo = cities(cs.done_keys(old_runs), args.cities)
    if args.plan:
        cases = cs.plan(todo)
        for c in cases:
            print(c.key)
        print(f"{len(cases)} cases in {len(todo)} cities", file=sys.stderr)
        return 0
    if args.run:
        planned = cs.run_cities(
            todo, args.log, args.cache_dir, max_downloads=0, slot_wait_max_s=0
        )
        print(f"{planned} cases planned")
    word_runs = cs.read_runs(args.log)
    if args.propose:
        keys = propose(
            old_runs, word_runs, cs.read_kept(args.kept), registered_shapes()
        )
        print(json.dumps({"kept": keys}, indent=1))
        return 0
    if args.write:
        kept = cs.read_kept(args.kept)
        both = cs.read_logs([args.old_log, args.log])
        cs.write_files(cs.city_files(both, kept), args.out)
        print(cs.summary(both, kept), file=sys.stderr)
        return 0
    print(cs.summary(word_runs), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
