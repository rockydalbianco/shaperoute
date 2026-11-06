import {
  averagePace,
  keepPace,
  loadPoolChoice,
  PACES_KEPT,
  POOL_CHOICE_FILE,
  savePlace,
  savePoolLength,
} from "./poolChoice";

// TASK-400 part B: «Open water» or «Pool» and the pool, the last chosen
// coming back, and the paces of the estimate.

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

beforeEach(() => files.clear());

test("the first time: open water, as before, and 25 m", () => {
  expect(loadPoolChoice()).toEqual({ place: "open_water", poolLengthM: 25, paces: [] });
  expect(averagePace()).toBeNull();
});

test("the last place and pool chosen come back", () => {
  savePlace("pool");
  savePoolLength(33.33);
  expect(files.has(`file:///documents/${POOL_CHOICE_FILE}`)).toBe(true);
  expect(loadPoolChoice()).toMatchObject({ place: "pool", poolLengthM: 33.33 });
});

test("a pool out of 10–100 m is not kept", () => {
  savePoolLength(50);
  savePoolLength(120);
  savePoolLength(5);
  expect(loadPoolChoice().poolLengthM).toBe(50);
});

test("the estimate averages the last paces", () => {
  keepPace(100);
  keepPace(140);
  expect(averagePace()).toBe(120);
  for (let i = 0; i < PACES_KEPT; i += 1) {
    keepPace(90);
  }
  expect(loadPoolChoice().paces).toHaveLength(PACES_KEPT);
  expect(averagePace()).toBe(90);
});

test("a file that does not read gives the first choice", () => {
  files.set(`file:///documents/${POOL_CHOICE_FILE}`, "{broken");
  expect(loadPoolChoice().place).toBe("open_water");
});
