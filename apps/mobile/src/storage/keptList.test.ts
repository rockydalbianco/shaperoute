import { COPY_SUFFIX, keptList } from "./keptList";

// The phone's documents folder, in memory; a write can be made to fail
// after the file was emptied, as a full phone does.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  const failing = new Set<string>();
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
      if (failing.has(this.uri)) {
        throw new Error("No space left on device");
      }
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, failing, Paths: { document: { uri: "file:///documents/" } } };
});

const { files, failing } = jest.requireMock<{
  files: Map<string, string>;
  failing: Set<string>;
}>("expo-file-system");

const NAME = "list.json";
const URI = `file:///documents/${NAME}`;
const COPY_URI = `${URI}${COPY_SUFFIX}`;

const isText = (value: unknown): value is string => typeof value === "string";
const list = keptList(NAME, isText);

beforeEach(() => {
  files.clear();
  failing.clear();
});

test("a list written is the list read, in its order", () => {
  expect(list.load()).toEqual([]);
  expect(list.save(["a", "b"])).toBe(true);
  expect(list.load()).toEqual(["a", "b"]);
  expect(JSON.parse(files.get(URI) ?? "")).toEqual(["a", "b"]);
});

test("what is not an item is left out", () => {
  files.set(URI, JSON.stringify(["a", 2, null, "b"]));
  expect(list.load()).toEqual(["a", "b"]);
});

test("a file emptied by a write that failed gives way to its copy", () => {
  expect(list.save(["a", "b"])).toBe(true);
  // The phone is full: the file is emptied, and the write after fails.
  failing.add(URI);
  expect(list.save(["a", "b", "c"])).toBe(false);
  expect(files.get(URI)).toBe("");
  expect(list.load()).toEqual(["a", "b", "c"]);
});

test("a copy that could not be written leaves the file as it was", () => {
  expect(list.save(["a", "b"])).toBe(true);
  failing.add(COPY_URI);
  expect(list.save(["a", "b", "c"])).toBe(false);
  expect(list.load()).toEqual(["a", "b"]);
});

test("a broken file gives way to its copy, and both broken to nothing", () => {
  expect(list.save(["a"])).toBe(true);
  files.set(URI, '["a", "b');
  expect(list.load()).toEqual(["a"]);
  files.set(COPY_URI, "{");
  expect(list.load()).toEqual([]);
});

test("a file from before the copy existed is read as it is", () => {
  files.set(URI, JSON.stringify(["old"]));
  expect(list.load()).toEqual(["old"]);
});

test("an empty list removes the file and its copy", () => {
  expect(list.save(["a"])).toBe(true);
  expect(list.save([])).toBe(true);
  expect(files.size).toBe(0);
  expect(list.load()).toEqual([]);
});

test("a phone with no documents folder reads nothing and writes nothing, without throwing", () => {
  const { Paths } = jest.requireMock<{ Paths: { document?: { uri: string } } }>(
    "expo-file-system",
  );
  const folder = Paths.document;
  delete Paths.document;
  try {
    expect(list.load()).toEqual([]);
    expect(list.save(["a"])).toBe(false);
  } finally {
    Paths.document = folder;
  }
});
