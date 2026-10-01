"""Reach Overpass when one of its addresses refuses (TASK-127, ADR-0100).

overpass-api.de has two IPv4 addresses, and from the development Mac one of
them refuses every connection (MAPS.md). OSMnx pins one address per request
with `socket.gethostbyname`, which returns that one first: every download
failed. Here the addresses are tried before a download, and for its length
the host's name resolves to the first that accepts a connection. The name
stays in the URL, so HTTPS checks the certificate as always.

Downloads go one at a time through this module (a lock), as MAPS.md asks.
Without a better address nothing changes.
"""

from __future__ import annotations

import logging
import socket
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import Any
from urllib.parse import urlparse

log = logging.getLogger(__name__)

CONNECT_TIMEOUT_S = 5.0

Resolve = Callable[[str], list[str]]
Connect = Callable[[str, int, float], bool]

_lock = threading.RLock()


def ipv4_addresses(host: str) -> list[str]:
    """The host's IPv4 addresses, in the order the resolver gives, once each."""
    found: list[str] = []
    for *_, sockaddr in socket.getaddrinfo(
        host, 443, socket.AF_INET, socket.SOCK_STREAM
    ):
        address = str(sockaddr[0])
        if address not in found:
            found.append(address)
    return found


def accepts(address: str, port: int, timeout_s: float) -> bool:
    try:
        socket.create_connection((address, port), timeout=timeout_s).close()
    except OSError:
        return False
    return True


def reachable_address(
    host: str,
    port: int = 443,
    resolve: Resolve = ipv4_addresses,
    connect: Connect = accepts,
    timeout_s: float = CONNECT_TIMEOUT_S,
) -> str | None:
    """The first address of `host` that accepts a connection, or None."""
    try:
        addresses = resolve(host)
    except OSError:
        return None
    for address in addresses:
        if connect(address, port, timeout_s):
            return address
    return None


@contextmanager
def reachable(
    url: str,
    resolve: Resolve = ipv4_addresses,
    connect: Connect = accepts,
) -> Iterator[str | None]:
    """For the length of the block, `url`'s host resolves to an address that
    accepts connections; yields it, or None when there is none (nothing is
    changed then). One block at a time."""
    host = urlparse(url).hostname
    with _lock:
        address = (
            None if host is None else reachable_address(host, 443, resolve, connect)
        )
        if host is None or address is None:
            yield None
            return
        original_byname = socket.gethostbyname
        original_addrinfo = socket.getaddrinfo

        def gethostbyname(name: str) -> str:
            return address if name == host else original_byname(name)

        def getaddrinfo(name: Any, *args: Any, **kwargs: Any) -> Any:
            return original_addrinfo(address if name == host else name, *args, **kwargs)

        socket.gethostbyname = gethostbyname
        socket.getaddrinfo = getaddrinfo
        log.info("Overpass: %s through %s", host, address)
        try:
            yield address
        finally:
            socket.gethostbyname = original_byname
            socket.getaddrinfo = original_addrinfo
