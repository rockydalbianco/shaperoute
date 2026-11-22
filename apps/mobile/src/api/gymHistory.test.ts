import history from "@shaperoute/shared-types/fixtures/gym-history.json";

import { answers, apiError } from "../account/testing";
import { fetchGymHistory, isGymHistory } from "./gymHistory";

// TASK-483 B: the history of one exercise, as the API gives it.

const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the example of the API is what the app reads", () => {
  expect(isGymHistory(history)).toBe(true);
  expect(
    isGymHistory({ workouts_count: 0, points: [], records: [], workouts: [] }),
  ).toBe(true);
  expect(isGymHistory({ ...history, measure: "kg" })).toBe(false);
  expect(
    isGymHistory({ ...history, points: [{ ...history.points[0], value: -1 }] }),
  ).toBe(false);
  expect(
    isGymHistory({
      ...history,
      records: [{ ...history.records[0], kind: "fastest" }],
    }),
  ).toBe(false);
  expect(
    isGymHistory({
      ...history,
      workouts: [{ ...history.workouts[0], source: "file" }],
    }),
  ).toBe(false);
});

test("it asks for an exercise or a name, and the page after one", async () => {
  const fetchFn = jest.fn(answers({ status: 200, body: history }));
  const outcome = await fetchGymHistory(
    URL,
    TOKEN,
    { exercise: "bench_press" },
    null,
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: history });
  expect(String(fetchFn.mock.calls[0][0])).toBe(
    "http://api/me/gym-history?exercise=bench_press",
  );
  await fetchGymHistory(URL, TOKEN, { name: "Ring dips" }, "hb1", options(fetchFn));
  expect(String(fetchFn.mock.calls[1][0])).toBe(
    "http://api/me/gym-history?name=Ring+dips&before=hb1",
  );
});

test("an API without the history is an error, not a history", async () => {
  const fetchFn = jest.fn(answers({ status: 404, body: apiError("http_error") }));
  const outcome = await fetchGymHistory(
    URL,
    TOKEN,
    { exercise: "bench_press" },
    null,
    options(fetchFn),
  );
  expect(outcome.kind).toBe("api_error");
});
