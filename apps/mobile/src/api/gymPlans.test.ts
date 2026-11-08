import plans from "@shaperoute/shared-types/fixtures/gym-plans.json";
import type { GymPlan } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import { dropGymPlan, fetchGymPlans, isGymPlans, saveGymPlan } from "./gymPlans";

// TASK-411 C: the plans of the gym, as the API gives and keeps them.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const [push] = plans.plans as GymPlan[];

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
