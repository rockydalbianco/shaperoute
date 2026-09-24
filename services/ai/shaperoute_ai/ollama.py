"""The model runs in Ollama, on the same PC as the API (ADR-0012).

Ollama answers over HTTP on port 11434: the standard library is enough, no
client package. Free, open source, no keys, and the words never leave the PC.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Any

from shaperoute_ai.prompt import NONE, answer_schema, system_prompt
from shaperoute_ai.reading import Choice, ModelUnavailableError

DEFAULT_URL = "http://127.0.0.1:11434"
DEFAULT_MODEL = "qwen2.5:3b"
# The first answer loads the model from disk: seconds on this laptop.
TIMEOUT_S = 60.0
# How long Ollama keeps the model in memory after an answer.
KEEP_ALIVE = "15m"
# The answer is a short JSON object; this only stops a runaway one.
MAX_ANSWER_TOKENS = 64

# POST a JSON body to a URL within a timeout, return the JSON answer.
Post = Callable[[str, dict[str, Any], float], Any]


def post_json(url: str, body: dict[str, Any], timeout_s: float) -> Any:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_s) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # e.g. 404 {"error": "model 'qwen2.5:3b' not found"}: not pulled yet.
        detail = exc.read().decode("utf-8", "replace").strip()
        raise ModelUnavailableError(f"Ollama answered {exc.code}: {detail}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        reason = getattr(exc, "reason", exc)
        raise ModelUnavailableError(
            f"Ollama does not answer at {url} ({reason}): is it running?"
        ) from exc
    except ValueError as exc:
        raise ModelUnavailableError(f"Ollama's answer is not JSON: {exc}") from exc


@dataclass
class OllamaModel:
    """A model pulled in Ollama, e.g. `ollama pull qwen2.5:3b`."""

    model: str = DEFAULT_MODEL
    url: str = DEFAULT_URL
    timeout_s: float = TIMEOUT_S
    post: Post = field(default=post_json, repr=False)

    def request_body(self, text: str, shapes: Sequence[str]) -> dict[str, Any]:
        return {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt(shapes)},
                {"role": "user", "content": text},
            ],
            "format": answer_schema(shapes),
            "stream": False,
            "keep_alive": KEEP_ALIVE,
            # Temperature 0 and a fixed seed: the same words, the same answer.
            "options": {"temperature": 0, "seed": 0, "num_predict": MAX_ANSWER_TOKENS},
        }

    def choose(self, text: str, shapes: Sequence[str]) -> Choice:
        reply = self.post(
            f"{self.url.rstrip('/')}/api/chat",
            self.request_body(text, shapes),
            self.timeout_s,
        )
        return parse_reply(reply)


def parse_reply(reply: Any) -> Choice:
    """The choice in Ollama's answer: {"message": {"content": "{...}"}}."""
    try:
        content = reply["message"]["content"]
        answer = json.loads(content)
        shape = answer["shape"]
        picture = answer.get("picture", "")
    except (KeyError, TypeError, ValueError) as exc:
        raise ModelUnavailableError(f"The model's answer is broken: {reply!r}") from exc
    if not isinstance(shape, str) or not isinstance(picture, str):
        raise ModelUnavailableError(f"The model's answer is broken: {answer!r}")
    return Choice(None if shape == NONE else shape, picture.strip())
