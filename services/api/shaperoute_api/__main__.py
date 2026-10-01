"""Start the API: python -m shaperoute_api [--lan] [--port 8000] [--ai-model ...]
[--request-log].

The key and the limit come from the environment, never from the command
line, which stays in the shell history (SHAPEROUTE_API_KEY and
SHAPEROUTE_RATE_LIMIT, docs/DEPLOY.md).
"""

from __future__ import annotations

import argparse
import logging
import socket
from collections.abc import Sequence
from pathlib import Path

import uvicorn
from route_engine.network import OsmnxSource
from route_engine.shapes import SUPPORTED_SHAPES
from shaperoute_ai.ollama import DEFAULT_MODEL, DEFAULT_URL, OllamaModel
from shaperoute_ai.reading import ShapeReader

from shaperoute_api.access import KEY_HEADER, KEY_VARIABLE, Access, AccessConfigError
from shaperoute_api.access_log import hide_query_strings
from shaperoute_api.app import create_app
from shaperoute_api.graphs import ZoneGraphs
from shaperoute_api.places import KEY_VARIABLE as PLACES_KEY
from shaperoute_api.places import PlaceSearch
from shaperoute_api.request_log import DEFAULT_DIR, ON_VARIABLE, RequestLog, wanted

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
    reader = ShapeReader(OllamaModel(args.ai_model, args.ai_url), SUPPORTED_SHAPES)
    request_log = RequestLog(args.request_log_dir) if wanted(args.request_log) else None
    places = PlaceSearch.from_env()
    app = create_app(
        ZoneGraphs(OsmnxSource(args.cache_dir)),
        reader=reader,
        request_log=request_log,
        places=places,
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
