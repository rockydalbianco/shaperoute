import assert from "node:assert/strict";
import { test } from "node:test";

import plans from "../fixtures/gym-plans.json" with { type: "json" };
import mine from "../fixtures/my-plan-post.json" with { type: "json" };
import request from "../fixtures/plan-post-request.json" with { type: "json" };
import reads from "../fixtures/reads.json" with { type: "json" };
import {
  type DrawingSource,
  type GymPlan,
  type GymPlanPosted,
  type MyPlanPost,
  PLAN_POST_VISIBILITIES,
  PLAN_SOURCE,
  PLANS_READ,
  type PlanPostRequest,
  type PlanPostVisibility,
} from "../src/index.ts";

// The same JSON is validated by the API's test_plan_posts.py (TASK-485,
// ADR-0394).
const visibility = (value: string): PlanPostVisibility => {
  assert.ok((PLAN_POST_VISIBILITIES as readonly string[]).includes(value));
  return value as PlanPostVisibility;
};
const sent = {
  ...request,
  visibility: visibility(request.visibility),
} as PlanPostRequest;
const kept = { ...mine, visibility: visibility(mine.visibility) } as MyPlanPost;

test("a plan posted is the plan, a line and who sees it, never «Only me»", () => {
  assert.deepEqual(Object.keys(sent).sort(), ["description", "plan", "visibility"]);
  assert.deepEqual([...PLAN_POST_VISIBILITIES], ["everyone", "followers"]);
});

test("the plan posted carries nothing of its owner's own", () => {
  const program = sent.plan.program;
  assert.ok(program !== undefined);
  assert.ok(!("starts_on" in program));
  assert.ok(!("runner" in program));
  assert.ok(program.target === undefined || !("on" in program.target));
  // Its kg go with it: «Use this plan» copies them too.
  assert.equal(program.sessions[0]?.items[0]?.load_kg, 80);
});

test("its owner reads the plan as it was posted, its id and when", () => {
  assert.deepEqual(kept.plan, sent.plan);
  assert.equal(kept.description, sent.description);
  assert.match(kept.id, /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(kept.published_at)));
});

test("«Use this plan» is a plan of one's own with a first day", () => {
  // As the phone does it: the plan posted, a key, a place, a time and a
  // first day; the paces are asked again.
  const posted: GymPlanPosted = kept.plan;
  const program = posted.program;
  assert.ok(program !== undefined);
  const copy: GymPlan = {
    ...posted,
    key: "plbobcopy001",
    position: 0,
    updated_at: "2026-09-22T07:00:00Z",
    program: { ...program, starts_on: "2026-09-28" },
  };
  const theirs = plans.plans.find((one) => one.name === posted.name);
  assert.ok(theirs !== undefined);
  assert.deepEqual(
    copy.program?.sessions,
    theirs.program?.sessions.map((one, i) =>
      i === 0 ? { ...one, items: [{ ...one.items[0], load_kg: 80 }] } : one,
    ),
  );
});

test("`plans` is a kind an app may read, and `plan` a source of a drawing", () => {
  const source: DrawingSource = PLAN_SOURCE;
  assert.equal(source, "plan");
  assert.ok(reads.kinds.includes(PLANS_READ));
  assert.equal(reads.kinds.indexOf(PLANS_READ), reads.kinds.indexOf("sleep") + 1);
  // The app says it since TASK-485 part B.
  assert.ok(reads.this_app.split(",").includes(PLANS_READ));
});
