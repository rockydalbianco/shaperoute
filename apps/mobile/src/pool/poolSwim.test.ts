import request from "@shaperoute/shared-types/fixtures/pool-swim.json";

import {
  activeMs,
  DEFAULT_PACE_S_PER_100,
  estimateLengths,
  finishPoolSwim,
  isPaused,
  isPoolLength,
  isTooFast,
  newPoolSwim,
  pacePer100S,
  parseLengths,
  parsePoolLength,
  pausePoolSwim,
  poolMetres,
  poolSwimRequest,
  resumePoolSwim,
} from "./poolSwim";

// TASK-400 part B, ADR-0334 point 3: the clock, the estimate, the metres
// and the pace of a swim in a pool.

const T0 = Date.parse(request.started_at);
const MIN = 60_000;

function theFixture() {
  // 42 minutes with a pause of 2 from minute 20, as fixtures/pool-swim.json.
  let swim = newPoolSwim("key12345abc", 25, T0);
  swim = pausePoolSwim(swim, T0 + 20 * MIN);
  swim = resumePoolSwim(swim, T0 + 22 * MIN);
  return finishPoolSwim(swim, T0 + 42 * MIN);
}

test("the time is the clock's without the pauses", () => {
  let swim = newPoolSwim("k", 25, T0);
  expect(activeMs(swim, T0 + 5 * MIN)).toBe(5 * MIN);
  swim = pausePoolSwim(swim, T0 + 5 * MIN);
  expect(isPaused(swim)).toBe(true);
  expect(activeMs(swim, T0 + 8 * MIN)).toBe(5 * MIN);
  swim = resumePoolSwim(swim, T0 + 8 * MIN);
  expect(isPaused(swim)).toBe(false);
  expect(activeMs(swim, T0 + 10 * MIN)).toBe(7 * MIN);
});

test("«Stop» in a pause ends it there, and the time stops", () => {
  let swim = pausePoolSwim(newPoolSwim("k", 25, T0), T0 + 10 * MIN);
  swim = finishPoolSwim(swim, T0 + 12 * MIN);
  expect(swim.endedMs).toBe(T0 + 12 * MIN);
  expect(isPaused(swim)).toBe(false);
  expect(activeMs(swim, T0 + 60 * MIN)).toBe(10 * MIN);
  // Ended, nothing changes it.
  expect(pausePoolSwim(swim, T0 + 13 * MIN)).toBe(swim);
});

test("metres are lengths times the pool, the pace time × 100 / metres", () => {
  expect(poolMetres(60, 25)).toBe(1500);
  expect(poolMetres(30, 33.33)).toBe(1000);
  expect(pacePer100S(40 * 60, 1500)).toBe(160);
  expect(pacePer100S(600, 0)).toBeNull();
});

test("the estimate goes by the pace of before, or 2:00 /100 m", () => {
  // 40 minutes at 2:00 /100 m in 25 m: 2400 / 30 = 80 lengths.
  expect(DEFAULT_PACE_S_PER_100).toBe(120);
  expect(estimateLengths(2400, 25, null)).toBe(80);
  // At 1:40 /100 m: 2400 / 25 = 96.
  expect(estimateLengths(2400, 25, 100)).toBe(96);
  expect(estimateLengths(2400, 50, 100)).toBe(48);
  // From 1 to 1000.
  expect(estimateLengths(5, 50, null)).toBe(1);
  expect(estimateLengths(24 * 3600, 10, 30)).toBe(1000);
});

test("the pool is 10 to 100 m, to the centimetre", () => {
  expect(parsePoolLength("25")).toBe(25);
  expect(parsePoolLength("33,33")).toBe(33.33);
  expect(parsePoolLength(" 33.33 ")).toBe(33.33);
  expect(parsePoolLength("10")).toBe(10);
  expect(parsePoolLength("100")).toBe(100);
  expect(parsePoolLength("9.99")).toBeNull();
  expect(parsePoolLength("100.01")).toBeNull();
  expect(parsePoolLength("33.333")).toBeNull();
  expect(parsePoolLength("")).toBeNull();
  expect(parsePoolLength("2x")).toBeNull();
  expect(isPoolLength(33.33)).toBe(true);
  expect(isPoolLength(33.333)).toBe(false);
});

test("the lengths are 1 to 1000", () => {
  expect(parseLengths("60")).toBe(60);
  expect(parseLengths("1000")).toBe(1000);
  expect(parseLengths("0")).toBeNull();
  expect(parseLengths("1001")).toBeNull();
  expect(parseLengths("6.5")).toBeNull();
  expect(parseLengths("")).toBeNull();
});

test("faster than 2.5 m/s is too fast, as the API says", () => {
  // 100 m in 40 s is 2.5 m/s: still taken; in 39 s not.
  expect(isTooFast(40, 100)).toBe(false);
  expect(isTooFast(39, 100)).toBe(true);
  expect(isTooFast(0, 25)).toBe(true);
});

test("the body sent is the API's example", () => {
  expect(poolSwimRequest(theFixture(), 60)).toEqual({
    ...request,
    started_at: new Date(T0).toISOString(),
    ended_at: new Date(T0 + 42 * MIN).toISOString(),
  });
});

test("no body before the end, nor for lengths the API refuses", () => {
  expect(poolSwimRequest(newPoolSwim("k", 25, T0), 10)).toBeNull();
  expect(poolSwimRequest(theFixture(), 0)).toBeNull();
  // 40 minutes, 1000 lengths of 25 m: 25 km, past 2.5 m/s.
  expect(poolSwimRequest(theFixture(), 1000)).toBeNull();
});
