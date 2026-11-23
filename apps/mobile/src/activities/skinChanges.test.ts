import { File, Paths } from "expo-file-system";

import {
  endSkinChange,
  forgetSkinChanges,
  loadSkinChanges,
  openSkinChange,
  SKIN_CHANGES_FILE,
  startSkinChange,
} from "./skinChanges";

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

const TOUR = 1_000;

afterEach(() => {
  new File(Paths.document, SKIN_CHANGES_FILE).delete();
  forgetSkinChanges();
});

test("a changeover is marked, then ended, on the tour it belongs to", () => {
  expect(loadSkinChanges(TOUR)).toEqual([]);
  startSkinChange(TOUR, 60_000);
  expect(openSkinChange(loadSkinChanges(TOUR))).toEqual({ fromMs: 60_000, toMs: null });
  // A second tap while one is open changes nothing.
  startSkinChange(TOUR, 70_000);
  expect(loadSkinChanges(TOUR)).toHaveLength(1);
  endSkinChange(TOUR, 240_000);
  expect(loadSkinChanges(TOUR)).toEqual([{ fromMs: 60_000, toMs: 240_000 }]);
  expect(openSkinChange(loadSkinChanges(TOUR))).toBeNull();
  // Ending none changes nothing.
  endSkinChange(TOUR, 300_000);
  expect(loadSkinChanges(TOUR)).toEqual([{ fromMs: 60_000, toMs: 240_000 }]);
});

test("the marks are kept in a file, and read again after the app starts", () => {
  startSkinChange(TOUR, 60_000);
  endSkinChange(TOUR, 240_000);
  forgetSkinChanges();
  expect(loadSkinChanges(TOUR)).toEqual([{ fromMs: 60_000, toMs: 240_000 }]);
});

test("the marks of another tour are not this one's, and the new one starts afresh", () => {
  startSkinChange(TOUR, 60_000);
  expect(loadSkinChanges(2_000)).toEqual([]);
  expect(loadSkinChanges(null)).toEqual([]);
  startSkinChange(2_000, 90_000);
  expect(loadSkinChanges(2_000)).toEqual([{ fromMs: 90_000, toMs: null }]);
  expect(loadSkinChanges(TOUR)).toEqual([]);
});

test("a file that is not one of marks reads as none", () => {
  const file = new File(Paths.document, SKIN_CHANGES_FILE);
  file.create();
  file.write("not json");
  forgetSkinChanges();
  expect(loadSkinChanges(TOUR)).toEqual([]);
});
