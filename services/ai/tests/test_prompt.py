from __future__ import annotations

from shaperoute_ai.prompt import NONE, OUTLINES, answer_schema, system_prompt


def test_the_prompt_lists_each_shape_with_its_outline() -> None:
    prompt = system_prompt(["heart", "horse", "kite"])
    assert f"- heart: {OUTLINES['heart']}" in prompt
    assert f"- horse: {OUTLINES['horse']}" in prompt
    # A shape without an outline line is shown by its name.
    assert "- kite: kite" in prompt
    assert "- star:" not in prompt
    assert f'"{NONE}"' in prompt


def test_the_answer_can_only_name_a_given_shape_or_none() -> None:
    schema = answer_schema(["circle", "star"])
    assert schema["properties"]["shape"]["enum"] == ["circle", "star", NONE]
    # The picture comes first: the model says what it sees, then chooses.
    assert list(schema["properties"]) == ["picture", "shape"]
