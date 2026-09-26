"""OllamaModel without Ollama: a fake post, and a tiny HTTP server on this PC."""

from __future__ import annotations

import json
import socket
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, cast

import pytest

from shaperoute_ai.ollama import (
    DEFAULT_MODEL,
    KEEP_ALIVE,
    MAX_ANSWER_TOKENS,
    TIMEOUT_S,
    OllamaModel,
    parse_reply,
    post_json,
)
from shaperoute_ai.prompt import NONE
from shaperoute_ai.reading import Choice, ModelUnavailableError

SHAPES = (
    "circle",
    "heart",
    "star",
    "horse",
    "moon",
    "cat",
    "fish",
    "butterfly",
    "snail",
    "dog_head",
    "rabbit_head",
)


def reply(content: str) -> dict[str, Any]:
    """Ollama's answer to POST /api/chat, stream off, fields the model reads."""
    return {
        "model": DEFAULT_MODEL,
        "message": {"role": "assistant", "content": content},
    }


class FakePost:
    def __init__(self, answer: Any) -> None:
        self.answer = answer
        self.calls: list[tuple[str, dict[str, Any], float]] = []

    def __call__(self, url: str, body: dict[str, Any], timeout_s: float) -> Any:
        self.calls.append((url, body, timeout_s))
        return self.answer


def test_the_request_asks_for_a_fixed_answer_among_the_shapes() -> None:
    post = FakePost(reply('{"picture": "prancing horse", "shape": "horse"}'))
    model = OllamaModel("some-model:1b", "http://127.0.0.1:11434/", 5.0, post)
    assert model.choose("stemma della Ferrari", SHAPES) == Choice(
        "horse", "prancing horse"
    )
    [(url, body, timeout_s)] = post.calls
    assert url == "http://127.0.0.1:11434/api/chat"
    assert timeout_s == 5.0
    assert body["model"] == "some-model:1b"
    assert body["stream"] is False
    assert body["options"] == {
        "temperature": 0,
        "seed": 0,
        "num_predict": MAX_ANSWER_TOKENS,
    }
    system, user = body["messages"]
    assert system["role"] == "system" and "- horse:" in system["content"]
    assert user == {"role": "user", "content": "stemma della Ferrari"}
    shape = body["format"]["properties"]["shape"]
    assert shape["enum"] == [*SHAPES, NONE]
    assert body["format"]["required"] == ["picture", "shape"]


def test_the_model_does_not_think_unless_told() -> None:
    post = FakePost(reply('{"picture": "", "shape": "star"}'))
    OllamaModel(post=post).choose("stella cometa", SHAPES)
    OllamaModel(post=post, think=None).choose("stella cometa", SHAPES)
    assert post.calls[0][1]["think"] is False
    assert "think" not in post.calls[1][1]


def test_none_becomes_no_shape() -> None:
    choice = parse_reply(reply('{"picture": "a dog", "shape": "none"}'))
    assert choice == Choice(None, "a dog")


def test_a_shape_outside_the_list_is_passed_on_for_the_reader_to_refuse() -> None:
    assert parse_reply(reply('{"picture": "", "shape": "dog"}')).shape == "dog"


@pytest.mark.parametrize(
    "answer",
    [
        {},
        {"message": {}},
        reply("horse"),
        reply('{"picture": "a horse"}'),
        reply('{"picture": "a horse", "shape": 3}'),
        reply('["horse"]'),
        None,
    ],
)
def test_a_broken_answer_is_no_answer(answer: Any) -> None:
    with pytest.raises(ModelUnavailableError, match="broken"):
        parse_reply(answer)


class FakeOllama(HTTPServer):
    """Answers every POST with `answer`, and keeps the last body received."""

    answer: tuple[int, str] = (200, "{}")
    received: Any = None


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        server = cast(FakeOllama, self.server)
        length = int(self.headers["Content-Length"])
        server.received = json.loads(self.rfile.read(length))
        status, body = server.answer
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, *args: Any) -> None:
        pass


@pytest.fixture
def server() -> Iterator[FakeOllama]:
    httpd = FakeOllama(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield httpd
    httpd.shutdown()
    httpd.server_close()


def url_of(httpd: FakeOllama) -> str:
    host, port = httpd.server_address[:2]
    return f"http://{host!s}:{port}"


def test_post_json_sends_and_reads_json(server: FakeOllama) -> None:
    server.answer = (200, json.dumps(reply('{"picture": "", "shape": "star"}')))
    model = OllamaModel(url=url_of(server), post=post_json)
    assert model.choose("stella cometa", SHAPES).shape == "star"
    assert server.received["messages"][1]["content"] == "stella cometa"


def test_a_model_not_pulled_says_so(server: FakeOllama) -> None:
    server.answer = (404, '{"error": "model \'qwen3:4b\' not found"}')
    with pytest.raises(ModelUnavailableError, match="404.*not found"):
        post_json(f"{url_of(server)}/api/chat", {}, 5.0)


def test_an_answer_that_is_not_json_is_no_answer(server: FakeOllama) -> None:
    server.answer = (200, "<html>")
    with pytest.raises(ModelUnavailableError, match="not JSON"):
        post_json(f"{url_of(server)}/api/chat", {}, 5.0)


def test_ollama_not_running_is_no_answer() -> None:
    # A port that was free a moment ago: nobody listens there.
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    with pytest.raises(ModelUnavailableError, match="is it running"):
        post_json(f"http://127.0.0.1:{port}/api/chat", {}, 5.0)


def test_preload_asks_ollama_to_load_the_model_with_no_prompt() -> None:
    post = FakePost({"model": DEFAULT_MODEL, "response": "", "done": True})
    OllamaModel(url="http://pc:11434/", post=post).preload()
    [(url, body, timeout_s)] = post.calls
    assert url == "http://pc:11434/api/generate"
    assert body == {"model": DEFAULT_MODEL, "keep_alive": KEEP_ALIVE}
    assert timeout_s == TIMEOUT_S


def test_preload_says_when_ollama_cannot_load_it() -> None:
    def post(url: str, body: dict[str, Any], timeout_s: float) -> Any:
        raise ModelUnavailableError("Ollama answered 404: model not found")

    with pytest.raises(ModelUnavailableError, match="404"):
        OllamaModel(post=post).preload()
