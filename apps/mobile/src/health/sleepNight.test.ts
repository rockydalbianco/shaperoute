import {
  type SleepSample,
  type SleepStage,
  sleepNight,
  sleepSpans,
  stageOfAppleValue,
} from "./sleepNight";

// TASK-467 part A, ADR-0379: the night MuW's sleep score is worked out
// from, out of the samples a watch or a phone wrote in Apple Health.

const T0 = Date.UTC(2026, 10, 10, 22);
const MIN = 60_000;

/** A sample from `from` to `to`, in minutes after T0. */
const span = (from: number, to: number, stage: SleepStage): SleepSample => ({
  fromMs: T0 + from * MIN,
  toMs: T0 + to * MIN,
  stage,
});

/** A night as a watch writes it: 450 minutes, 10 of them awake. */
const WATCH = [
  span(0, 60, "light"),
  span(60, 120, "deep"),
  span(120, 130, "awake"),
  span(130, 200, "rem"),
  span(200, 450, "light"),
];

const WATCH_NIGHT = {
  fromMs: T0,
  toMs: T0 + 450 * MIN,
  asleepMin: 440,
  awakeMin: 10,
  stages: { remMin: 70, lightMin: 310, deepMin: 60 },
};

test("a watch's night: asleep, awake in between and each stage", () => {
  expect(sleepNight(WATCH)).toEqual(WATCH_NIGHT);
});

test("the order of the samples does not matter", () => {
  expect(sleepNight([...WATCH].reverse())).toEqual(WATCH_NIGHT);
});

test("time awake before falling asleep and after the last waking is not the night", () => {
  expect(
    sleepNight([span(-20, 0, "awake"), ...WATCH, span(450, 470, "awake")]),
  ).toEqual(WATCH_NIGHT);
});

test("a second source over the same night is not counted twice", () => {
  // Another app wrote the whole night as sleep of no told stage: the
  // watch says more, its stages and its waking stay.
  expect(sleepNight([span(0, 450, "asleep"), ...WATCH])).toEqual(WATCH_NIGHT);
  expect(sleepNight([...WATCH, ...WATCH])).toEqual(WATCH_NIGHT);
});

test("where two sources tell a stage, the deeper one stays", () => {
  expect(
    sleepSpans([span(0, 100, "light"), span(40, 60, "deep"), span(50, 80, "rem")]),
  ).toEqual([
    span(0, 40, "light"),
    span(40, 60, "deep"),
    span(60, 80, "rem"),
    span(80, 100, "light"),
  ]);
});

test("a phone without a watch: the time asleep, no stages", () => {
  expect(sleepNight([span(0, 420, "asleep")])).toEqual({
    fromMs: T0,
    toMs: T0 + 420 * MIN,
    asleepMin: 420,
    awakeMin: 0,
    stages: null,
  });
});

test("time with no sample inside the night counts as awake", () => {
  expect(sleepNight([span(0, 200, "asleep"), span(230, 400, "asleep")])).toEqual({
    fromMs: T0,
    toMs: T0 + 400 * MIN,
    asleepMin: 370,
    awakeMin: 30,
    stages: null,
  });
});

test("a nap is not the night, before it or after it", () => {
  const before = span(-600, -560, "light");
  const after = span(520, 580, "light");
  expect(sleepNight([before, ...WATCH, after])).toEqual(WATCH_NIGHT);
});

test("a silence of an hour keeps the night whole, a longer one splits it", () => {
  expect(sleepNight([span(0, 200, "light"), span(260, 300, "light")])?.asleepMin).toBe(
    240,
  );
  expect(sleepNight([span(0, 200, "light"), span(261, 300, "light")])?.asleepMin).toBe(
    200,
  );
});

test("no night without sleep, or with less than an hour of it", () => {
  expect(sleepNight([])).toBeNull();
  expect(sleepNight([span(0, 300, "awake")])).toBeNull();
  expect(sleepNight([span(0, 59, "light")])).toBeNull();
  expect(sleepNight([span(0, 60, "light")])?.asleepMin).toBe(60);
});

test("samples with no length or no time are left out", () => {
  const bad: SleepSample[] = [
    span(100, 100, "deep"),
    span(300, 200, "deep"),
    { fromMs: Number.NaN, toMs: T0, stage: "deep" },
    { fromMs: T0, toMs: Number.POSITIVE_INFINITY, stage: "deep" },
  ];
  expect(sleepNight([...bad, ...WATCH])).toEqual(WATCH_NIGHT);
});

test("Apple Health's values: «in bed» and unknown ones say nothing", () => {
  expect([0, 1, 2, 3, 4, 5, 6, -1].map(stageOfAppleValue)).toEqual([
    null,
    "asleep",
    "awake",
    "light",
    "deep",
    "rem",
    null,
    null,
  ]);
});
