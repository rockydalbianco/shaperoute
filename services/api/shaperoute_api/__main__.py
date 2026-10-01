"""Start the API: python -m shaperoute_api [--lan] [--port 8000] [--ai-model ...]
[--request-log].

The key and the limit come from the environment, never from the command
line, which stays in the shell history (SHAPEROUTE_API_KEY and
SHAPEROUTE_RATE_LIMIT, docs/DEPLOY.md); so does the address of the accounts'
database, which holds a password (SHAPEROUTE_DATABASE_URL, docs/DATABASE.md).
"""

from __future__ import annotations

import argparse
import logging
import socket
from collections.abc import Sequence
from pathlib import Path

import psycopg
import uvicorn
from route_engine.network import OsmnxSource
from route_engine.shapes import SUPPORTED_SHAPES
from shaperoute_ai.ollama import DEFAULT_MODEL, DEFAULT_URL, OllamaModel
from shaperoute_ai.reading import ShapeReader
from shaperoute_ai.theme_reading import ThemeReader

from shaperoute_api.access import KEY_HEADER, KEY_VARIABLE, Access, AccessConfigError
from shaperoute_api.access_log import hide_query_strings
from shaperoute_api.accounts import Accounts
from shaperoute_api.app import create_app
from shaperoute_api.cities import CitySearch
from shaperoute_api.db import DATABASE_VARIABLE, Database, MigrationError
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.insights import Insights
from shaperoute_api.insights.events import DEFAULT_DIR as INSIGHTS_DIR
from shaperoute_api.insights.events import OFF_VARIABLE as INSIGHTS_OFF
from shaperoute_api.insights.events import EventLog
from shaperoute_api.insights.events import wanted as insights_wanted
from shaperoute_api.insights.vocabulary import DEFAULT_PATH as VOCABULARY
from shaperoute_api.insights.vocabulary import Vocabulary
from shaperoute_api.places import KEY_VARIABLE as PLACES_KEY
from shaperoute_api.places import PlaceSearch
from shaperoute_api.recommended import DEFAULT_DIR as CATALOG_DIR
from shaperoute_api.recommended import RecommendedCatalog
from shaperoute_api.request_log import DEFAULT_DIR, ON_VARIABLE, RequestLog, wanted
from shaperoute_api.themed import StopFinder, ThemedJobs

DEFAULT_PORT = 8000


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="python -m shaperoute_api",
        description="Serve the route engine over HTTP (docs/API.md).",
    )
    parser.add_argument(
        "--lan",
        action="store_true",
        help="answer the whole local network (the phone), not only this PC",
    )
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument(
        "--cache-dir",
        type=Path,
        default=Path("data/cache"),
        help="where road graphs are cached (default: data/cache, like the CLI)",
    )
    parser.add_argument(
        "--ai-model",
        default=DEFAULT_MODEL,
        help=f"the Ollama model that reads shape words (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--ai-url",
        default=DEFAULT_URL,
        help=f"where Ollama answers (default: {DEFAULT_URL})",
    )
    parser.add_argument(
        "--request-log",
        action="store_true",
        help=(
            f"record each route request, start included, to redo it with "
            f"python -m shaperoute_api.replay (also {ON_VARIABLE}=1)"
        ),
    )
    parser.add_argument(
        "--request-log-dir",
        type=Path,
        default=DEFAULT_DIR,
        help=f"where the request log is written (default: {DEFAULT_DIR})",
    )
    parser.add_argument(
        "--catalog-dir",
        type=Path,
        default=CATALOG_DIR,
        help=f"the recommended routes, one file per city (default: {CATALOG_DIR})",
    )
    parser.add_argument(
        "--no-insights",
        action="store_true",
        help=f"do not record search events (also {INSIGHTS_OFF}=0); "
        "they are recorded by default (TASK-130)",
    )
    parser.add_argument(
        "--insights-dir",
        type=Path,
        default=INSIGHTS_DIR,
        help=f"where search events are written (default: {INSIGHTS_DIR})",
    )
    parser.add_argument(
        "--vocabulary",
        type=Path,
        default=VOCABULARY,
        help="the learned vocabulary (default: the one in the repository)",
    )
    return parser.parse_args(argv)


def lan_address() -> str | None:
    """This PC's address on the local network, the one the phone must use."""
    # Connecting a UDP socket sends nothing: it only picks the interface that
    # would reach outside, which is the Wi-Fi one. 192.0.2.1 is never used.
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
        try:
            probe.connect(("192.0.2.1", 80))
        except OSError:
            return None
        address: str = probe.getsockname()[0]
        return address


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)
    try:
        access = Access.from_env()
    except AccessConfigError as exc:
        raise SystemExit(str(exc)) from None
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
    # GET /places carries the position: not in the access log (ADR-0096).
    hide_query_strings()
    # Accounts (TASK-114): the schema brought up to date before the first
    # request. A database set but out of reach stops the API: better than
    # accounts that fail one request at a time.
    database = Database.from_env()
    migrated: list[str] = []
    if database is not None:
        try:
            migrated = database.migrate()
        except (psycopg.Error, MigrationError) as exc:
            raise SystemExit(f"Database ({DATABASE_VARIABLE}): {exc}") from None
    accounts = None if database is None else Accounts(database)
    reader = ShapeReader(OllamaModel(args.ai_model, args.ai_url), SUPPORTED_SHAPES)
    request_log = RequestLog(args.request_log_dir) if wanted(args.request_log) else None
    places = PlaceSearch.from_env()
    recommended = RecommendedCatalog.from_dir(args.catalog_dir)
    source = ZoneGraphs(OsmnxSource(args.cache_dir))
    cities = CitySearch(places.key)
    # Search events, on by default (the user's choice, ADR-0101), and the
    # learned vocabulary: tables, then it, then the AI.
    insights = Insights(
        EventLog(args.insights_dir) if insights_wanted(args.no_insights) else None,
        Vocabulary.load(args.vocabulary),
    )
    # Themed routes (TASK-129): the places with the key of the place search,
    # the AI only for words the tables do not know.
    themed = ThemedJobs(
        source,
        StopFinder(places.key),
        cities=cities,
        insights=insights,
        ai=ThemeReader(OllamaModel(args.ai_model, args.ai_url)),
    )
    app = create_app(
        source,
        reader=reader,
        request_log=request_log,
        places=places,
        recommended=recommended,
        themed=themed,
        cities=cities,
        insights=insights,
        accounts=accounts,
    )
    host = "0.0.0.0" if args.lan else "127.0.0.1"
    here = f"http://127.0.0.1:{args.port}"
    print(f"API docs on this PC: {here}/docs")
    print(f"Shape words read by {args.ai_model} in Ollama, {args.ai_url}")
    if access.key is None:
        print(f"No API key ({KEY_VARIABLE} not set): only for the home network")
    else:
        print(f"API key required in the {KEY_HEADER} header ({KEY_VARIABLE})")
    if access.posts_per_minute:
        print(f"At most {access.posts_per_minute} POSTs a minute from each client")
    if places.key is None:
        print(f"Place search off ({PLACES_KEY} not set): the app asks Photon")
    else:
        print(f"Places suggested by Geoapify ({PLACES_KEY})")
    print(f"{len(recommended)} recommended routes from {args.catalog_dir}")
    if insights.on:
        print(
            f"Search events in {args.insights_dir}, vocabulary "
            f"v{insights.vocab.version} (--no-insights to stop)"
        )
    else:
        print(f"Search events not recorded; vocabulary v{insights.vocab.version}")
    if accounts is None:
        print(f"Accounts off ({DATABASE_VARIABLE} not set): sign-up answers 503")
    else:
        done = ", ".join(migrated) if migrated else "none, schema up to date"
        print(f"Accounts in PostgreSQL ({DATABASE_VARIABLE}); migrations: {done}")
    if request_log is None:
        print("Route requests are not recorded (--request-log records them)")
    else:
        print(f"Route requests recorded, start included, in {request_log.path}")
    if args.lan:
        address = lan_address() or "<this PC's address>"
        print(f"From the phone, same Wi-Fi: http://{address}:{args.port}/health")
    uvicorn.run(app, host=host, port=args.port)


if __name__ == "__main__":
    main()
