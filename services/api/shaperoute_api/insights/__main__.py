"""python -m shaperoute_api.insights: the self-improvement loop by hand
(TASK-130, ADR-0101, docs/INSIGHTS.md).

  report            metrics, overall and for each vocabulary version
  propose           what the events suggest, with evidence
  explain ID        why a proposal was made: its reason and its events
  apply ID          a new vocabulary version with the proposal (checked)
  revert VERSION    a new version equal to an older one
  history           the versions of the vocabulary and why
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

from shaperoute_api.insights import route_fields
from shaperoute_api.insights.analyze import (
    Proposal,
    key_of,
    metrics,
    metrics_by_version,
    proposals,
    top_queries,
)
from shaperoute_api.insights.events import DEFAULT_DIR, Event, cell, read_events
from shaperoute_api.insights.vocabulary import DEFAULT_PATH, Vocabulary, phrase_key
from shaperoute_api.request_log import DEFAULT_DIR as REQUESTS_DIR
from shaperoute_api.request_log import FILE_NAME as REQUESTS_FILE
from shaperoute_api.request_log import read_entries
from shaperoute_api.themes import read_request, request_core

CATALOG_PHRASES = sorted({p for words in PHRASES.values() for p in words})


def _proposals(events: list[dict[str, Any]], vocab: Vocabulary) -> list[Proposal]:
    return proposals(
        events,
        vocab,
        table_theme=lambda text: read_request(text).theme,
        catalog_cities=CITIES,
        catalog_phrases=CATALOG_PHRASES,
        core=request_core,
    )


def _find(found: list[Proposal], proposal_id: str) -> Proposal:
    for p in found:
        if p.id == proposal_id:
            return p
    raise SystemExit(f"no proposal {proposal_id}: run `propose` to see them")


def would_change(events: list[dict[str, Any]], p: Proposal) -> int:
    """How many past events the proposal would have answered without the
    AI: the replay that checks a change before it is applied."""
    themes = p.additions.get("themes", {})
    shapes = p.additions.get("shapes", {})
    return sum(
        1
        for e in events
        if e.get("by") == "ai"
        and e.get("text")
        and (key_of(e, request_core) in themes or phrase_key(e["text"]) in shapes)
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m shaperoute_api.insights")
    parser.add_argument("--dir", type=Path, default=DEFAULT_DIR, help="the events")
    parser.add_argument("--vocab", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--json", action="store_true", help="machine-readable")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("report")
    sub.add_parser("propose")
    sub.add_parser("history")
    explain = sub.add_parser("explain")
    explain.add_argument("id")
    apply = sub.add_parser("apply")
    apply.add_argument("id")
    revert = sub.add_parser("revert")
    revert.add_argument("version", type=int)
    imported = sub.add_parser("import-history")
    imported.add_argument("--requests", type=Path, default=REQUESTS_DIR / REQUESTS_FILE)
    args = parser.parse_args(argv)

    vocab = Vocabulary.load(args.vocab)
    if args.command == "import-history":
        return import_history(args.requests, args.dir)
    events = list(read_events(args.dir))

    if args.command == "report":
        report = {
            "vocabulary_version": vocab.version,
            "overall": metrics(events),
            "by_version": metrics_by_version(events),
            "top_queries": top_queries(events),
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
        if args.json:
            print(
                json.dumps([p.as_dict() for p in found], indent=1, ensure_ascii=False)
            )
            return 0
        if not found:
            print(f"Nothing to propose from {len(events)} events.")
        for p in found:
            mark = "apply" if p.applicable else "review"
            print(f"[{p.id}] {p.kind} ({mark}, {p.evidence} events): {p.reason}")
        return 0

    p = _find(found, args.id)
    if args.command == "explain":
        print(json.dumps(p.as_dict(), indent=1, ensure_ascii=False))
        print(
            f"would have answered without the AI: {would_change(events, p)} past events"
        )
        return 0

    # apply: checked, then a new version; the file is to be reviewed and committed.
    if not p.applicable:
        raise SystemExit(f"{p.id} is for review: nothing to apply")
    if vocab.applied(p.id):
        raise SystemExit(f"{p.id} is already in v{vocab.version}")
    new = vocab.add(p.additions, p.id, p.reason)
    new.save(args.vocab)
    print(
        f"v{new.version}: {p.kind} applied ({would_change(events, p)} past events "
        f"would not have needed the AI). Restart the API, and commit {args.vocab}."
    )
    return 0


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
    print("most asked:")
    for kind, text, times in report["top_queries"]:
        print(f"  {times:4}  {kind:16} {text}")


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
