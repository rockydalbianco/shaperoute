import {
  appUnits,
  isUnits,
  loadUnitsChoice,
  saveUnitsChoice,
  subscribeUnits,
  UNITS_FILE,
  unitsOf,
} from "./units";

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
const UNITS_URI = `file:///documents/${UNITS_FILE}`;

afterEach(() => {
  disk.state.failing = false;
  saveUnitsChoice("phone");
  disk.files.clear();
});

test("with no choice the app follows the phone, kilometres in tests (ADR-0149)", () => {
  expect(loadUnitsChoice()).toBe("phone");
  expect(appUnits()).toBe("km");
  expect(unitsOf("phone", () => "mi")).toBe("mi");
  expect(unitsOf("km", () => "mi")).toBe("km");
});

test("units chosen are kept for the next opening, and «Phone units» forgets them", () => {
  saveUnitsChoice("mi");
  expect(disk.files.get(UNITS_URI)).toBe('{"units":"mi"}');
  expect(loadUnitsChoice()).toBe("mi");
  expect(appUnits()).toBe("mi");
  saveUnitsChoice("phone");
  expect(disk.files.has(UNITS_URI)).toBe(false);
  expect(loadUnitsChoice()).toBe("phone");
  expect(appUnits()).toBe("km");
});

test("kilometres chosen are kept too, on a phone that would say miles", () => {
  saveUnitsChoice("km");
  expect(disk.files.get(UNITS_URI)).toBe('{"units":"km"}');
  expect(unitsOf(loadUnitsChoice(), () => "mi")).toBe("km");
});

test("a file that does not read, or names another unit, is the phone's", () => {
  disk.files.set(UNITS_URI, "not json");
  expect(loadUnitsChoice()).toBe("phone");
  disk.files.set(UNITS_URI, '{"units":"yd"}');
  expect(loadUnitsChoice()).toBe("phone");
  disk.files.set(UNITS_URI, '{"units":"mi"}');
  expect(loadUnitsChoice()).toBe("mi");
  expect(isUnits("km")).toBe(true);
  expect(isUnits("miles")).toBe(false);
  expect(isUnits(null)).toBe(false);
});

test("a phone that refuses to keep the choice still shows it until the app closes", () => {
  disk.state.failing = true;
  saveUnitsChoice("mi");
  expect(appUnits()).toBe("mi");
  expect(loadUnitsChoice()).toBe("phone");
});

test("the app is told of each new unit, once, until it stops listening", () => {
  const heard: string[] = [];
  const stop = subscribeUnits((units) => heard.push(units));
  saveUnitsChoice("mi");
  saveUnitsChoice("mi");
  saveUnitsChoice("km");
  stop();
  saveUnitsChoice("mi");
  expect(heard).toEqual(["mi", "km"]);
});
