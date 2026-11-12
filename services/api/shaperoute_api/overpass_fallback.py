"""One attempt on a second Overpass service when the usual one answers
with an error (TASK-471, ADR-0385; the user's choice, 2026-11-12).

On 2026-11-12 overpass-api.de answered `502 Bad Gateway` ("at capacity")
for hours, and every route in a zone not yet in the cache ended in
`map_data_unavailable`. With a second service set, a zone's download for a
route someone is waiting for is tried once more there, and only then is
the answer an error. The same for the water of a paddling route or a swim
and for the snow of a snowshoe route (paddling.ServerWater,
snowshoeing.ServerSnow), which the engine asks Overpass for by itself.

Off unless the server says where: SHAPEROUTE_OVERPASS_FALLBACK_URL is the
second service's address, as OSMnx wants it (`https://host/api`); unset,
empty or `off`, nothing is tried twice. A second service is another party
that sees the areas asked for (never who asked): the privacy text names
it before the variable is set.

When it is tried: the usual service answered with an HTTP status of error,
or could not be reached. Not after a timeout: it was slow, the user has
already waited minutes, and the zone is left for the next request. Once,
never in a loop (docs/MAPS.md). The batch downloads (prefetch_zones) use
the engine's source alone and wait for the usual service.

The second service is asked as it asks to be (overpass.private.coffee,
read on 2026-11-12: any project, commercial too, no rate limit, a
User-Agent that names the project and where to reach it, word in advance
of more than ten requests a second): with USER_AGENT. The engine reads
OSMnx's address when it downloads, so it is OSMnx's settings that change
for the length of the attempt, and one such download runs at a time.
"""

from __future__ import annotations

import logging
import os
import threading
import urllib.error
from collections.abc import Callable, Iterator, Mapping
from contextlib import contextmanager
from typing import TypeVar
from urllib.parse import urlparse

log = logging.getLogger(__name__)

FALLBACK_VARIABLE = "SHAPEROUTE_OVERPASS_FALLBACK_URL"
OFF = "off"
# As the API names itself to the other services it asks (resort_weather).
USER_AGENT = "MuW/1.0 (https://getmuw.app)"

T = TypeVar("T")

# With a second service set, one download at a time in the process: the
# address is a setting of OSMnx, shared by every thread.
_one_at_a_time = threading.Lock()


def fallback_url(environ: Mapping[str, str] | None = None) -> str | None:
    """The second service's address, or None when none is set."""
    value = (os.environ if environ is None else environ).get(FALLBACK_VARIABLE, "")
    value = value.strip().rstrip("/")
    if not value or value.lower() == OFF:
        return None
    return value


def answered_with_an_error(exc: BaseException) -> bool:
    """Whether a download failed because Overpass said no (an HTTP status
    of error) or could not be reached; not when it timed out, nor for
    anything else (a zone with no roads, a full disk). The roads are asked
    through OSMnx (its ResponseStatusCodeError, requests' errors), the
    water and the snow by the engine's own request (urllib's)."""
    if isinstance(exc, urllib.error.HTTPError):
        return True
    if isinstance(exc, urllib.error.URLError):
        return not isinstance(exc.reason, TimeoutError)
    try:
        import requests
        from osmnx._errors import ResponseStatusCodeError
    except ImportError:  # the engine on the phone: no OSMnx, no download
        return False
    if isinstance(exc, ResponseStatusCodeError):
        return True
    return isinstance(exc, requests.exceptions.ConnectionError) and not isinstance(
        exc, requests.exceptions.Timeout
    )


def with_second_service(
    download: Callable[[], T], environ: Mapping[str, str] | None = None
) -> T:
    """What `download` gives; when it fails because Overpass answered with
    an error and a second service is set, what it gives from there, tried
    once. Any other failure, and the second attempt's, is the caller's."""
    url = fallback_url(environ)
    if url is None:
        return download()
    with _one_at_a_time:
        try:
            return download()
        except Exception as exc:
            if not answered_with_an_error(exc):
                raise
            log.warning(
                "Overpass answered with an error (%s): one attempt on %s",
                type(exc).__name__,
                urlparse(url).hostname,
            )
            with _asking(url):
                return download()


@contextmanager
def _asking(url: str) -> Iterator[None]:
    """For the length of the block OSMnx asks `url`, as USER_AGENT."""
    import osmnx as ox

    before = ox.settings.overpass_url, ox.settings.http_user_agent
    ox.settings.overpass_url, ox.settings.http_user_agent = url, USER_AGENT
    try:
        yield
    finally:
        ox.settings.overpass_url, ox.settings.http_user_agent = before
