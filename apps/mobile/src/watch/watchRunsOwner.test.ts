import { readFileSync } from "fs";
import path from "path";

import { setCurrentOwner } from "../account/currentOwner";
import type { WatchFile } from "./watchLink";
import {
  forgetWatchRunsOf,
  pendingWatchRuns,
  receiveWatchFile,
  subscribeWatchRuns,
  WATCH_RUNS_KEPT,
  type WatchRunDoors,
} from "./watchRuns";

// A workout of the watch belongs to the account signed in when it came
// (TASK-507 part B, «Nascosta finché rientra»): the card of another account
// does not show it, and another account's workouts never push it out.

const TRACKS = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "targets",
      "watch",
      "Core",
      "Fixtures",
      "tracks.json",
    ),
    "utf8",
  ),
) as { valid: { json: Record<string, unknown> }[] };
const FREE = TRACKS.valid[1].json;

/** Doors with a store in memory and as many files as asked. */
function doors(): WatchRunDoors {
  let kept: unknown[] = [];
  let now = 1000;
  return {
    store: {
      load: () => kept as never[],
      save: (list) => {
        kept = list;
        return true;
      },
    },
    read: (url) => (url.startsWith("file:///") ? JSON.stringify(FREE) : null),
    remove: () => {},
    notify: () => Promise.resolve(),
    now: () => (now += 1000),
  };
}

function file(id: string): WatchFile {
  return { id, url: `file:///${id}`, metadata: { type: "track", v: 1 } };
}

const done = () => ({ done: jest.fn() });

beforeEach(() => {
  setCurrentOwner(null);
});

test("A's workout from the watch waits hidden while B is signed in", async () => {
  const fake = doors();
  setCurrentOwner(11);
  await receiveWatchFile(file("a"), done(), fake);
  setCurrentOwner(22);
  expect(pendingWatchRuns(fake)).toEqual([]);
  await receiveWatchFile(file("b"), done(), fake);
  expect(pendingWatchRuns(fake).map((run) => run.id)).toEqual(["b"]);
  setCurrentOwner(11);
  expect(pendingWatchRuns(fake).map((run) => run.id)).toEqual(["a"]);
  setCurrentOwner(null);
  expect(pendingWatchRuns(fake)).toEqual([]);
});

test("one that came with nobody signed in is anyone's", async () => {
  const fake = doors();
  await receiveWatchFile(file("x"), done(), fake);
  setCurrentOwner(22);
  expect(pendingWatchRuns(fake).map((run) => run.id)).toEqual(["x"]);
});

test("B's many workouts never push A's out", async () => {
  const fake = doors();
  setCurrentOwner(11);
  await receiveWatchFile(file("a"), done(), fake);
  setCurrentOwner(22);
  for (let i = 0; i < WATCH_RUNS_KEPT + 2; i += 1) {
    await receiveWatchFile(file(`b${i}`), done(), fake);
  }
  expect(pendingWatchRuns(fake)).toHaveLength(WATCH_RUNS_KEPT);
  setCurrentOwner(11);
  expect(pendingWatchRuns(fake).map((run) => run.id)).toEqual(["a"]);
});

test("the card hears of another account, and an account deleted takes its own", async () => {
  const fake = doors();
  const told = jest.fn();
  const stop = subscribeWatchRuns(told);
  setCurrentOwner(11);
  expect(told).toHaveBeenCalled();
  await receiveWatchFile(file("a"), done(), fake);
  setCurrentOwner(22);
  await receiveWatchFile(file("b"), done(), fake);
  forgetWatchRunsOf(11, fake);
  setCurrentOwner(11);
  expect(pendingWatchRuns(fake)).toEqual([]);
  setCurrentOwner(22);
  expect(pendingWatchRuns(fake).map((run) => run.id)).toEqual(["b"]);
  stop();
});
