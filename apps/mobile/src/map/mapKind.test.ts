import {
  appMapKind,
  isMapKind,
  loadMapKind,
  MAP_KIND_FILE,
  MAP_KINDS,
  saveMapKind,
  subscribeMapKind,
} from "./mapKind";

// The phone's documents folder, in memory: what is written stays there for
// the next read, as after closing the app.

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const state = { failing: false };
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      if (state.failing) {
        throw new Error("No space left on device");
      }
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { failing: boolean };
}>("expo-file-system");
const KIND_URI = `file:///documents/${MAP_KIND_FILE}`;

afterEach(() => {
  disk.state.failing = false;
  saveMapKind("standard");
  disk.files.clear();
});

test("three kinds, the standard map first", () => {
  expect(MAP_KINDS).toEqual(["standard", "satellite", "3d"]);
  expect(MAP_KINDS.every(isMapKind)).toBe(true);
  expect(isMapKind("terrain")).toBe(false);
  expect(isMapKind(null)).toBe(false);
});

test("with no choice the map is the standard one", () => {
  expect(loadMapKind()).toBe("standard");
  expect(appMapKind()).toBe("standard");
});

test("a kind chosen is kept for the next opening", () => {
  saveMapKind("satellite");
  expect(appMapKind()).toBe("satellite");
  expect(JSON.parse(disk.files.get(KIND_URI) ?? "")).toEqual({ kind: "satellite" });
  expect(loadMapKind()).toBe("satellite");
});

test("back to the standard map, nothing stays on the phone", () => {
  saveMapKind("3d");
  saveMapKind("standard");
  expect(disk.files.has(KIND_URI)).toBe(false);
  expect(appMapKind()).toBe("standard");
});

test("a file that does not read is the standard map", () => {
  disk.files.set(KIND_URI, "{not json");
  expect(loadMapKind()).toBe("standard");
  disk.files.set(KIND_URI, JSON.stringify({ kind: "terrain" }));
  expect(loadMapKind()).toBe("standard");
});

test("those listening hear of each new kind, once", () => {
  const heard = jest.fn();
  const stop = subscribeMapKind(heard);
  saveMapKind("3d");
  saveMapKind("3d");
  expect(heard).toHaveBeenCalledTimes(1);
  stop();
  saveMapKind("satellite");
  expect(heard).toHaveBeenCalledTimes(1);
});

test("a phone that refuses to keep it still shows it until the app closes", () => {
  disk.state.failing = true;
  saveMapKind("satellite");
  expect(appMapKind()).toBe("satellite");
  expect(disk.files.has(KIND_URI)).toBe(false);
});
