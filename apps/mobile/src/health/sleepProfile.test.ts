import type { SleepSample } from "./sleepNight";
import {
  keepSleepShareConfirmed,
  loadSleepShareConfirmed,
  readOwnNight,
  SLEEP_SHARE_FILE,
} from "./sleepProfile";
import { sleepHistoryFromMs, type SleepReader } from "./sleepSamples";

// Last night for the «Sleep» card of the profile (TASK-467 part B3). Every
// time is on the phone's clock: the tests hold in any time zone.

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

beforeEach(() => {
  files.clear();
});

const MIN = 60_000;

/** A moment of 21 September 2026, `days` days on, on the phone's clock. */
function at(days: number, hour: number, minute = 0): number {
  return new Date(2026, 8, 21 + days, hour, minute).getTime();
}

/** Asleep at 23:00 the evening before the day `days`, for 7 h 30 min. */
function nightOf(days: number): SleepSample {
  const fromMs = at(days - 1, 23);
  return { fromMs, toMs: fromMs + 450 * MIN, stage: "asleep" };
}

function reader(changes: Partial<SleepReader> = {}): SleepReader & {
  ask: jest.Mock;
  samples: jest.Mock;
} {
  return {
    store: "apple",
    available: async () => true,
    ask: jest.fn(async () => {}),
    samples: jest.fn(async (): Promise<SleepSample[]> => [nightOf(0)]),
    ...changes,
  } as SleepReader & { ask: jest.Mock; samples: jest.Mock };
}

test("at the tap the phone asks, then reads the night woken up from today", async () => {
  const phone = reader();
  const now = at(0, 9);
  const found = await readOwnNight(phone, now, true);
  expect(found).toEqual({
    kind: "night",
    night: expect.objectContaining({ night: "2026-09-21", asleep_min: 450 }),
  });
  expect(phone.ask).toHaveBeenCalledTimes(1);
  // The nights before, for the usual bedtime, and nothing after now.
  expect(phone.samples).toHaveBeenCalledWith(sleepHistoryFromMs(now), now);
});

test("when the profile opens again nothing is asked", async () => {
  const phone = reader();
  await readOwnNight(phone, at(0, 9), false);
  expect(phone.ask).not.toHaveBeenCalled();
  expect(phone.samples).toHaveBeenCalledTimes(1);
});

test("no sleep since the evening: no night, not yesterday's", async () => {
  const phone = reader({ samples: jest.fn(async () => [nightOf(-1)]) });
  expect(await readOwnNight(phone, at(0, 9), false)).toEqual({ kind: "none" });
});

test("a phone without health data, or a reading that fails, cannot read", async () => {
  const none = reader({ available: async () => false });
  expect(await readOwnNight(none, at(0, 9), true)).toEqual({ kind: "refused" });
  expect(none.ask).not.toHaveBeenCalled();
  const refusing = reader({
    ask: jest.fn(async () => {
      throw new Error("denied");
    }),
  });
  expect(await readOwnNight(refusing, at(0, 9), true)).toEqual({ kind: "refused" });
  expect(refusing.samples).not.toHaveBeenCalled();
  const failing = reader({
    samples: jest.fn(async () => {
      throw new Error("locked");
    }),
  });
  expect(await readOwnNight(failing, at(0, 9), false)).toEqual({ kind: "refused" });
});

test("the first «Share» is confirmed once, in a file of its own", () => {
  expect(loadSleepShareConfirmed()).toBe(false);
  keepSleepShareConfirmed();
  expect(loadSleepShareConfirmed()).toBe(true);
  expect(files.get(`file:///documents/${SLEEP_SHARE_FILE}`)).toBe('{"confirmed":true}');
});

test("a file that does not read is no yes", () => {
  files.set(`file:///documents/${SLEEP_SHARE_FILE}`, "{not json");
  expect(loadSleepShareConfirmed()).toBe(false);
  files.set(`file:///documents/${SLEEP_SHARE_FILE}`, '{"confirmed":1}');
  expect(loadSleepShareConfirmed()).toBe(false);
});
