import assert from "node:assert/strict";
import { test } from "node:test";

import example from "../fixtures/together.json" with { type: "json" };
import {
  TOGETHER_MAX_PEOPLE,
  TOGETHER_MAX_POINTS,
  type TogetherPage,
} from "../src/index.ts";

// The same JSON is validated by the API's test_together.py (TASK-417 D1).
const page = example as TogetherPage;

test("the author first, at most four people, each point with its second", () => {
  assert.ok(page.people.length >= 1 && page.people.length <= TOGETHER_MAX_PEOPLE);
  for (const person of page.people) {
    assert.equal(person.points.length, person.seconds.length);
    assert.ok(person.points.length <= TOGETHER_MAX_POINTS);
    assert.deepEqual(
      [...person.seconds].sort((a, b) => a - b),
      person.seconds,
    );
  }
  assert.equal(Math.min(...page.people.map((person) => person.seconds[0])), 0);
});

test("a person says nothing but its name, its track and its clock", () => {
  for (const person of page.people) {
    assert.deepEqual(Object.keys(person).sort(), [
      "pauses",
      "points",
      "public_id",
      "seconds",
      "username",
    ]);
  }
});
