import {
  canChoose,
  DEFAULT_SPORT,
  loadSport,
  saveSport,
  SPORT_FILE,
  SPORTS,
  type SportOption,
} from "./sport";

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
const SPORT_URI = `file:///documents/${SPORT_FILE}`;

/** As after the tasks that bring the bike. */
const WITH_BIKE: SportOption[] = SPORTS.map((option) =>
  option.id === "bike" ? { ...option, ready: true } : option,
);

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
});

test("run, bike and paddle, and today only run can be chosen", () => {
  expect(SPORTS.map((option) => option.name)).toEqual(["Run", "Bike", "Paddle"]);
  expect(SPORTS.filter((option) => option.ready).map((option) => option.id)).toEqual([
    "run",
  ]);
  expect(canChoose("run")).toBe(true);
  expect(canChoose("bike")).toBe(false);
  expect(canChoose("paddle")).toBe(false);
  expect(canChoose("golf")).toBe(false);
});

test("with nothing chosen, the sport is run", () => {
  expect(DEFAULT_SPORT).toBe("run");
  expect(loadSport()).toBe("run");
});

test("a sport that is ready is kept for the next opening", () => {
  saveSport("bike");
  expect(disk.files.get(SPORT_URI)).toBe('{"sport":"bike"}');
  expect(loadSport(WITH_BIKE)).toBe("bike");
});

test("a saved sport that is not ready reads as run", () => {
  saveSport("bike");
  expect(loadSport()).toBe("run");
});

test("a file that does not read gives run", () => {
  for (const text of ["", "not json", "null", '"bike"', '{"sport":"golf"}', "{}"]) {
    disk.files.set(SPORT_URI, text);
    expect(loadSport(WITH_BIKE)).toBe("run");
  }
});

test("a phone that refuses to write breaks nothing", () => {
  disk.state.failing = true;
  expect(() => saveSport("run")).not.toThrow();
  expect(loadSport()).toBe("run");
});
