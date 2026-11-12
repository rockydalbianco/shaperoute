/**
 * The live link of the activity under way (TASK-424 part B1, ADR-0352):
 * made from the button, fed by the position task with the phone locked and
 * by the recording screen, ended by a 410, a stop or the end of the
 * activity. A swim in a pool and a workout at the gym (part B2): their
 * numbers with no points.
 */
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { LiveUpdate } from "@shaperoute/shared-types";

import { answers } from "../account/testing";
import { RUN_LOCATION_TASK, watchRunPosition } from "../navigation/runPosition";
import {
  addFix,
  emptyTrack,
  pauseTrack,
  type Track,
} from "../navigation/trackRecorder";
import {
  finishLiveShare,
  liveShareStatus,
  observeLiveNumbers,
  observeLiveShare,
  resetLiveShare,
  startLiveShare,
  stopLiveShare,
  subscribeLiveShare,
  TICK_MS,
} from "./liveShareStore";

jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  ActivityType: { Fitness: 3 },
  isBackgroundLocationAvailableAsync: jest.fn(async () => true),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  watchPositionAsync: jest.fn(),
}));
jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isAvailableAsync: jest.fn(async () => true),
}));

const [[, runTask]] = jest.mocked(TaskManager.defineTask).mock.calls;

const T0 = Date.parse("2026-11-09T07:00:00Z");
const API = "http://api";
const CREATED = {
  status: 201,
  body: {
    id: "s1",
    url: "https://getmuw.app/live/#AbCdEfGhIjKlMnOpQrStUv",
    expires_at: "2026-11-10T07:00:00Z",
  },
};
const LIVE = {
  status: 200,
  body: { id: "s1", status: "live", expires_at: "2026-11-10T07:00:00Z" },
};

type Fetch = ReturnType<typeof answers>;

function api(fetchFn: Fetch) {
  return {
    baseUrl: API,
    token: "tok",
    fetchFn: fetchFn as unknown as typeof fetch,
    key: null,
  };
}

/** The bodies of the updates sent so far. */
function updates(fetchFn: Fetch): LiveUpdate[] {
  return fetchFn.mock.calls
    .filter(([url]) => url.endsWith("/updates"))
    .map(([, init]) => JSON.parse(String(init?.body)) as LiveUpdate);
}

/** What iOS hands the task, `seconds` after T0. */
function fix(seconds: number, accuracy = 5): Location.LocationObject {
  return {
    coords: { latitude: 46 + seconds / 100_000, longitude: 11.1, accuracy },
    timestamp: T0 + seconds * 1000,
  } as Location.LocationObject;
}

function trackTo(seconds: number): Track {
  let track = emptyTrack();
  for (let s = 0; s <= seconds; s += 1) {
    track = addFix(track, {
      point: [46 + s / 10_000, 11.1],
      timeMs: T0 + s * 1000,
      accuracyM: 5,
    });
  }
  return track;
}

/** The clock moves `ms`, and what it starts gets its answers. */
async function wait(ms: number): Promise<void> {
  await jest.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  resetLiveShare();
});

afterEach(() => {
  resetLiveShare();
  jest.useRealTimers();
});

test("the button makes the link: the status says it, the first update goes at once", async () => {
  const fetchFn = answers(CREATED, LIVE);
  const seen: string[] = [];
  subscribeLiveShare(() => seen.push(liveShareStatus().kind));
  const outcome = await startLiveShare(api(fetchFn), "cycling");
  expect(outcome).toEqual({ kind: "started", id: "s1", url: CREATED.body.url });
  expect(seen).toEqual(["starting", "sharing"]);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    activity: "cycling",
  });
  await wait(0);
  expect(updates(fetchFn)).toEqual([
    {
      points: [],
      stats: {
        distance_m: 0,
        duration_s: 0,
        climb_m: null,
        kcal: null,
        heart_bpm: null,
      },
      state: "live",
    },
  ]);
});

test("a link that cannot be made leaves nothing on", async () => {
  const fetchFn = answers({ status: 503, body: {} });
  expect(await startLiveShare(api(fetchFn), "running")).toEqual({ kind: "failed" });
  expect(liveShareStatus()).toEqual({ kind: "off" });
  await wait(60_000);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test("a second link while one is on is refused", async () => {
  await startLiveShare(api(answers(CREATED, LIVE)), "running");
  expect(await startLiveShare(api(answers()), "running")).toEqual({ kind: "busy" });
});

test("with the phone locked, the position task's fixes go, one every 5 s, every 15 s", async () => {
  const watch = await watchRunPosition({ accuracy: 6 }, () => {});
  expect(watch.background).toBe(true);
  const fetchFn = answers(CREATED, LIVE, LIVE, LIVE);
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  for (let s = 1; s <= 15; s += 1) {
    jest.setSystemTime(T0 + s * 1000);
    // A fix too vague to be where the runner was is left out.
    await runTask({
      data: { locations: s === 6 ? [fix(s, 500)] : [fix(s)] },
      error: null,
      executionInfo: { eventId: String(s), taskName: RUN_LOCATION_TASK },
    });
  }
  await wait(0);
  const sent = updates(fetchFn);
  expect(sent).toHaveLength(2);
  expect(sent[1].points.map((p) => p.at)).toEqual([
    "2026-11-09T07:00:01.000Z",
    "2026-11-09T07:00:07.000Z",
    "2026-11-09T07:00:12.000Z",
  ]);
  watch.remove();
});

test("the screen's numbers go with the updates; a pause at once, then every 60 s", async () => {
  const fetchFn = answers(CREATED, LIVE, LIVE, LIVE, LIVE);
  const track = trackTo(30);
  jest.setSystemTime(T0 + 30_000);
  observeLiveShare({ track, kcal: 12, bpm: 141, paused: false });
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  expect(updates(fetchFn)[0].stats).toMatchObject({
    distance_m: Math.round(track.distanceM),
    duration_s: 30,
    kcal: 12,
    heart_bpm: 141,
  });
  await wait(2000);
  observeLiveShare({
    track: pauseTrack(track, T0 + 32_000),
    kcal: 12,
    bpm: 141,
    paused: true,
  });
  await wait(0);
  expect(updates(fetchFn)).toHaveLength(2);
  expect(updates(fetchFn)[1]).toMatchObject({ state: "paused" });
  // The time stands still in the pause, from where it began.
  expect(updates(fetchFn)[1].stats.duration_s).toBe(32);
  await wait(55_000);
  expect(updates(fetchFn)).toHaveLength(2);
  // The timer's next tick past the 60 s.
  await wait(2 * TICK_MS);
  expect(updates(fetchFn)).toHaveLength(3);
});

test("in the foreground only, the track's new fixes go to the link", async () => {
  const fetchFn = answers(CREATED, LIVE, LIVE);
  observeLiveShare({ track: trackTo(3), kcal: null, bpm: null, paused: false });
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  observeLiveShare({ track: trackTo(12), kcal: null, bpm: null, paused: false });
  await wait(15_000);
  // The fixes from before the link stay on the phone.
  expect(updates(fetchFn)[1].points.map((p) => p.at)).toEqual([
    "2026-11-09T07:00:04.000Z",
    "2026-11-09T07:00:09.000Z",
  ]);
});

test("a 410 ends the link: the status goes off and nothing more is sent", async () => {
  const fetchFn = answers(CREATED, { status: 410, body: { detail: "ended" } });
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  expect(liveShareStatus()).toEqual({ kind: "off" });
  await wait(120_000);
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("«Stop sharing»: off at once, then the DELETE", async () => {
  const fetchFn = answers(CREATED, LIVE, { status: 204 });
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  await stopLiveShare();
  expect(liveShareStatus()).toEqual({ kind: "off" });
  const [url, init] = fetchFn.mock.calls[2];
  expect(url).toBe(`${API}/me/live-shares/s1`);
  expect(init?.method).toBe("DELETE");
  await wait(120_000);
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

test("the end of the activity sends `finished`, with the time it ended", async () => {
  const fetchFn = answers(CREATED, LIVE, {
    status: 200,
    body: { id: "s1", status: "finished", expires_at: "2026-11-09T08:00:00Z" },
  });
  observeLiveShare({ track: trackTo(20), kcal: 5, bpm: null, paused: false });
  jest.setSystemTime(T0 + 20_000);
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  finishLiveShare();
  await wait(0);
  const last = updates(fetchFn)[1];
  expect(last.state).toBe("finished");
  expect(last.stats.duration_s).toBe(20);
  expect(liveShareStatus()).toEqual({ kind: "off" });
});

test("an end while the link is being made deletes it before anyone has it", async () => {
  let answer: (response: Response) => void = () => {};
  const fetchFn = jest.fn(
    (url: string, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        if (url.endsWith("/me/live-shares")) {
          answer = resolve;
        } else {
          resolve(new Response(null, { status: 204 }));
        }
      }),
  );
  const started = startLiveShare(
    {
      baseUrl: API,
      token: "tok",
      fetchFn: fetchFn as unknown as typeof fetch,
      key: null,
    },
    "running",
  );
  finishLiveShare();
  answer(Response.json(CREATED.body, { status: 201 }));
  expect(await started).toEqual({ kind: "failed" });
  await wait(0);
  expect(liveShareStatus()).toEqual({ kind: "off" });
  expect(fetchFn.mock.calls[1]).toEqual([
    `${API}/me/live-shares/s1`,
    expect.objectContaining({ method: "DELETE" }),
  ]);
});

test("without a link, fixes and numbers send nothing", async () => {
  const fetchFn = answers();
  observeLiveShare({ track: trackTo(30), kcal: 1, bpm: 120, paused: false });
  finishLiveShare();
  await wait(60_000);
  expect(fetchFn).not.toHaveBeenCalled();
});

test("a swim in a pool: the link names its pool, the updates carry its numbers and no points", async () => {
  const fetchFn = answers(CREATED, LIVE, LIVE, LIVE);
  const numbers = (atMs: number) => ({
    duration_s: Math.round((atMs - T0) / 1000),
    lengths: 3,
    kcal: null,
    heart_bpm: null,
  });
  observeLiveNumbers(numbers, false);
  jest.setSystemTime(T0 + 90_000);
  await startLiveShare(api(fetchFn), "swimming", 25);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    activity: "swimming",
    pool_length_m: 25,
  });
  await wait(0);
  expect(updates(fetchFn)).toEqual([
    {
      points: [],
      stats: { duration_s: 90, lengths: 3, kcal: null, heart_bpm: null },
      state: "live",
    },
  ]);
  // The clock is read at each update: 15 s on, with no new numbers.
  await wait(15_000);
  expect(updates(fetchFn)[1].stats.duration_s).toBe(105);
  // A pause goes at once.
  observeLiveNumbers(numbers, true);
  await wait(0);
  expect(updates(fetchFn)[2].state).toBe("paused");
});

test("the end of a recording without a track: `finished`, its time where it ended", async () => {
  const fetchFn = answers(CREATED, LIVE, {
    status: 200,
    body: { id: "s1", status: "finished", expires_at: "2026-11-09T08:00:00Z" },
  });
  observeLiveNumbers(
    (atMs) => ({
      duration_s: Math.round((atMs - T0) / 1000),
      kcal: 40,
      heart_bpm: null,
      exercise: "Squat",
    }),
    false,
  );
  jest.setSystemTime(T0 + 600_000);
  await startLiveShare(api(fetchFn), "gym");
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    activity: "gym",
  });
  await wait(0);
  finishLiveShare();
  await wait(5000);
  const last = updates(fetchFn)[1];
  expect(last).toEqual({
    points: [],
    stats: { duration_s: 600, kcal: 40, heart_bpm: null, exercise: "Squat" },
    state: "finished",
  });
  expect(liveShareStatus()).toEqual({ kind: "off" });
});

test("a run after a workout: its track's numbers again, not the workout's", async () => {
  const fetchFn = answers(CREATED, LIVE);
  observeLiveNumbers(() => ({ duration_s: 1, exercise: "Squat" }), false);
  const track = trackTo(10);
  jest.setSystemTime(T0 + 10_000);
  observeLiveShare({ track, kcal: null, bpm: null, paused: false });
  await startLiveShare(api(fetchFn), "running");
  await wait(0);
  expect(updates(fetchFn)[0].stats).toEqual({
    distance_m: Math.round(track.distanceM),
    duration_s: 10,
    climb_m: null,
    kcal: null,
    heart_bpm: null,
  });
});
