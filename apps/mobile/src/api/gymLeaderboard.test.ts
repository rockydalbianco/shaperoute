import leaderboard from "@shaperoute/shared-types/fixtures/gym-leaderboard.json";

import { answers, apiError } from "../account/testing";
import { fetchGymLeaderboard, isGymLeaderboard, shiftMonth } from "./gymLeaderboard";

// TASK-385 F: the monthly leaderboard at the gym, as the API gives it.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the example of the API is what the app reads", () => {
  expect(isGymLeaderboard(leaderboard)).toBe(true);
  expect(isGymLeaderboard({ ...leaderboard, mine: null, rows: [] })).toBe(true);
  expect(isGymLeaderboard({ ...leaderboard, month: "2026-13" })).toBe(false);
  expect(isGymLeaderboard({ ...leaderboard, measure: "kg" })).toBe(false);
  expect(
    isGymLeaderboard({ ...leaderboard, rows: [{ ...leaderboard.rows[0], rank: 0 }] }),
  ).toBe(false);
});

test("it asks for an exercise and, when given, a month", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: leaderboard }));
  const outcome = await fetchGymLeaderboard(
    URL,
    TOKEN,
    "bench_press",
    "2026-10",
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: leaderboard });
  expect(String(fetchFn.mock.calls[0][0])).toBe(
    "http://api/gym/leaderboard?exercise=bench_press&month=2026-10",
  );
  await fetchGymLeaderboard(URL, TOKEN, "bench_press", null, options(fetchFn));
  expect(String(fetchFn.mock.calls[1][0])).toBe(
    "http://api/gym/leaderboard?exercise=bench_press",
  );
});

test("an exercise without one is an error, not a leaderboard", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  const outcome = await fetchGymLeaderboard(
    URL,
    TOKEN,
    "assisted_pull_up",
    null,
    options(fetchFn),
  );
  expect(outcome.kind).not.toBe("ok");
});

test("the months before and after cross the year", () => {
  expect(shiftMonth("2026-11", -1)).toBe("2026-10");
  expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
});
