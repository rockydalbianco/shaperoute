/**
 * One live link (TASK-424 part B1, ADR-0352): the queue of points, the
 * rhythm of the updates, the states, a 410, the stop. A clock in hand and
 * an API that answers what the test says.
 */
import type { LiveShare, LiveUpdate } from "@shaperoute/shared-types";

import type { LiveAnswer } from "./liveShareApi";
import {
  FINISH_TRIES,
  type LiveEnd,
  LiveSharer,
  POINTS_PER_UPDATE,
  QUEUE_MAX,
} from "./liveSharer";

const T0 = Date.parse("2026-11-09T07:00:00Z");

type Rig = {
  sharer: LiveSharer;
  sent: LiveUpdate[];
  stops: number;
  ends: LiveEnd[];
  clock: { now: number };
  state: { paused: boolean };
  answers: LiveAnswer<LiveShare>[];
  stopAnswers: LiveAnswer<null>[];
};

const OK: LiveAnswer<LiveShare> = {
  kind: "ok",
  value: { id: "s1", status: "live", expires_at: "2026-11-10T07:00:00Z" },
};
const OFFLINE: LiveAnswer<never> = { kind: "retry", status: null };

function rig(): Rig {
  const r: Rig = {
    sent: [],
    stops: 0,
    ends: [],
    clock: { now: T0 },
    state: { paused: false },
    answers: [],
    stopAnswers: [],
  } as unknown as Rig;
  r.sharer = new LiveSharer({
    update: async (update) => {
      r.sent.push(update);
      return r.answers.shift() ?? OK;
    },
    stop: async () => {
      r.stops += 1;
      return r.stopAnswers.shift() ?? { kind: "ok", value: null };
    },
    stats: () => ({ distance_m: 120, duration_s: 40 }),
    state: () => (r.state.paused ? "paused" : "live"),
    now: () => r.clock.now,
    onEnd: (why) => r.ends.push(why),
  });
  return r;
}

/** `seconds` after T0, a point a few metres further each second. */
function pointAt(r: Rig, seconds: number): void {
  r.sharer.point(46 + seconds / 100_000, 11.1, T0 + seconds * 1000);
}

async function at(r: Rig, seconds: number): Promise<void> {
  r.clock.now = T0 + seconds * 1000;
  await r.sharer.tick();
}

test("the first update goes at once, then one every 15 s while moving", async () => {
  const r = rig();
  await at(r, 0);
  expect(r.sent).toHaveLength(1);
  expect(r.sent[0]).toEqual({
    points: [],
    stats: { distance_m: 120, duration_s: 40 },
    state: "live",
  });
  await at(r, 14);
  expect(r.sent).toHaveLength(1);
  await at(r, 15);
  expect(r.sent).toHaveLength(2);
  await at(r, 29);
  await at(r, 30);
  expect(r.sent).toHaveLength(3);
});

test("a point every 5 s at most, with its time, sent once", async () => {
  const r = rig();
  await at(r, 0);
  for (let s = 1; s <= 15; s += 1) {
    pointAt(r, s);
  }
  await at(r, 15);
  const points = r.sent[1].points;
  expect(points.map((p) => p.at)).toEqual([
    "2026-11-09T07:00:01.000Z",
    "2026-11-09T07:00:06.000Z",
    "2026-11-09T07:00:11.000Z",
  ]);
  expect(points[0]).toEqual({
    lat: 46.00001,
    lon: 11.1,
    at: "2026-11-09T07:00:01.000Z",
  });
  expect(r.sharer.waiting).toBe(0);
  await at(r, 30);
  expect(r.sent[2].points).toEqual([]);
});

test("a fix older than the last one kept is left out", async () => {
  const r = rig();
  pointAt(r, 10);
  pointAt(r, 4);
  expect(r.sharer.waiting).toBe(1);
});

test("a pause goes at once, then every 60 s, without points; a resume at once", async () => {
  const r = rig();
  await at(r, 0);
  pointAt(r, 3);
  r.state.paused = true;
  await at(r, 4);
  expect(r.sent).toHaveLength(2);
  expect(r.sent[1].state).toBe("paused");
  // The point taken before the pause goes with it.
  expect(r.sent[1].points).toHaveLength(1);
  // Paused, the fixes are not of the activity.
  pointAt(r, 20);
  await at(r, 30);
  await at(r, 63);
  expect(r.sent).toHaveLength(2);
  await at(r, 64);
  expect(r.sent).toHaveLength(3);
  expect(r.sent[2]).toMatchObject({ state: "paused", points: [] });
  r.state.paused = false;
  await at(r, 70);
  expect(r.sent).toHaveLength(4);
  expect(r.sent[3].state).toBe("live");
});

test("without network the points wait, and go with the next update", async () => {
  const r = rig();
  await at(r, 0);
  r.answers.push(OFFLINE, OFFLINE);
  for (let s = 5; s <= 40; s += 5) {
    pointAt(r, s);
  }
  await at(r, 15);
  // A failed update does not come back at each tick: 15 s again.
  await at(r, 20);
  await at(r, 30);
  expect(r.sent).toHaveLength(3);
  expect(r.sharer.waiting).toBe(8);
  await at(r, 45);
  expect(r.sent[3].points).toHaveLength(8);
  expect(r.sharer.waiting).toBe(0);
});

test("the queue keeps the newest 500 points; 200 per update, the rest at once", async () => {
  const r = rig();
  r.answers.push(OFFLINE);
  await at(r, 0);
  for (let i = 1; i <= QUEUE_MAX + 100; i += 1) {
    pointAt(r, i * 5);
  }
  expect(r.sharer.waiting).toBe(QUEUE_MAX);
  await at(r, 15);
  expect(r.sent[1].points).toHaveLength(POINTS_PER_UPDATE);
  // The oldest 100 went: the first point left is the 101st.
  expect(r.sent[1].points[0].at).toBe(new Date(T0 + 101 * 5000).toISOString());
  // A full update leaves more behind: the next goes at the next tick.
  await at(r, 16);
  expect(r.sent[2].points).toHaveLength(POINTS_PER_UPDATE);
  await at(r, 17);
  expect(r.sent[3].points).toHaveLength(QUEUE_MAX - 2 * POINTS_PER_UPDATE);
  expect(r.sharer.waiting).toBe(0);
  await at(r, 18);
  expect(r.sent).toHaveLength(4);
});

test("points refused for good (422) are not sent again", async () => {
  const r = rig();
  await at(r, 0);
  pointAt(r, 5);
  r.answers.push({ kind: "rejected", status: 422 });
  await at(r, 15);
  expect(r.sharer.waiting).toBe(0);
  expect(r.sharer.ended).toBeNull();
});

test("a 410 ends the link here too: nothing more is sent", async () => {
  const r = rig();
  await at(r, 0);
  pointAt(r, 5);
  r.answers.push({ kind: "ended" });
  await at(r, 15);
  expect(r.ends).toEqual(["ended"]);
  expect(r.sharer.ended).toBe("ended");
  expect(r.sharer.waiting).toBe(0);
  pointAt(r, 20);
  await at(r, 60);
  expect(r.sent).toHaveLength(2);
});

test("an answer that says the link is over ends it", async () => {
  const r = rig();
  r.answers.push({
    kind: "ok",
    value: { id: "s1", status: "expired", expires_at: "2026-11-10T07:00:00Z" },
  });
  await at(r, 0);
  expect(r.ends).toEqual(["ended"]);
});

test("the end sends `finished` with the points left, then the link is over", async () => {
  const r = rig();
  await at(r, 0);
  pointAt(r, 5);
  r.clock.now = T0 + 8000;
  await r.sharer.finish();
  expect(r.sent[1]).toMatchObject({ state: "finished" });
  expect(r.sent[1].points).toHaveLength(1);
  expect(r.ends).toEqual(["finished"]);
  // After the end, fixes and ticks send nothing.
  pointAt(r, 20);
  await at(r, 60);
  expect(r.sent).toHaveLength(2);
});

test("an end that cannot go is tried again every 15 s, a few times", async () => {
  const r = rig();
  await at(r, 0);
  r.answers.push(OFFLINE, OFFLINE, OFFLINE, OFFLINE, OFFLINE);
  r.clock.now = T0 + 1000;
  await r.sharer.finish();
  expect(r.ends).toEqual([]);
  await at(r, 10);
  expect(r.sent).toHaveLength(2);
  for (let i = 1; i < FINISH_TRIES; i += 1) {
    await at(r, 1 + 15 * i);
  }
  expect(r.sent).toHaveLength(1 + FINISH_TRIES);
  expect(r.sent.slice(1).every((u) => u.state === "finished")).toBe(true);
  expect(r.ends).toEqual(["finished"]);
});

test("stop: over at once, the DELETE, and once more if the network was away", async () => {
  const r = rig();
  await at(r, 0);
  pointAt(r, 5);
  r.stopAnswers.push(OFFLINE);
  await r.sharer.stop();
  expect(r.ends).toEqual(["stopped"]);
  expect(r.stops).toBe(2);
  expect(r.sharer.waiting).toBe(0);
  await at(r, 30);
  expect(r.sent).toHaveLength(1);
  // Stopped twice, stopped once.
  await r.sharer.stop();
  expect(r.stops).toBe(2);
});

test("stopped while an update is on its way: its answer changes nothing", async () => {
  const r = rig();
  let answer: (value: LiveAnswer<LiveShare>) => void = () => {};
  const slow = new LiveSharer({
    update: () =>
      new Promise((resolve) => {
        answer = resolve;
      }),
    stop: async () => ({ kind: "ok", value: null }),
    stats: () => ({}),
    state: () => "live",
    now: () => T0,
    onEnd: (why) => r.ends.push(why),
  });
  const flight = slow.tick();
  await slow.stop();
  answer({ kind: "ended" });
  await flight;
  expect(r.ends).toEqual(["stopped"]);
});

test("one update at a time: a tick while one is on its way sends nothing", async () => {
  let calls = 0;
  let answer: (value: LiveAnswer<LiveShare>) => void = () => {};
  const clock = { now: T0 };
  const sharer = new LiveSharer({
    update: () => {
      calls += 1;
      return new Promise((resolve) => {
        answer = resolve;
      });
    },
    stop: async () => ({ kind: "ok", value: null }),
    stats: () => ({}),
    state: () => "live",
    now: () => clock.now,
    onEnd: () => {},
  });
  const first = sharer.tick();
  clock.now = T0 + 20_000;
  void sharer.tick();
  expect(calls).toBe(1);
  answer(OK);
  await first;
  void sharer.tick();
  expect(calls).toBe(2);
});
