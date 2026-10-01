"""route_engine/overpass_address.py (TASK-127): fake resolver and
connections, no network."""

from __future__ import annotations

import socket

from route_engine.overpass_address import reachable, reachable_address

GOOD, BAD = "162.55.144.139", "65.109.112.52"
URL = "https://overpass-api.de/api"


def resolve(host: str) -> list[str]:
    assert host == "overpass-api.de"
    return [BAD, GOOD]


def connect(address: str, port: int, timeout_s: float) -> bool:
    return address == GOOD


def test_the_first_address_that_accepts() -> None:
    assert reachable_address("overpass-api.de", 443, resolve, connect) == GOOD
    assert reachable_address("overpass-api.de", 443, resolve, lambda *a: False) is None


def test_a_resolver_that_fails_gives_no_address() -> None:
    def broken(host: str) -> list[str]:
        raise socket.gaierror("no DNS")

    assert reachable_address("overpass-api.de", 443, broken, connect) is None


def test_inside_the_block_the_host_resolves_to_the_good_address() -> None:
    before = (socket.gethostbyname, socket.getaddrinfo)
    with reachable(URL, resolve, connect) as address:
        assert address == GOOD
        assert socket.gethostbyname("overpass-api.de") == GOOD
        # Other names resolve as always.
        assert socket.gethostbyname("localhost") == before[0]("localhost")
        info = socket.getaddrinfo("overpass-api.de", 443, socket.AF_INET)
        assert info[0][4][0] == GOOD
    assert (socket.gethostbyname, socket.getaddrinfo) == before


def test_restored_even_when_the_download_fails() -> None:
    before = (socket.gethostbyname, socket.getaddrinfo)
    try:
        with reachable(URL, resolve, connect):
            raise TimeoutError("Overpass is slow")
    except TimeoutError:
        pass
    assert (socket.gethostbyname, socket.getaddrinfo) == before


def test_no_good_address_changes_nothing() -> None:
    before = (socket.gethostbyname, socket.getaddrinfo)
    with reachable(URL, resolve, lambda *a: False) as address:
        assert address is None
        assert (socket.gethostbyname, socket.getaddrinfo) == before
