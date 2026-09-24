"""Measure a model of Ollama on the phrase list (TASK-030).

Not a test: it needs Ollama running with the model pulled, and it takes
minutes. One row per phrase, then the share of right answers and the times,
so candidate models can be compared on the same list (docs/AI.md).

    python tests/measure_phrases.py
    python tests/measure_phrases.py --model phi4-mini --only Ferrari
    python tests/measure_phrases.py --model granite4:3b --list holdout

The first call loads the model and is timed apart ("load"); every phrase is
asked to the model directly, without the reader's cache.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
from collections.abc import Sequence
from pathlib import Path

from shaperoute_ai.ollama import DEFAULT_MODEL, DEFAULT_URL, OllamaModel

# phrases.json tunes the prompt; phrases-holdout.json only checks it (docs/AI.md).
LISTS = {
    "tuning": Path(__file__).with_name("phrases.json"),
    "holdout": Path(__file__).with_name("phrases-holdout.json"),
}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--list", choices=LISTS, default="tuning")
    parser.add_argument("--only", help="substring of the phrase, e.g. Ferrari")
    parser.add_argument(
        "--think", action="store_true", help="let a model like qwen3 think first"
    )
    args = parser.parse_args(argv)

    data = json.loads(LISTS[args.list].read_text(encoding="utf-8"))
    shapes: list[str] = data["shapes"]
    phrases = [
        (item["text"], item["accept"])
        for item in data["phrases"]
        if args.only is None or args.only.casefold() in item["text"].casefold()
    ]
    model = OllamaModel(args.model, args.url, think=args.think)

    started = time.perf_counter()
    model.choose("cerchio", shapes)
    load_s = time.perf_counter() - started
    print(f"model {args.model}: load and first answer {load_s:.1f} s")
    print(f"{'':1} {'words':<24} {'answer':<7} {'accepted':<16} {'s':>5}  picture")

    right = 0
    wrong_shapes = 0
    seconds: list[float] = []
    for text, accept in phrases:
        started = time.perf_counter()
        choice = model.choose(text, shapes)
        seconds.append(time.perf_counter() - started)
        ok = choice.shape in accept
        right += ok
        # A shape where none was right draws something the runner did not ask.
        wrong_shapes += choice.shape is not None and None in accept and not ok
        accepted = "/".join(str(shape or "none") for shape in accept)
        print(
            f"{' ' if ok else 'x'} {text:<24} {choice.shape or 'none':<7}"
            f" {accepted:<16} {seconds[-1]:5.1f}  {choice.picture}"
        )

    print(
        f"right {right}/{len(phrases)} ({right / len(phrases):.0%}),"
        f" a shape instead of none {wrong_shapes};"
        f" seconds: median {statistics.median(seconds):.1f},"
        f" max {max(seconds):.1f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
