import { File, Paths } from "expo-file-system";

import { activityKey } from "../activities/activityKey";
import type { SavedRun } from "../navigation/trackStore";
import {
  clearSkiDay,
  DAY_MS,
  dropPending,
  loadDayResort,
  loadGear,
  loadPending,
  loadSnow,
  onSkiDayChange,
  queueSkiDay,
  requestOf,
  saveDayResort,
  saveGear,
  saveSnow,
  SKI_DAY_FILE,
} from "./skiDayStore";

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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

// What the skier gives of a day (TASK-406 part D2), on the phone.

const NOW = 1_793_610_000_000;
const RESORT = { id: "aaa1", name: "Alpe Bianca" };
const FIRST = { point: [46.38, 11.52] as [number, number], timeMs: NOW - 3_600_000 };
const RUN = { track: { fixes: [FIRST] } } as unknown as SavedRun;

beforeEach(() => {
  const file = new File(Paths.document, SKI_DAY_FILE);
  if (file.exists) {
    file.delete();
  }
});

test("a resort chosen today is the day's; one of another day is not", () => {
  expect(loadDayResort(NOW)).toBeNull();
  saveDayResort(RESORT, NOW);
  expect(loadDayResort(NOW + 1000)).toEqual({ ...RESORT, at: NOW });
  expect(loadDayResort(NOW + DAY_MS)).toBeNull();
});

test("«Save» queues the day's choices under the run's key; the gear stays", () => {
  saveDayResort(RESORT, NOW);
  saveSnow("powder");
  saveGear("  Ski   Atomic  Redster ");
  queueSkiDay(RUN, NOW);
  expect(loadPending()).toEqual([
    {
      key: activityKey(FIRST),
      at: NOW,
      request: { resort_id: "aaa1", gear: "Ski Atomic Redster", snow: "powder" },
    },
  ]);
  clearSkiDay();
  expect(loadDayResort(NOW)).toBeNull();
  expect(loadSnow()).toBeNull();
  expect(loadGear()).toBe("  Ski   Atomic  Redster ");
  // Saved again, the same day is queued once.
  queueSkiDay(RUN, NOW + 1);
  expect(loadPending()).toHaveLength(1);
  expect(loadPending()[0].request).toEqual({
    resort_id: null,
    gear: "Ski Atomic Redster",
    snow: null,
  });
  dropPending(activityKey(FIRST));
  expect(loadPending()).toEqual([]);
});

test("a day with nothing given queues nothing", () => {
  queueSkiDay(RUN, NOW);
  expect(loadPending()).toEqual([]);
  expect(requestOf({ resort: null, snow: null, gear: "   " })).toBeNull();
});

test("an old resort is not sent with today's day", () => {
  saveDayResort(RESORT, NOW - DAY_MS - 1);
  saveSnow("icy");
  queueSkiDay(RUN, NOW);
  expect(loadPending()[0].request.resort_id).toBeNull();
});

test("every change is told", () => {
  const told = jest.fn();
  const stop = onSkiDayChange(told);
  saveSnow("spring");
  saveGear("Snowboard");
  stop();
  saveSnow(null);
  expect(told).toHaveBeenCalledTimes(2);
});

test("a broken file is an empty day", () => {
  const file = new File(Paths.document, SKI_DAY_FILE);
  file.create({ overwrite: true });
  file.write("{not json");
  expect(loadDayResort(NOW)).toBeNull();
  expect(loadPending()).toEqual([]);
  expect(loadGear()).toBe("");
});
