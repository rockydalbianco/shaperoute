"""Strava as this server talks to it: the OAuth of an athlete and the upload
of a file (TASK-187, ADR-0156, docs/API.md). What the API does with it, the
athletes of the accounts and the runs sent, is in strava.py.

The application is this server's own: STRAVA_CLIENT_ID and
STRAVA_CLIENT_SECRET in the environment. Without both, Strava is off.

Nothing secret is logged: not the Client Secret, not a token, not a code.
Whatever goes wrong while talking to Strava is raised without the call that
failed.

The only place that names Strava's addresses: change them here.
"""

from __future__ import annotations

import base64
import json
import logging
import math
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

log = logging.getLogger(__name__)

CLIENT_ID_VARIABLE = "STRAVA_CLIENT_ID"
CLIENT_SECRET_VARIABLE = "STRAVA_CLIENT_SECRET"
# The API's own domain (deploy/.env, for Caddy): where Strava sends the
# browser back.
DOMAIN_VARIABLE = "SHAPEROUTE_DOMAIN"

# The page for phones: it opens the Strava app when there is one.
AUTHORIZE_URL = "https://www.strava.com/oauth/mobile/authorize"
TOKEN_URL = "https://www.strava.com/api/v3/oauth/token"
# Strava's way to take an access back since June 2026; /oauth/deauthorize
# ends in June 2027.
REVOKE_URL = "https://www.strava.com/oauth/revoke"
UPLOADS_URL = "https://www.strava.com/api/v3/uploads"
ACTIVITY_URL = "https://www.strava.com/activities/{id}"
CALLBACK_PATH = "/strava/callback"
# All that is asked of an athlete: to add activities. Nothing is read.
SCOPE = "activity:write"
SPORT_TYPE = "Run"

TIMEOUT_S = 20.0
MAX_NAME_LENGTH = 120
QUARTER = timedelta(minutes=15)

# What Strava says of an upload that will never be an activity.
FAILED_STATUSES = frozenset(
    {
        "There was an error processing your activity.",
        "The created activity has been deleted.",
    }
)
ACTIVITY_ID = re.compile(r"(?:/activities/|activity )(\d+)")


@dataclass(frozen=True)
class Call:
    """A request to Strava, as it goes on the wire."""

    method: str
    url: str
    headers: Mapping[str, str] = field(repr=False)
    body: bytes | None = field(default=None, repr=False)


@dataclass(frozen=True)
class Reply:
    """Strava's answer, whatever its status; header names in lower case."""

    status: int
    headers: Mapping[str, str]
    body: bytes = field(repr=False)


Send = Callable[[Call], Reply]
"""Makes a call and returns the answer; raises when there is none."""


def send_over_network(call: Call) -> Reply:
    request = urllib.request.Request(
        call.url, data=call.body, headers=dict(call.headers), method=call.method
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
            headers = {name.lower(): value for name, value in response.headers.items()}
            return Reply(response.status, headers, response.read())
    except urllib.error.HTTPError as refused:
        with refused:
            headers = {name.lower(): value for name, value in refused.headers.items()}
            return Reply(refused.code, headers, refused.read())


class StravaError(Exception):
    """Strava did not do what was asked. Never carries the call."""


class StravaDownError(StravaError):
    """No answer, or one that is not the one Strava documents."""


class StravaRefusedError(StravaError):
    """Strava no longer takes this code or token."""


class StravaFullError(StravaError):
    """The application has all the athletes Strava lets it have: one,
    its owner, until Strava has reviewed it."""


class StravaBusyError(StravaError):
    """Strava's limit of requests is reached: the quarter of an hour's, or
    the day's."""

    def __init__(self, daily: bool) -> None:
        super().__init__("Strava's rate limit is reached")
        self.daily = daily


@dataclass(frozen=True)
class Tokens:
    access_token: str = field(repr=False)
    refresh_token: str = field(repr=False)
    expires_at: datetime


@dataclass(frozen=True)
class Athlete:
    id: int
    name: str


@dataclass(frozen=True)
class Upload:
    """A file Strava took, or refused at once (`id` None)."""

    id: int | None
    activity_id: int | None
    error: str | None
    status: str


def multipart(
    fields: Mapping[str, str], file_name: str, file_type: str, content: bytes
) -> tuple[str, bytes]:
    """The Content-Type and the body of a form with one file, named `file`."""
    boundary = secrets.token_hex(16)
    parts = [
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
        f"{value}\r\n".encode()
        for name, value in fields.items()
    ]
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
        f"Content-Type: {file_type}\r\n\r\n".encode() + content + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return f"multipart/form-data; boundary={boundary}", b"".join(parts)


def _json(reply: Reply) -> dict[str, Any]:
    try:
        body = json.loads(reply.body)
    except ValueError:
        raise StravaDownError() from None
    if not isinstance(body, dict):
        raise StravaDownError()
    return body


def _whole(value: Any) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _daily(reply: Reply) -> bool:
    """Whether the limit reached is the day's: "200,2000" against
    "187,2000" in Strava's headers. Unreadable: the quarter of an hour's."""
    try:
        limit = int(reply.headers["x-ratelimit-limit"].split(",")[1])
        usage = int(reply.headers["x-ratelimit-usage"].split(",")[1])
    except (KeyError, IndexError, ValueError):
        return False
    return usage >= limit


def retry_after_s(now: datetime, daily: bool) -> int:
    """The seconds before Strava counts from zero again: at the quarters of
    the hour, and at midnight UTC for the day."""
    utc = now.astimezone(UTC)
    if daily:
        midnight = utc.replace(hour=0, minute=0, second=0, microsecond=0)
        again = midnight + timedelta(days=1)
    else:
        quarter = utc.replace(
            minute=utc.minute - utc.minute % 15, second=0, microsecond=0
        )
        again = quarter + QUARTER
    return max(1, math.ceil((again - utc).total_seconds()))


def _tokens(body: Mapping[str, Any]) -> Tokens:
    access, refresh = body.get("access_token"), body.get("refresh_token")
    expires_at = _whole(body.get("expires_at"))
    if not (isinstance(access, str) and access) or expires_at is None:
        raise StravaDownError()
    if not (isinstance(refresh, str) and refresh):
        raise StravaDownError()
    try:
        return Tokens(access, refresh, datetime.fromtimestamp(expires_at, UTC))
    except (OverflowError, OSError, ValueError):
        raise StravaDownError() from None


def _athlete(body: Any) -> Athlete:
    athlete_id = _whole(body.get("id")) if isinstance(body, dict) else None
    if athlete_id is None:
        raise StravaDownError()
    names = [body.get("firstname"), body.get("lastname")]
    name = " ".join(n.strip() for n in names if isinstance(n, str) and n.strip())
    username = body.get("username")
    if not name and isinstance(username, str):
        name = username.strip()
    return Athlete(athlete_id, (name or "Strava athlete")[:MAX_NAME_LENGTH])


def _upload(body: Mapping[str, Any]) -> Upload:
    error, status = body.get("error"), body.get("status")
    return Upload(
        id=_whole(body.get("id")),
        activity_id=_whole(body.get("activity_id")),
        error=error if isinstance(error, str) and error else None,
        status=status if isinstance(status, str) else "",
    )


def outcome(upload: Upload) -> tuple[Literal["sent", "processing", "refused"], int]:
    """What became of an upload, and the activity's id (0 when Strava has
    the run and does not say where). A file Strava already has is sent: it
    names the activity in the error, "… duplicate of activity 123"."""
    if upload.activity_id is not None:
        return "sent", upload.activity_id
    if upload.error is not None or upload.status in FAILED_STATUSES:
        text = upload.error or ""
        if "duplicate" in text.lower():
            named = ACTIVITY_ID.search(text)
            return "sent", int(named.group(1)) if named else 0
        return "refused", 0
    if upload.id is None:
        return "refused", 0
    return "processing", 0


@dataclass(frozen=True)
class Strava:
    """This server's Strava application, and what it asks Strava."""

    client_id: str
    client_secret: str = field(repr=False)
    domain: str | None = None
    send: Send = field(default=send_over_network, repr=False)
    wait: Callable[[float], None] = field(default=time.sleep, repr=False)

    @classmethod
    def from_env(cls, environ: Mapping[str, str] = os.environ) -> Strava | None:
        """None, Strava off, unless both the id and the secret are set."""
        client_id = environ.get(CLIENT_ID_VARIABLE, "").strip()
        client_secret = environ.get(CLIENT_SECRET_VARIABLE, "").strip()
        if not client_id or not client_secret:
            return None
        domain = environ.get(DOMAIN_VARIABLE, "").strip() or None
        return cls(client_id, client_secret, domain)

    def redirect_uri(self, base_url: str) -> str:
        """Where Strava sends the browser back: on the server its domain,
        which is the one registered with Strava; at home the address the
        request came to."""
        base = f"https://{self.domain}" if self.domain else base_url.rstrip("/")
        return base + CALLBACK_PATH

    def authorize_url(self, state: str, redirect_uri: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "approval_prompt": "auto",
            "scope": SCOPE,
            "state": state,
        }
        return f"{AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"

    def _ask(self, call: Call) -> Reply:
        try:
            reply = self.send(call)
        except Exception:
            # The call carries a token or the secret: nothing of it, and
            # nothing of what went wrong with it, is raised or logged.
            raise StravaDownError() from None
        if reply.status == 429:
            raise StravaBusyError(_daily(reply))
        if reply.status >= 500:
            raise StravaDownError()
        return reply

    def _token(self, **grant: str) -> dict[str, Any]:
        form = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            **grant,
        }
        reply = self._ask(
            Call(
                "POST",
                TOKEN_URL,
                {"Content-Type": "application/x-www-form-urlencoded"},
                urllib.parse.urlencode(form).encode(),
            )
        )
        if reply.status == 400:
            # The code or the refresh token is not good (any more).
            raise StravaRefusedError()
        if reply.status == 403:
            # Strava's "limit exceeded": another athlete than the owner, on
            # an application Strava has not reviewed.
            raise StravaFullError()
        if reply.status == 401:
            # Not the athlete's fault: nobody is disconnected for it.
            log.error(
                "Strava refuses this server's application: check %s and %s",
                CLIENT_ID_VARIABLE,
                CLIENT_SECRET_VARIABLE,
            )
        if reply.status != 200:
            raise StravaDownError()
        return _json(reply)

    def exchange(self, code: str) -> tuple[Tokens, Athlete]:
        """The tokens for the code Strava gave the browser, and whose."""
        body = self._token(grant_type="authorization_code", code=code)
        return _tokens(body), _athlete(body.get("athlete"))

    def refresh(self, refresh_token: str) -> Tokens:
        """A new access token. StravaRefusedError when the athlete took the
        access away. The refresh token may change: the old one is dead."""
        return _tokens(
            self._token(grant_type="refresh_token", refresh_token=refresh_token)
        )

    def revoke(self, refresh_token: str) -> None:
        """Take the athlete's access back from this application."""
        basic = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode()
        ).decode()
        reply = self._ask(
            Call(
                "POST",
                REVOKE_URL,
                {
                    "Authorization": f"Basic {basic}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                urllib.parse.urlencode({"token": refresh_token}).encode(),
            )
        )
        if reply.status != 200:
            raise StravaDownError()

    def upload(
        self,
        access_token: str,
        gpx: str,
        external_id: str,
        name: str | None,
        description: str | None,
        sport_type: str = SPORT_TYPE,
    ) -> Upload:
        """Hand a run to Strava. `external_id` names it there: the same run
        handed twice is refused as a duplicate, not made twice. `sport_type`
        is Strava's name of the activity: "Run", "Ride" (TASK-208)."""
        fields = {
            "data_type": "gpx",
            "sport_type": sport_type,
            "external_id": external_id,
        }
        # Without a name Strava gives its own: "Morning Run".
        if name is not None:
            fields["name"] = name
        if description is not None:
            fields["description"] = description
        content_type, body = multipart(
            fields, f"{external_id}.gpx", "application/gpx+xml", gpx.encode()
        )
        reply = self._ask(
            Call(
                "POST",
                UPLOADS_URL,
                {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": content_type,
                },
                body,
            )
        )
        if reply.status == 401:
            raise StravaRefusedError()
        if reply.status in (200, 201):
            return _upload(_json(reply))
        if reply.status == 400:
            # Refused at once; why is in `error`, when Strava says it.
            refused = _upload(_json(reply))
            return Upload(None, None, refused.error or "refused", refused.status)
        raise StravaDownError()

    def upload_status(self, access_token: str, upload_id: int) -> Upload | None:
        """How far Strava is with an upload; None if it knows none such."""
        reply = self._ask(
            Call(
                "GET",
                f"{UPLOADS_URL}/{upload_id}",
                {"Authorization": f"Bearer {access_token}"},
            )
        )
        if reply.status == 401:
            raise StravaRefusedError()
        if reply.status == 404:
            return None
        if reply.status != 200:
            raise StravaDownError()
        return _upload(_json(reply))
