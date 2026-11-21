import type { SleepSample, SleepStage } from "./sleepNight";
import {
  dayOf,
  EARLIER_NIGHTS,
  lastNightOf,
  readLastNight,
  sleepHistoryFromMs,
  type SleepReader,
} from "./sleepSamples";

// «Sleep last night» (TASK-467 part B2): from the samples to the night
// before an activity, as its post says it. Every time is on the phone's
// clock, as the functions read it: the tests hold in any time zone.

const MIN = 60_000;

/** A moment of 21 September 2026, `days` days on, on the phone's clock. */
function at(days: number, hour: number, minute = 0): number {
  return new Date(2026, 8, 21 + days, hour, minute).getTime();
}

function span(
  fromMs: number,
  minutes: number,
  stage: SleepStage = "asleep",
): SleepSample {
  return { fromMs, toMs: fromMs + minutes * MIN, stage };
}

/** A night that ends in the day `days`: asleep at 23:00 the evening before
 * (`lateMin` minutes later), for `minutes`. */
function nightOf(days: number, minutes = 450, lateMin = 0): SleepSample {
  return span(at(days - 1, 23, lateMin), minutes);
}

test("the night before a morning run is the one woken up from that day", () => {
  const found = lastNightOf([nightOf(0)], at(0, 7, 30));
  expect(found).toEqual({
    night: "2026-09-21",
    // 7 h 30 min of 8 for the 50 points, no time awake for the 20: of 70.
    score: Math.round(((50 * (450 - 240)) / 240 + 20) / 0.7),
    asleep_min: 450,
    awake_min: 0,
  });
});

test("an evening run has the night of that morning, not a nap after it", () => {
  const samples = [nightOf(0), span(at(0, 19), 90)];
  expect(lastNightOf(samples, at(0, 21))?.asleep_min).toBe(450);
  // A nap in the afternoon is in the day's samples, and is not the night.
  const napped = [nightOf(0), span(at(0, 14), 70)];
  expect(lastNightOf(napped, at(0, 18, 30))?.asleep_min).toBe(450);
});

test("no night in the day's samples: nothing to show", () => {
  expect(lastNightOf([], at(0, 9))).toBeNull();
  // The night of two days before is not last night.
  expect(lastNightOf([nightOf(-1)], at(0, 9))).toBeNull();
  // Less than an hour of sleep is no night.
  expect(lastNightOf([span(at(-1, 23), 40)], at(0, 9))).toBeNull();
});

test("a run in the small hours, before any sleep, has the night before", () => {
  const found = lastNightOf([nightOf(-1)], at(0, 1, 30));
  expect(found?.night).toBe("2026-09-20");
  // After six the day has begun: with no sleep in it there is no night.
  expect(lastNightOf([nightOf(-1)], at(0, 6))).toBeNull();
  // Slept before the small hours' run: that is the night.
  const short = [nightOf(-1), span(at(-1, 21), 180)];
  expect(lastNightOf(short, at(0, 1, 30))).toMatchObject({
    night: "2026-09-21",
    asleep_min: 180,
  });
});

test("sleep still going when the activity begins counts up to then", () => {
  // Asleep 23:00–07:00, the activity said to begin at 05:00.
  const found = lastNightOf([span(at(-1, 23), 480)], at(0, 5));
  expect(found?.asleep_min).toBe(360);
});

test("the stages are whole minutes, never more than the sleep", () => {
  const from = at(-1, 23);
  // Three stages of 100.5 minutes each: 301.5 asleep, rounded to 302, and
  // each stage rounded apart would be 101, 303 in all.
  const part = 100.5 * MIN;
  const samples: SleepSample[] = [
    { fromMs: from, toMs: from + part, stage: "rem" },
    { fromMs: from + part, toMs: from + 2 * part, stage: "light" },
    { fromMs: from + 2 * part, toMs: from + 3 * part, stage: "deep" },
  ];
  const found = lastNightOf(samples, at(0, 8));
  expect(found?.asleep_min).toBe(302);
  const stages = found?.stages;
  expect(stages).toEqual({ rem_min: 101, light_min: 100, deep_min: 101 });
});

test("a night without told stages leaves them out", () => {
  const found = lastNightOf([nightOf(0)], at(0, 8));
  expect(found).not.toBeNull();
  expect("stages" in (found ?? {})).toBe(false);
});

test("time awake in the night lowers the score, and is told", () => {
  const from = at(-1, 23);
  const samples = [
    span(from, 200, "light"),
    span(from + 200 * MIN, 30, "awake"),
    span(from + 230 * MIN, 250, "deep"),
  ];
  const found = lastNightOf(samples, at(0, 8));
  expect(found).toMatchObject({ asleep_min: 450, awake_min: 30 });
  expect(found?.score).toBeLessThan(lastNightOf([nightOf(0)], at(0, 8))?.score ?? 0);
});

test("with enough nights before, the usual bedtime counts", () => {
  const usual = [1, 2, 3, 4].map((back) => nightOf(-back));
  // In bed as usual: all the 30 points of the bedtime.
  const regular = lastNightOf([...usual, nightOf(0)], at(0, 8));
  // Two hours later than usual: none of them.
  const late = lastNightOf([...usual, nightOf(0, 450, 120)], at(0, 11));
  expect(regular?.asleep_min).toBe(late?.asleep_min);
  expect((regular?.score ?? 0) - (late?.score ?? 0)).toBe(30);
});

test("the history asked for reaches the nights the bedtime is taken from", () => {
  const atMs = at(0, 8);
  const days = (atMs - sleepHistoryFromMs(atMs)) / (24 * 60 * MIN);
  expect(days).toBeGreaterThan(EARLIER_NIGHTS + 1);
  expect(days).toBeLessThan(EARLIER_NIGHTS + 3);
});

test("the day is the phone's calendar's", () => {
  expect(dayOf(at(0, 0, 5))).toBe("2026-09-21");
  expect(dayOf(at(0, 23, 55))).toBe("2026-09-21");
  expect(dayOf(new Date(2027, 0, 3, 7).getTime())).toBe("2027-01-03");
});

function reader(changes: Partial<SleepReader> = {}): SleepReader {
  return {
    store: "apple",
    available: async () => true,
    ask: async () => {},
    samples: async () => [nightOf(0)],
    ...changes,
  };
}

test("the reader is asked once, for the history up to the activity", async () => {
  const samples = jest.fn(async () => [nightOf(0)]);
  const atMs = at(0, 8);
  const found = await readLastNight(reader({ samples }), atMs);
  expect(found?.night).toBe("2026-09-21");
  expect(samples).toHaveBeenCalledTimes(1);
  expect(samples).toHaveBeenCalledWith(sleepHistoryFromMs(atMs), atMs);
});

test("no health data, or a reader that fails: no night", async () => {
  const samples = jest.fn(async () => [nightOf(0)]);
  const none = await readLastNight(
    reader({ available: async () => false, samples }),
    at(0, 8),
  );
  expect(none).toBeNull();
  expect(samples).not.toHaveBeenCalled();
  const failed = reader({
    samples: async () => {
      throw new Error("no");
    },
  });
  expect(await readLastNight(failed, at(0, 8))).toBeNull();
  // A refusal reads as no samples.
  expect(await readLastNight(reader({ samples: async () => [] }), at(0, 8))).toBeNull();
});
