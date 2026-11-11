import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import { dropGymPlan, fetchGymPlans, isGymPlans, saveGymPlan } from "./gymPlans";

// TASK-411 C: the plans of the gym, as the API gives and keeps them.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const [push, , muscle, liftAndRun] = plans.plans as GymPlan[];

test("the example of the API is what the app reads", () => {
  expect(isGymPlans(plans)).toBe(true);
  expect(isGymPlans({ plans: [] })).toBe(true);
  expect(isGymPlans({ plans: [{ ...push, days: [8] }] })).toBe(false);
  expect(isGymPlans({ plans: [{ ...push, items: [{ kind: "load", sets: 3 }] }] })).toBe(
    false,
  );
  expect(
    isGymPlans({
      plans: [{ ...push, items: [{ exercise: "plank", kind: "timed", sets: 0 }] }],
    }),
  ).toBe(false);
});

test("a plan made with the guide brings its weeks", () => {
  expect(muscle.program?.weeks).toBe(4);
  expect(isGymPlans({ plans: [{ ...push, program: null }] })).toBe(true);
  const program = muscle.program!;
  for (const broken of [
    { ...program, mode: "random" },
    { ...program, starts_on: "2 November" },
    { ...program, sessions: [{ day: 8, name: "A", items: [] }] },
    { ...program, custom: [{ week: 2 }] },
  ]) {
    expect(isGymPlans({ plans: [{ ...muscle, program: broken }] })).toBe(false);
  }
});

test("it lists, keeps and drops a plan by its key", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: plans }));
  expect(await fetchGymPlans(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: plans,
  });
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/me/gym-plans");

  const saving = jest.fn(answers({ status: 201, body: push }));
  const { key, ...request } = push;
  const saved = await saveGymPlan(URL, TOKEN, key, request, options(saving));
  expect(saved).toEqual({ kind: "ok", value: push });
  const [url, init] = saving.mock.calls[0];
  expect(String(url)).toBe(`http://api/me/gym-plans/${key}`);
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(String(init?.body))).toEqual(request);

  const dropping = jest.fn(answers({ status: 204 }));
  expect(await dropGymPlan(URL, TOKEN, key, options(dropping))).toEqual({
    kind: "ok",
    value: null,
  });
  expect(dropping.mock.calls[0][1]?.method).toBe("DELETE");
});

test("an API without plans is an error, not a list", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  expect((await fetchGymPlans(URL, TOKEN, options(fetchFn))).kind).not.toBe("ok");
});

test("an app of before reads a plan with weeks: its days, no exercises, no «Today»", () => {
  // The check of the app in production before the guide (TASK-411 C):
  // these six fields only, `program` unread.
  const before = (body: Record<string, unknown>) =>
    typeof body.key === "string" &&
    typeof body.name === "string" &&
    Array.isArray(body.days) &&
    body.days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
    Array.isArray(body.items) &&
    typeof body.position === "number" &&
    typeof body.updated_at === "string";
  const plan = muscle as unknown as Record<string, unknown>;
  expect(before(plan)).toBe(true);
  expect(muscle.days).toEqual([1, 3, 5]);
  // Without exercises its «Today» of before (days and items) is never one.
  expect(muscle.items).toEqual([]);
});

test("a run day of a plan (TASK-433 C): its run, read; one it does not know, not", () => {
  const run = liftAndRun.program!.sessions[1].run;
  expect(run).toEqual({ kind: "easy", distance_m: 5000 });
  const broken = {
    ...liftAndRun,
    program: {
      ...liftAndRun.program!,
      sessions: [{ day: 2, name: "Run", items: [], run: { kind: "tempo" } }],
    },
  };
  expect(isGymPlans({ plans: [broken] })).toBe(false);
});
