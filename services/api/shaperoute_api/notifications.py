"""The two notification switches of an account, changed by their owner
(TASK-185, ADR-0206, docs/API.md, «Notifications»).

PUT /me/notifications keeps «Email notifications» and «Push notifications»
of «Settings»: only what is sent changes. Both are off until their owner
turns them on. **Nothing is sent yet**: this server has no mail service and
no push, and no code reads the switches to act on them. They are a choice
kept for when it does.

Only its owner reads them, in GET /me: never a profile, a search or a list.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI
from pydantic import BaseModel, ConfigDict, Field, StrictBool

from shaperoute_api.accounts import (
    ACCOUNT_ERRORS,
    NOT_SIGNED_IN,
    USER_COLUMNS,
    AccountError,
    Accounts,
    UserBody,
    accounts_of,
    current_user,
)


class NotificationsRequestBody(BaseModel):
    """PUT /me/notifications: only what changes. A switch not sent, or sent
    as null, stays as it is; true and false only, never "yes" or 1."""

    model_config = ConfigDict(extra="forbid")

    email: StrictBool | None = Field(
        default=None, description="«Email notifications»: on or off."
    )
    push: StrictBool | None = Field(
        default=None, description="«Push notifications»: on or off."
    )


@dataclass
class Notifications:
    """What an account chose about being notified. Kept, never acted on."""

    accounts: Accounts

    def change(self, user_id: int, body: NotificationsRequestBody) -> UserBody:
        """The account with the switches of `body`; the others as they were.
        An empty `body` changes nothing and answers the account as it is."""
        with self.accounts.database.connect() as conn:
            row = conn.execute(
                "UPDATE users SET"
                " notify_email = COALESCE(%s::boolean, notify_email),"
                " notify_push = COALESCE(%s::boolean, notify_push)"
                f" WHERE id = %s RETURNING {USER_COLUMNS}",
                (body.email, body.push, user_id),
            ).fetchone()
        if row is None:
            # The account was deleted between its token and this change.
            raise AccountError(401, "not_signed_in", NOT_SIGNED_IN)
        return UserBody.model_validate(row)


def notifications_of(
    accounts: Annotated[Accounts, Depends(accounts_of)],
) -> Notifications:
    """In the database of the accounts."""
    return Notifications(accounts)


def notification_routes() -> APIRouter:
    router = APIRouter(tags=["accounts"], responses=ACCOUNT_ERRORS)

    @router.put("/me/notifications")
    def change_notifications(
        body: NotificationsRequestBody,
        notifications: Annotated[Notifications, Depends(notifications_of)],
        user: Annotated[UserBody, Depends(current_user)],
    ) -> UserBody:
        return notifications.change(user.id, body)

    return router


def install_notifications(app: FastAPI) -> None:
    """The notification switches of the accounts; after install_accounts,
    which sets the database and the errors."""
    app.include_router(notification_routes())
