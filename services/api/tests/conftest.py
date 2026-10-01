"""A throwaway PostgreSQL with PostGIS for the tests that need one (TASK-114,
docs/DATABASE.md: a real database, no fakes).

SHAPEROUTE_TEST_DATABASE_URL points at a server to use, as a user that may
create databases. Otherwise the tests start the postgis/postgis image with
docker, once per run, and remove it at the end. Each test gets a database of
its own, created empty and dropped after it.

Without docker and without the variable, the database tests are skipped on a
PC and fail in CI (CI=true): a database left out must not look green.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import time
import uuid
from collections.abc import Iterator

import psycopg
import pytest
from psycopg import sql

URL_VARIABLE = "SHAPEROUTE_TEST_DATABASE_URL"
IMAGE = "postgis/postgis:16-3.4"
PASSWORD = "test-only"
START_TIMEOUT_S = 120


def _docker_server() -> Iterator[str]:
    container = subprocess.run(
        [
            "docker", "run", "-d", "--rm",
            "-e", f"POSTGRES_PASSWORD={PASSWORD}",
            "-p", "127.0.0.1::5432",
            IMAGE,
        ],
        check=True, capture_output=True, text=True,
    ).stdout.strip()  # fmt: skip
    try:
        port = subprocess.run(
            ["docker", "port", container, "5432"],
            check=True,
            capture_output=True,
            text=True,
        ).stdout.split(":")[-1].strip()
        url = f"postgresql://postgres:{PASSWORD}@127.0.0.1:{port}/postgres"
        _wait_for(url)
        yield url
    finally:
        subprocess.run(["docker", "rm", "-f", container], capture_output=True)


def _wait_for(url: str) -> None:
    # The image first initialises on a Unix socket only: TCP answers once the
    # real server is up.
    deadline = time.monotonic() + START_TIMEOUT_S
    while True:
        try:
            with psycopg.connect(url, connect_timeout=2) as conn:
                conn.execute("SELECT 1")
            return
        except psycopg.OperationalError:
            if time.monotonic() > deadline:
                raise
            time.sleep(0.5)


@pytest.fixture(scope="session")
def database_server() -> Iterator[str]:
    """The address of a server whose user may create databases."""
    given = os.environ.get(URL_VARIABLE, "").strip()
    if given:
        yield given
        return
    if shutil.which("docker") is None:
        why = f"no database: set {URL_VARIABLE} or install docker"
        if os.environ.get("CI"):
            pytest.fail(why)
        pytest.skip(why)
    yield from _docker_server()


@pytest.fixture
def database_url(database_server: str) -> Iterator[str]:
    """An empty database for one test, dropped after it."""
    name = f"test_{uuid.uuid4().hex[:12]}"
    with psycopg.connect(database_server, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    url = psycopg.conninfo.make_conninfo(database_server, dbname=name)
    try:
        yield url
    finally:
        with psycopg.connect(database_server, autocommit=True) as admin:
            admin.execute(
                sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name))
            )
