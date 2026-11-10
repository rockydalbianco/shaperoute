import { WATCH_SENT_FILE, watchSent } from "./watchSent";

// The favorites already sent to the watch (TASK-370 part B3a2).

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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

test("keeps the keys sent, and nothing that is not a key", () => {
  expect(watchSent().load()).toEqual([]);
  expect(watchSent().save(["a", "b"])).toBe(true);
  expect(watchSent().load()).toEqual(["a", "b"]);
  files.set(`file:///documents/${WATCH_SENT_FILE}`, JSON.stringify(["c", 3, "", null]));
  expect(watchSent().load()).toEqual(["c"]);
});
