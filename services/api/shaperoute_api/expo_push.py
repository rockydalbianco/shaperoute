"""Expo's push service as this server talks to it (TASK-262, ADR-0226,
docs/API.md, «Push notifications»). What is sent, and to whom, is in
push.py.

Expo takes the messages for its push tokens and hands them to Apple and
Google. Two calls, both JSON over HTTPS with the standard library, as
strava_client.py talks to Strava:

- **send**: up to MAX_MESSAGES messages a request; the answer has one
  ticket for each, in the same order: an id, or an error at once
  ("DeviceNotRegistered" when the token is dead);
- **getReceipts**: later, what Apple and Google said of each ticket id, up
  to MAX_RECEIPTS ids a request. A receipt is ready some minutes after the
  send and kept by Expo for a day.

No access token: the project has not turned on Expo's «enhanced push
security». Nothing secret goes on the wire; a push token is still never
logged whole.

The only place that names Expo's addresses: change them here.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any

from shaperoute_api.strava_client import Call, Reply, Send, send_over_network

log = logging.getLogger(__name__)

SEND_URL = "https://exp.host/--/api/v2/push/send"
RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
# Expo's limits for one request.
MAX_MESSAGES = 100
MAX_RECEIPTS = 1000
# What Expo says of a token that will never get a message again: the app
# was removed, or the phone took a new token.
DEVICE_NOT_REGISTERED = "DeviceNotRegistered"
# Said here of a ticket Expo never answered for: the request failed.
UNREACHABLE = "Unreachable"

HEADERS = {
    "Accept": "application/json",
    "Content-Type": "application/json",
}


@dataclass(frozen=True)
class Message:
    """One notification for one phone."""

    to: str = field(repr=False)
    body: str
    # What the app opens when the notification is touched (push.py).
    data: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class Ticket:
    """What Expo said at once of one message: an id to ask the receipt
    with, or why it was not taken. Never both."""

    to: str = field(repr=False)
    id: str | None
    error: str | None


def short(token: str) -> str:
    """A token as the logs may show it: its first characters only."""
    return token[:24] + "…" if len(token) > 24 else token


def _body(reply: Reply) -> Any:
    try:
        return json.loads(reply.body)
    except ValueError:
        return None


def _error(item: Mapping[str, Any]) -> str:
    """The error of a ticket or a receipt: Expo's code when it gives one."""
    details = item.get("details")
    if isinstance(details, Mapping):
        code = details.get("error")
        if isinstance(code, str) and code:
            return code
    return "Error"


def _ticket(to: str, item: Any) -> Ticket:
    if isinstance(item, Mapping) and item.get("status") == "ok":
        ticket_id = item.get("id")
        if isinstance(ticket_id, str) and ticket_id:
            return Ticket(to, ticket_id, None)
    if isinstance(item, Mapping) and item.get("status") == "error":
        return Ticket(to, None, _error(item))
    return Ticket(to, None, "Error")


def _wire(message: Message) -> dict[str, Any]:
    return {
        "to": message.to,
        "body": message.body,
        "data": dict(message.data),
        "sound": "default",
    }


@dataclass(frozen=True)
class Expo:
    """Expo's push service, through `send`: the network, or a fake."""

    send: Send = field(default=send_over_network, repr=False)

    def _post(self, url: str, payload: Any) -> Any:
        """Expo's JSON answer, or None when there is none to read."""
        call = Call("POST", url, HEADERS, json.dumps(payload).encode())
        try:
            reply = self.send(call)
        except Exception:
            # The call carries push tokens: nothing of it is logged.
            log.warning("push: Expo did not answer")
            return None
        if reply.status != 200:
            log.warning("push: Expo answered %s", reply.status)
            return None
        return _body(reply)

    def push(self, messages: Sequence[Message]) -> list[Ticket]:
        """One ticket for each message, in their order, in requests of
        MAX_MESSAGES. A request Expo does not answer gives its messages
        UNREACHABLE: they are not sent again (push.py)."""
        tickets: list[Ticket] = []
        for start in range(0, len(messages), MAX_MESSAGES):
            batch = messages[start : start + MAX_MESSAGES]
            answer = self._post(SEND_URL, [_wire(m) for m in batch])
            data = answer.get("data") if isinstance(answer, Mapping) else None
            if not isinstance(data, list) or len(data) != len(batch):
                tickets.extend(Ticket(m.to, None, UNREACHABLE) for m in batch)
                continue
            tickets.extend(
                _ticket(m.to, item) for m, item in zip(batch, data, strict=True)
            )
        return tickets

    def receipts(self, ids: Sequence[str]) -> dict[str, str | None]:
        """What Apple and Google said of the tickets: None for delivered,
        else the error. An id not ready yet, or that Expo no longer keeps,
        is not in the answer; nor are those of a request Expo did not
        answer."""
        said: dict[str, str | None] = {}
        for start in range(0, len(ids), MAX_RECEIPTS):
            batch = list(ids[start : start + MAX_RECEIPTS])
            answer = self._post(RECEIPTS_URL, {"ids": batch})
            data = answer.get("data") if isinstance(answer, Mapping) else None
            if not isinstance(data, Mapping):
                continue
            for ticket_id in batch:
                item = data.get(ticket_id)
                if not isinstance(item, Mapping):
                    continue
                said[ticket_id] = None if item.get("status") == "ok" else _error(item)
        return said
