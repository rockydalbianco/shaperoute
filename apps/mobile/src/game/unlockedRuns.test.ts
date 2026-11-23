import run from "@shaperoute/shared-types/fixtures/game-run.json";

import { answers, apiError } from "../account/testing";
import { tellUnlocked } from "./unlockedRuns";
import { onUnlocked } from "./unlocks";

const API = "http://api.test";
const KEY = "7c2e91a4b05d3f68";

/** The fake fetch, as the request takes it. */
const fake = (...list: Parameters<typeof answers>): jest.Mock => answers(...list);

let told: jest.Mock;
let stop: () => void;

beforeEach(() => {
  told = jest.fn();
  stop = onUnlocked(told);
});

afterEach(() => stop());

test("a run the API counted tells of the shapes it unlocked, with when it was kept", async () => {
  const fetchFn = fake({ status: 200, body: run });
  await tellUnlocked(API, "token", KEY, 1234, { fetchFn, key: null });
  expect(fetchFn.mock.calls[0][0]).toBe(`${API}/game/runs/${KEY}`);
  // With the editions and the collections it completed (TASK-423 part E).
  expect(told).toHaveBeenCalledWith({
    shapeIds: ["triangle"],
    keptAt: 1234,
    editions: [{ shapeId: "lightning", edition: "silver" }],
    collectionsDone: ["geometry"],
  });
});

test("a run that unlocked nothing tells nothing", async () => {
  const fetchFn = fake({
    status: 200,
    body: { ...run, unlocked: [], editions: [], collections_done: [] },
  });
  await tellUnlocked(API, "token", KEY, null, { fetchFn, key: null });
  expect(told).not.toHaveBeenCalled();
});

test("an edition alone tells; an older API's answer without them reads as before", async () => {
  const silver = fake({
    status: 200,
    body: { ...run, unlocked: [], collections_done: [] },
  });
  await tellUnlocked(API, "token", KEY, null, { fetchFn: silver, key: null });
  expect(told).toHaveBeenLastCalledWith({
    shapeIds: [],
    keptAt: null,
    editions: [{ shapeId: "lightning", edition: "silver" }],
    collectionsDone: [],
  });
  const { editions: _e, collections_done: _c, ...older } = run;
  await tellUnlocked(API, "token", KEY, 5, {
    fetchFn: fake({ status: 200, body: older }),
    key: null,
  });
  expect(told).toHaveBeenLastCalledWith({
    shapeIds: ["triangle"],
    keptAt: 5,
    editions: [],
    collectionsDone: [],
  });
  // A wrong edition is let go, not shown.
  await tellUnlocked(API, "token", KEY, null, {
    fetchFn: fake({
      status: 200,
      body: {
        ...run,
        unlocked: [],
        editions: [{ shape_id: "x", edition: "platinum" }],
      },
    }),
    key: null,
  });
  expect(told).toHaveBeenLastCalledWith({
    shapeIds: [],
    keptAt: null,
    editions: [],
    collectionsDone: ["geometry"],
  });
});

test("an API before the game, or one that cannot be reached, tells nothing", async () => {
  await tellUnlocked(API, "token", KEY, null, {
    fetchFn: fake({ status: 404, body: apiError("http_error") }),
    key: null,
  });
  await tellUnlocked(API, "token", KEY, null, {
    fetchFn: fake(new Error("offline")),
    key: null,
  });
  expect(told).not.toHaveBeenCalled();
});
