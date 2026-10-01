"""python -m shaperoute_api.insights: the self-improvement loop by hand
(TASK-130, ADR-0101, docs/INSIGHTS.md).

  report            metrics, overall and for each vocabulary version; what is
                    asked most: cities, languages, shapes, failing requests
  impact            did each version help? Rates against the version before,
                    with a verdict only when the events are enough
  propose           what the events suggest, with evidence
  explain ID        why a proposal was made: the checks it passed, its events
  apply ID          a new vocabulary version with the proposal (validated;
                    --dry-run shows it, --again re-applies a reverted one)
  revert VERSION    a new version equal to an older one
  history           the versions of the vocabulary and why
  validate          the vocabulary checked against the catalogue and tables
  import-history    the old request log as events, without the starts

It reads files of this computer only: no AI, no service, no cost.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from route_engine.seed_catalog import CITIES, PHRASES

from shaperoute_api.insights import problems_of, route_fields
from shaperoute_api.insights.analyze import (
    Proposal,
    demand,
    impact,
    key_of,
    metrics,
    metrics_by_version,
    proposals,
    sources,
    top_queries,
)
from shaperoute_api.insights.events import DEFAULT_DIR, Event, cell, read_events
from shaperoute_api.insights.vocabulary import DEFAULT_PATH, Vocabulary, phrase_key
from shaperoute_api.request_log import DEFAULT_DIR as REQUESTS_DIR
from shaperoute_api.request_log import FILE_NAME as REQUESTS_FILE
from shaperoute_api.request_log import read_entries
from shaperoute_api.themes import SHAPE_WORDS, THEME_WORDS, read_request, request_core

CATALOG_PHRASES = sorted({p for words in PHRASES.values() for p in words})


def _proposals(events: list[dict[str, Any]], vocab: Vocabulary) -> list[Proposal]:
    return proposals(
        events,
        vocab,
        table_theme=lambda text: read_request(text).theme,
        catalog_cities=CITIES,
        catalog_phrases=CATALOG_PHRASES,
        core=request_core,
        theme_words=THEME_WORDS,
        shape_words=SHAPE_WORDS,
    )


def _find(found: list[Proposal], proposal_id: str) -> Proposal:
    for p in found:
        if p.id == proposal_id:
            return p
    raise SystemExit(f"no proposal {proposal_id}: run `propose` to see them")


def would_change(events: list[dict[str, Any]], p: Proposal) -> int:
    """How many past events the proposal would have answered without the
    AI, or at all: the replay that checks a change before it is applied."""
    themes = p.additions.get("themes", {})
    shapes = p.additions.get("shapes", {})
    corrected = Vocabulary(corrections=p.additions.get("corrections", {}))
    return sum(
        1
        for e in events
        if e.get("text")
        and (e.get("by") == "ai" or e.get("code") == "theme_unknown")
        and (
            key_of(e, request_core) in themes
            or phrase_key(e["text"]) in shapes
            or (
                e["kind"] == "themed"
                and bool(corrected.corrections)
                and read_request(corrected.correct(e["text"])).theme is not None
            )
        )
    )


def status_of(vocab: Vocabulary, p: Proposal) -> str:
    if vocab.applied(p.id):
        return f"in effect in v{vocab.version}"
    if vocab.reverted(p.id):
        return "applied once, then reverted (apply --again to retry)"
    return "new"


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m shaperoute_api.insights")
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR, help="the events")
    parser.add_argument("--vocab", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--json", action="store_true", help="machine-readable")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("report")
    sub.add_parser("impact")
    propose = sub.add_parser("propose")
    propose.add_argument("--all", action="store_true", help="the reverted too")
    sub.add_parser("history")
    sub.add_parser("validate")
    explain = sub.add_parser("explain")
    explain.add_argument("id")
    apply = sub.add_parser("apply")
    apply.add_argument("id")
    apply.add_argument("--dry-run", action="store_true", help="show, change nothing")
    apply.add_argument("--again", action="store_true", help="re-apply a reverted one")
    revert = sub.add_parser("revert")
    revert.add_argument("version", type=int)
    imported = sub.add_parser("import-history")
    imported.add_argument("--requests", type=Path, default=REQUESTS_DIR / REQUESTS_FILE)
    args = parser.parse_args(argv)

    vocab = Vocabulary.load(args.vocab)
    if args.command == "import-history":
        return import_history(args.requests, args.dir)
    events = list(read_events(args.dir))

    if args.command == "validate":
        problems = problems_of(vocab)
        for problem in problems:
            print(problem)
        print(f"v{vocab.version}: {len(problems)} problems in {args.vocab}")
        return 1 if problems else 0

    if args.command == "impact":
        found_impact = impact(events, vocab, request_core)
        if args.json:
            print(json.dumps(found_impact, indent=1, ensure_ascii=False))
        else:
            print_impact(found_impact)
        return 0

    if args.command == "report":
        report = {
            "vocabulary_version": vocab.version,
            "overall": metrics(events),
            "by_version": metrics_by_version(events),
            "top_queries": top_queries(events),
            "demand": demand(events),
        }
        if args.json:
            print(json.dumps(report, indent=1, ensure_ascii=False))
        else:
            print_report(report)
        return 0

    if args.command == "history":
        for c in vocab.changes:
            what = c.get("add") or {"revert_to": c.get("revert_to")}
            print(
                f"v{c['version']} {c['date']} {c.get('proposal', '-')}: {c['reason']}"
            )
            print(f"    {json.dumps(what, ensure_ascii=False)}")
        print(f"current: v{vocab.version}")
        return 0

    if args.command == "revert":
        try:
            new = vocab.revert(args.version)
        except ValueError as exc:
            raise SystemExit(str(exc)) from None
        new.save(args.vocab)
        print(
            f"v{new.version}: back to v{args.version}. Commit {args.vocab} to keep it."
        )
        return 0

    found = _proposals(events, vocab)
    if args.command == "propose":
        # Reverted once: judged worse, so hidden unless asked for.
        hidden = [p for p in found if vocab.reverted(p.id)]
        shown = found if args.all else [p for p in found if p not in hidden]
        if args.json:
            print(
                json.dumps([p.as_dict() for p in shown], indent=1, ensure_ascii=False)
            )
            return 0
        if not shown:
            print(f"Nothing to propose from {len(events)} events.")
        for p in shown:
            mark = "apply" if p.applicable else "review"
            print(f"[{p.id}] {p.kind} ({mark}, {p.evidence} events): {p.reason}")
        if hidden and not args.all:
            print(f"{len(hidden)} reverted before, hidden (propose --all).")
        return 0

    if args.command == "explain" and all(p.id != args.id for p in found):
        # Applied already, so no longer proposed: the same events, against
        # an empty vocabulary, give it again with its evidence.
        found = _proposals(events, Vocabulary())
    p = _find(found, args.id)
    if args.command == "explain":
        print(json.dumps(p.as_dict(), indent=1, ensure_ascii=False))
        es = [e for e in events if e.get("text") and _about(e, p)]
        print(f"status: {status_of(vocab, p)}")
        print(f"events about it: {len(es)}, from {sources(es)} days or places")
        print(
            f"would have answered without the AI: {would_change(events, p)} past events"
        )
        return 0

    # apply: checked, validated, then a new version; the file is to be
    # reviewed and committed like code.
    if not p.applicable:
        raise SystemExit(f"{p.id} is for review: nothing to apply")
    if vocab.applied(p.id):
        raise SystemExit(f"{p.id} is already in v{vocab.version}")
    if vocab.reverted(p.id) and not args.again:
        raise SystemExit(f"{p.id} was reverted before: apply --again to retry it")
    new = vocab.add(p.additions, p.id, p.reason)
    problems = problems_of(new)
    if problems:
        for problem in problems:
            print(problem)
        raise SystemExit(f"{p.id} not applied: v{new.version} would not validate")
    saved = would_change(events, p)
    if args.dry_run:
        print(f"would be v{new.version}: {json.dumps(p.additions, ensure_ascii=False)}")
        print(
            f"valid; {saved} past events would not have needed the AI. Nothing saved."
        )
        return 0
    new.save(args.vocab)
    print(
        f"v{new.version}: {p.kind} applied ({saved} past events "
        f"would not have needed the AI). Restart the API, and commit {args.vocab}."
    )
    return 0


def _about(e: dict[str, Any], p: Proposal) -> bool:
    """Whether an event is one of the proposal's evidence, roughly: its
    words are among the proposal's additions."""
    text = phrase_key(e["text"])
    keys = {phrase_key(str(k)) for section in p.additions.values() for k in section}
    return (
        key_of(e, request_core) in keys
        or text in keys
        or bool(set(text.split()) & keys)
    )


def print_report(report: dict[str, Any]) -> None:
    overall = report["overall"]
    print(f"vocabulary v{report['vocabulary_version']}, {overall['events']} events")
    for key, value in overall.items():
        if key not in ("events", "by_kind", "errors"):
            print(f"  {key:22} {value}")
    print(f"  by kind               {overall['by_kind']}")
    print(f"  errors                {overall['errors']}")
    print("by vocabulary version:")
    for version, m in report["by_version"].items():
        print(
            f"  v{version}: {m['events']} events, ai_rate {m['ai_rate']}, "
            f"theme_unknown {m['theme_unknown_rate']}, themed ok "
            f"{m['themed_success_rate']}, explore empty {m['explore_empty_rate']}"
        )
    print("most asked (times, share that went well):")
    for kind, text, times, ok in report["top_queries"]:
        print(f"  {times:4}  {ok!s:5}  {kind:16} {text}")
    asked = report["demand"]
    for name in ("languages", "cities", "shapes", "words"):
        print(f"{name:9} {asked[name]}")
    print("worth suggesting (asked often, nearly always fine):")
    for text, times in asked["worth_suggesting"]:
        print(f"  {times:4}  {text}")
    print("failing (asked again, mostly not fine): what is missing")
    for kind, text, times, ok in asked["failing"]:
        print(f"  {times:4}  {ok!s:5}  {kind:16} {text}")


def print_impact(found: list[dict[str, Any]]) -> None:
    if not found:
        print("No version after another has served searches yet.")
    for v in found:
        print(
            f"v{v['version']} against v{v['against']} ({v['events']} events): "
            f"{v['verdict']}"
        )
        print(f"    {v['reason']}")
        print(
            f"    its requests: {v['answered']}, AI calls saved "
            f"{v['ai_calls_saved']}, ms {v['ms_ai_before']} with the AI before, "
            f"{v['ms_learned_after']} learned after"
        )
        for name, c in v["rates"].items():
            if c["n_before"] or c["n_after"]:
                print(
                    f"    {name:20} {c['before']!s:6} (n {c['n_before']}) -> "
                    f"{c['after']!s:6} (n {c['n_after']})  {c['verdict']}"
                )


HISTORY_FILE = "events-0000-history.jsonl"


def import_history(requests: Path, directory: Path) -> int:
    """The request log's lines as "route" events, in a file of their own
    rewritten each time (run it again, nothing doubles): starts only as
    ~1 km cells, never the point. The request log stays as it is."""
    if not requests.exists():
        print(f"no request log at {requests}")
        return 0
    lines = []
    for entry in read_entries(requests):
        outcome = entry.get("outcome", {})
        status = outcome.get("status")
        if status == "cancelled":
            continue
        fields = route_fields(
            entry.get("request"),
            outcome.get("similarity"),
            outcome.get("code") if status == "failed" else None,
        )
        point = fields.pop("point")
        elapsed = outcome.get("elapsed_s")
        event = Event(
            kind="route",
            cell=cell(point),
            ms=None if elapsed is None else round(float(elapsed) * 1000),
            ts=str(entry.get("time", ""))[:19] + "Z",
            **{k: v for k, v in fields.items() if v is not None},
        )
        lines.append(event.line())
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / HISTORY_FILE
    path.write_text("".join(f"{line}\n" for line in lines), encoding="utf-8")
    path.chmod(0o600)
    print(f"{len(lines)} past requests imported into {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
