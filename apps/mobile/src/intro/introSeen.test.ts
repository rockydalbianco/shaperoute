import {
  forgetIntroSeen,
  INTRO_FILE,
  introVersion,
  markWholeIntroSeen,
  wholeIntroSeen,
} from "./introSeen";

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
  }
  return { File, Paths: { document: { uri: "file:///documents/" } }, files, state };
});

const disk = jest.requireMock<{
  files: Map<string, string>;
  state: { failing: boolean };
}>("expo-file-system");
const INTRO_URI = `file:///documents/${INTRO_FILE}`;

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
  forgetIntroSeen();
});

describe("the version the whole animation is shown for", () => {
  it("is the app's store version", () => {
    expect(introVersion({ version: "1.1.0" })).toBe("1.1.0");
  });

  it("is empty without a config or a version", () => {
    expect(introVersion(null)).toBe("");
    expect(introVersion({})).toBe("");
  });
});

describe("whether the whole animation was seen", () => {
  it("is not, at the first opening", () => {
    expect(wholeIntroSeen("1.1.0")).toBe(false);
  });

  it("is, at the next opening with the same version", () => {
    markWholeIntroSeen("1.1.0");
    expect(JSON.parse(disk.files.get(INTRO_URI) ?? "")).toEqual({ version: "1.1.0" });
    forgetIntroSeen();
    expect(wholeIntroSeen("1.1.0")).toBe(true);
  });

  it("is not once more after a new version, then is again", () => {
    markWholeIntroSeen("1.1.0");
    forgetIntroSeen();
    expect(wholeIntroSeen("1.2.0")).toBe(false);
    markWholeIntroSeen("1.2.0");
    forgetIntroSeen();
    expect(wholeIntroSeen("1.2.0")).toBe(true);
    expect(wholeIntroSeen("1.1.0")).toBe(false);
  });

  it("is not when the file does not read", () => {
    disk.files.set(INTRO_URI, "{not json");
    expect(wholeIntroSeen("1.1.0")).toBe(false);
    disk.files.set(INTRO_URI, JSON.stringify("1.1.0"));
    expect(wholeIntroSeen("1.1.0")).toBe(false);
    disk.files.set(INTRO_URI, JSON.stringify({ seen: true }));
    expect(wholeIntroSeen("1.1.0")).toBe(false);
  });

  it("is kept until the app closes on a phone that cannot write", () => {
    disk.state.failing = true;
    expect(() => markWholeIntroSeen("1.1.0")).not.toThrow();
    expect(wholeIntroSeen("1.1.0")).toBe(true);
    // The next opening: nothing was written, the whole one shows again.
    forgetIntroSeen();
    expect(wholeIntroSeen("1.1.0")).toBe(false);
  });
});
