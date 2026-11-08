"""The ski resorts a member follows, and the posts of the days skied at a
resort (TASK-406 part D3, ADR-0338, migration 0058).

PUT and DELETE /me/ski-resorts/{id}/follow: «Your resorts» (the user's
choice, 2026-11-08), first in the «Ski» search and in «Change» during a day
of skiing; no notification. GET /me/ski-resorts: those followed, the last
followed first, in the shape of the search.

GET /ski-resorts/{id}/drawings: a page of the posts of the days of skiing at
the resort (runs.ski_resort_id, migration 0056) that the asker sees on a
profile (drawings.shown_sql), of the activities the app reads (X-MuW-Reads),
the latest day first, as a profile's page.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Path, Query, Response

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)
from shaperoute_api.drawings import (
    CURSOR_PATTERN,
    LISTED_COLUMNS,
    MAX_PAGE_SIZE,
    PAGE_SIZE,
    DrawingBody,
    DrawingsBody,
    _after_cursor,
    _cursor,
    _details,
    _line,
    _seen,
    shown_sql,
)
from shaperoute_api.reads import Shown
from shaperoute_api.recommended import preview
from shaperoute_api.schemas import ErrorBody
from shaperoute_api.ski_resorts import COLUMNS, _resort
from shaperoute_api.ski_resorts_api import NO_RESORT, SkiResortsBody, _body

ResortId = Annotated[str, Path(max_length=80)]

# The resorts followed are the member's own: a few, never a page.
MAX_FOLLOWED = 200


def resort_follows_routes() -> APIRouter:
    router = APIRouter(tags=["ski resorts"], responses=ACCOUNT_ERRORS)

    def known(accounts: Accounts, resort_id: str) -> None:
        with accounts.database.connect() as conn:
            found = conn.execute(
                "SELECT 1 FROM ski_resorts WHERE id = %s", (resort_id,)
            ).fetchone()
        if found is None:
            raise HTTPException(404, NO_RESORT)

    @router.put(
        "/me/ski-resorts/{resort_id}/follow",
        status_code=204,
        responses={404: {"model": ErrorBody}},
    )
    def follow(
        resort_id: ResortId,
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> Response:
        known(accounts, resort_id)
        with accounts.database.connect() as conn:
            conn.execute(
                "INSERT INTO resort_follows (user_id, resort_id, created_at)"
                " VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (user.id, resort_id, accounts.now()),
            )
        return Response(status_code=204)

    # Not followed, or never: the same.
    @router.delete("/me/ski-resorts/{resort_id}/follow", status_code=204)
    def unfollow(
        resort_id: ResortId,
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> Response:
        with accounts.database.connect() as conn:
            conn.execute(
                "DELETE FROM resort_follows WHERE user_id = %s AND resort_id = %s",
                (user.id, resort_id),
            )
        return Response(status_code=204)

    @router.get("/me/ski-resorts")
    def followed(
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> SkiResortsBody:
        with accounts.database.connect() as conn:
            rows = conn.execute(
                f"SELECT {COLUMNS} FROM ski_resorts s"
                " JOIN resort_follows f ON f.resort_id = s.id"
                " WHERE f.user_id = %s ORDER BY f.created_at DESC, s.name LIMIT %s",
                (user.id, MAX_FOLLOWED),
            ).fetchall()
        return SkiResortsBody(resorts=[_body(_resort(row)) for row in rows])

    @router.get(
        "/ski-resorts/{resort_id}/drawings", responses={404: {"model": ErrorBody}}
    )
    def resort_drawings(
        resort_id: ResortId,
        accounts: Annotated[Accounts, Depends(accounts_of)],
        user: Annotated[UserBody, Depends(current_user)],
        reads: Shown,
        limit: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = PAGE_SIZE,
        cursor: Annotated[str | None, Query(pattern=CURSOR_PATTERN)] = None,
    ) -> DrawingsBody:
        known(accounts, resort_id)
        where = (
            f"r.ski_resort_id = %s AND r.activity = 'skiing' AND {shown_sql('%s')}"
            f" AND {reads.sql('r.activity', 'r.track IS NOT NULL')}"
        )
        values: list[Any] = [resort_id, user.id]
        with accounts.database.connect() as conn:
            count = conn.execute(
                "SELECT count(*) AS n FROM drawings d JOIN runs r ON r.id = d.run_id"
                f" WHERE {where}",
                values,
            ).fetchone()
            paged, after = where, list(values)
            if cursor is not None:
                paged += " AND (r.started_at, d.id) < (%s, %s)"
                after += _after_cursor(cursor)
            rows = conn.execute(
                f"SELECT {LISTED_COLUMNS} FROM drawings d"
                f" JOIN runs r ON r.id = d.run_id WHERE {paged}"
                " ORDER BY r.started_at DESC, d.id DESC LIMIT %s",
                (*after, limit + 1),
            ).fetchall()
            page, more = rows[:limit], len(rows) > limit
            details = _details(conn, [row["id"] for row in page], user.id)
        assert count is not None
        return DrawingsBody(
            drawings=[
                DrawingBody(
                    **_seen(row, details), track_preview=preview(_line(row["track"]))
                )
                for row in page
            ],
            next=_cursor(page[-1]) if more else None,
            total=count["n"],
        )

    return router


def install_resort_follows(app: FastAPI) -> None:
    """The resorts followed and the posts of a resort; after
    install_accounts, which sets the database and the errors."""
    app.include_router(resort_follows_routes())
