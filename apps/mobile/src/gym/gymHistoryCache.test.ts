import type { GymHistory } from "@shaperoute/shared-types";
import example from "@shaperoute/shared-types/fixtures/gym-history.json";

import {
  GYM_HISTORY_FILE,
  keepHistory,
  keptHistory,
  MAX_KEPT_HISTORIES,
} from "./gymHistoryCache";

// TASK-483 B: the last history of each exercise, kept for a gym without a
// network.

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
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const history = example as GymHistory;

beforeEach(() => files.clear());

test("a history kept is read back, for its account only", () => {
  expect(keptHistory(1, "bench_press")).toBeNull();
  keepHistory(1, "bench_press", history);
  expect(keptHistory(1, "bench_press")).toEqual(history);
  expect(keptHistory(2, "bench_press")).toBeNull();
  expect(keptHistory(1, "back_squat")).toBeNull();
  expect(files.has(`file:///documents/${GYM_HISTORY_FILE}`)).toBe(true);
});

test("a newer history takes the place of the old, and the oldest go", () => {
  keepHistory(1, "bench_press", history);
  keepHistory(1, "bench_press", { ...history, workouts_count: 9 });
  expect(keptHistory(1, "bench_press")?.workouts_count).toBe(9);
  for (let n = 0; n < MAX_KEPT_HISTORIES; n += 1) {
    keepHistory(1, `lift_${n}`, history);
  }
  expect(keptHistory(1, "bench_press")).toBeNull();
  expect(keptHistory(1, `lift_${MAX_KEPT_HISTORIES - 1}`)).not.toBeNull();
});

test("a broken file is no history", () => {
  files.set(`file:///documents/${GYM_HISTORY_FILE}`, '[{"owner":1}]');
  expect(keptHistory(1, "bench_press")).toBeNull();
});
