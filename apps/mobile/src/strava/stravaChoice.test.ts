import { loadSendToStrava, saveSendToStrava, STRAVA_CHOICE_FILE } from "./stravaChoice";

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

test("the switch is on the first time", () => {
  expect(loadSendToStrava()).toBe(true);
});

test("the switch remembers how it was left", () => {
  saveSendToStrava(false);
  expect(loadSendToStrava()).toBe(false);
  saveSendToStrava(true);
  expect(loadSendToStrava()).toBe(true);
});

test("a file that does not read leaves the switch on", () => {
  files.set(`file:///documents/${STRAVA_CHOICE_FILE}`, "{not json");
  expect(loadSendToStrava()).toBe(true);
});
