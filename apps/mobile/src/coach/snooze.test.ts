import { loadSnoozed, snooze, SNOOZE_DAYS, snoozedIn, withSnoozed } from "./snooze";

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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 23, 10);

beforeEach(() => {
  files.clear();
});

test("a tip put off stays put off for a week, then shows again", () => {
  const list = withSnoozed([], 7, "P1:bench_press:", NOW);
  expect(snoozedIn(list, 7, NOW + (SNOOZE_DAYS * DAY_MS - 1))).toEqual(
    new Set(["P1:bench_press:"]),
  );
  expect(snoozedIn(list, 7, NOW + SNOOZE_DAYS * DAY_MS)).toEqual(new Set());
});

test("another account does not see what one put off", () => {
  const list = withSnoozed([], 7, "C2::", NOW);
  expect(snoozedIn(list, 8, NOW)).toEqual(new Set());
});

test("putting off again moves the week on; expired ones leave the list", () => {
  const first = withSnoozed([], 7, "C2::", NOW);
  const old = withSnoozed(first, 7, "T1::", NOW);
  const later = NOW + 8 * DAY_MS;
  const again = withSnoozed(old, 7, "C2::", later);
  expect(again).toEqual([
    { owner: 7, key: "C2::", untilMs: later + SNOOZE_DAYS * DAY_MS },
  ]);
});

test("written on the phone and read back", () => {
  snooze(7, "P4::chest", NOW);
  snooze(7, "P5::quads", NOW);
  expect(loadSnoozed(7, NOW + DAY_MS)).toEqual(new Set(["P4::chest", "P5::quads"]));
  expect(loadSnoozed(9, NOW + DAY_MS)).toEqual(new Set());
});
