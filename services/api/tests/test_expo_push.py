"""Expo's push service as the API talks to it (TASK-262, ADR-0226): the
requests on the wire and the answers read, with Expo faked. No network."""

from __future__ import annotations

import json
from typing import Any

from shaperoute_api.expo_push import (
    DEVICE_NOT_REGISTERED,
    MAX_MESSAGES,
    RECEIPTS_URL,
    SEND_URL,
    UNREACHABLE,
    Expo,
    Message,
    short,
)
from shaperoute_api.strava_client import Call, Reply


class Wire:
    """Expo, faked: records each call and answers with `answer`."""

    def __init__(self, answer: Any) -> None:
        self.answer = answer
        self.calls: list[Call] = []

    def __call__(self, call: Call) -> Reply:
        self.calls.append(call)
        answer = self.answer(call) if callable(self.answer) else self.answer
        if isinstance(answer, Reply):
            return answer
        return Reply(200, {}, json.dumps(answer).encode())

    def bodies(self) -> list[Any]:
        return [json.loads(call.body or b"") for call in self.calls]


def token(n: int) -> str:
    return f"ExponentPushToken[token{n:04d}]"


def message(n: int) -> Message:
    return Message(token(n), f"text {n}", {"drawing_id": "d"})


def ok_tickets(call: Call) -> dict[str, Any]:
    sent = json.loads(call.body or b"")
    return {"data": [{"status": "ok", "id": f"id-{m['to']}"} for m in sent]}


def test_a_message_goes_as_expo_documents_it() -> None:
    wire = Wire(ok_tickets)
    tickets = Expo(send=wire).push([message(1)])
    (call,) = wire.calls
    assert (call.method, call.url) == ("POST", SEND_URL)
    assert call.headers["Content-Type"] == "application/json"
    assert wire.bodies() == [
        [
            {
                "to": token(1),
                "body": "text 1",
                "data": {"drawing_id": "d"},
                "sound": "default",
            }
        ]
    ]
    assert [(t.to, t.id, t.error) for t in tickets] == [
        (token(1), f"id-{token(1)}", None)
    ]


def test_messages_go_in_requests_of_a_hundred() -> None:
    wire = Wire(ok_tickets)
    tickets = Expo(send=wire).push([message(n) for n in range(MAX_MESSAGES + 1)])
    assert [len(body) for body in wire.bodies()] == [MAX_MESSAGES, 1]
    assert [t.to for t in tickets] == [token(n) for n in range(MAX_MESSAGES + 1)]
    assert all(t.id is not None for t in tickets)


def test_a_dead_token_is_said_by_its_ticket() -> None:
    wire = Wire(
        {
            "data": [
                {"status": "ok", "id": "a"},
                {
                    "status": "error",
                    "message": "not a registered push notification recipient",
                    "details": {"error": DEVICE_NOT_REGISTERED},
                },
                {"status": "error", "message": "something else"},
            ]
        }
    )
    tickets = Expo(send=wire).push([message(1), message(2), message(3)])
    assert [(t.id, t.error) for t in tickets] == [
        ("a", None),
        (None, DEVICE_NOT_REGISTERED),
        (None, "Error"),
    ]


def test_no_answer_leaves_the_messages_unsent_and_raises_nothing() -> None:
    def down(_call: Call) -> Reply:
        raise OSError("no network")

    for send in (
        down,
        Wire(Reply(500, {}, b"")),
        Wire(Reply(200, {}, b"not json")),
        # One ticket fewer than the messages: none of them can be read.
        Wire({"data": [{"status": "ok", "id": "a"}]}),
    ):
        tickets = Expo(send=send).push([message(1), message(2)])
        assert [(t.id, t.error) for t in tickets] == [(None, UNREACHABLE)] * 2


def test_receipts_say_what_became_of_each_ticket() -> None:
    wire = Wire(
        {
            "data": {
                "a": {"status": "ok"},
                "b": {
                    "status": "error",
                    "message": "gone",
                    "details": {"error": DEVICE_NOT_REGISTERED},
                },
            }
        }
    )
    said = Expo(send=wire).receipts(["a", "b", "not-ready"])
    (call,) = wire.calls
    assert call.url == RECEIPTS_URL
    assert wire.bodies() == [{"ids": ["a", "b", "not-ready"]}]
    # One not ready yet is not in the answer: asked again later.
    assert said == {"a": None, "b": DEVICE_NOT_REGISTERED}


def test_receipts_without_an_answer_are_none_known() -> None:
    assert Expo(send=Wire(Reply(503, {}, b""))).receipts(["a"]) == {}


def test_a_token_is_never_logged_whole() -> None:
    assert short(token(1)) == token(1)[:24] + "…"
    assert repr(message(1)).count("token0001") == 0
