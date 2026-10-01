"""The database: where it is, and its schema brought up to date (TASK-114,
ADR-0115, docs/DATABASE.md).

PostgreSQL with PostGIS, reached with psycopg 3 and SQL written by hand. Its
address comes only from the environment (SHAPEROUTE_DATABASE_URL): it holds
a password, so it never goes on the command line. Without it the API runs as
before, with no accounts.

The schema is the numbered SQL files in services/api/migrations, applied in
order when the API starts, each in its own transaction and recorded in
schema_migrations. A file already applied is never run again, so a migration
in main is never edited: the next one is written instead.
"""

from __future__ import annotations

import os
import re
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import psycopg
from psycopg.rows import DictRow, dict_row

DATABASE_VARIABLE = "SHAPEROUTE_DATABASE_URL"
MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"
MIGRATION_NAME = re.compile(r"^(\d{4})_[a-z0-9_]+\.sql$")
# Two APIs starting together on one database: one applies, the other waits.
MIGRATION_LOCK = 114_0001
CONNECT_TIMEOUT_S = 5


class MigrationError(ValueError):
    """The migrations folder has a file that cannot be applied in order."""


def migrations(directory: Path = MIGRATIONS_DIR) -> list[Path]:
    """The SQL files in the order they are applied, each number once."""
    files = sorted(p for p in directory.iterdir() if p.suffix == ".sql")
    seen: dict[str, Path] = {}
    for path in files:
        match = MIGRATION_NAME.match(path.name)
        if match is None:
            raise MigrationError(
                f"{path.name}: a migration is named NNNN_what.sql, in lower case"
            )
        number = match.group(1)
        if number in seen:
            raise MigrationError(
                f"{path.name} and {seen[number].name} have the same number"
            )
        seen[number] = path
    return files


@dataclass(frozen=True)
class Database:
    """A PostgreSQL address. Each call opens its own connection: the API's
    few account requests do not need a pool yet."""

    url: str

    @classmethod
    def from_env(cls, environ: Mapping[str, str] = os.environ) -> Database | None:
        url = environ.get(DATABASE_VARIABLE, "").strip()
        return cls(url) if url else None

    @contextmanager
    def connect(self) -> Iterator[psycopg.Connection[DictRow]]:
        """One transaction: committed if the block ends, rolled back if it
        raises."""
        with psycopg.connect(
            self.url, row_factory=dict_row, connect_timeout=CONNECT_TIMEOUT_S
        ) as conn:
            yield conn

    def migrate(self, directory: Path = MIGRATIONS_DIR) -> list[str]:
        """Apply the migrations not applied yet; their names, in order."""
        files = migrations(directory)
        applied: list[str] = []
        with psycopg.connect(
            self.url, autocommit=True, connect_timeout=CONNECT_TIMEOUT_S
        ) as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations ("
                " version text PRIMARY KEY,"
                " applied_at timestamptz NOT NULL DEFAULT now())"
            )
            for path in files:
                with conn.transaction():
                    conn.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK,))
                    done = conn.execute(
                        "SELECT 1 FROM schema_migrations WHERE version = %s",
                        (path.stem,),
                    ).fetchone()
                    if done is not None:
                        continue
                    # No parameters: psycopg sends the file as it is, several
                    # statements included.
                    conn.execute(path.read_text(encoding="utf-8").encode())
                    conn.execute(
                        "INSERT INTO schema_migrations (version) VALUES (%s)",
                        (path.stem,),
                    )
                applied.append(path.stem)
        return applied
