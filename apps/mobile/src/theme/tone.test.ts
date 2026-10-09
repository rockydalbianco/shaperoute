import {
  BRIGHTNESS_STEPS,
  DEFAULT_TONE,
  loadToneChoice,
  sameTone,
  saveToneChoice,
  stepOf,
  TONE_FILE,
  withStep,
} from "./tone";

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
const TONE_URI = `file:///documents/${TONE_FILE}`;

afterEach(() => {
  disk.state.failing = false;
  disk.files.clear();
});

test("with no choice the app is dark at its darkest, and light starts white", () => {
  expect(loadToneChoice()).toEqual({ tone: "dark", dark: 0, light: 4 });
  expect(DEFAULT_TONE.light).toBe(BRIGHTNESS_STEPS - 1);
});

test("a tone chosen is kept for the next opening, with each tone's step", () => {
  expect(saveToneChoice({ tone: "light", dark: 2, light: 1 })).toBe(true);
  expect(disk.files.get(TONE_URI)).toBe('{"tone":"light","dark":2,"light":1}');
  expect(loadToneChoice()).toEqual({ tone: "light", dark: 2, light: 1 });
});

test("a file that does not read is no choice; a step that does not, its default", () => {
  disk.files.set(TONE_URI, "not json");
  expect(loadToneChoice()).toEqual(DEFAULT_TONE);
  disk.files.set(TONE_URI, "null");
  expect(loadToneChoice()).toEqual(DEFAULT_TONE);
  disk.files.set(TONE_URI, '{"tone":"sepia","dark":9,"light":2.5}');
  expect(loadToneChoice()).toEqual(DEFAULT_TONE);
  disk.files.set(TONE_URI, '{"tone":"light","dark":"3","light":2}');
  expect(loadToneChoice()).toEqual({ tone: "light", dark: 0, light: 2 });
});

test("a phone that refuses to keep the choice says so", () => {
  disk.state.failing = true;
  expect(saveToneChoice({ tone: "light", dark: 0, light: 4 })).toBe(false);
  expect(loadToneChoice()).toEqual(DEFAULT_TONE);
});

test("the step moved is the one of the tone shown, the other stays", () => {
  const light = { tone: "light", dark: 1, light: 4 } as const;
  expect(stepOf(light)).toBe(4);
  expect(withStep(light, 2)).toEqual({ tone: "light", dark: 1, light: 2 });
  expect(stepOf({ ...light, tone: "dark" })).toBe(1);
  expect(sameTone(light, { tone: "light", dark: 1, light: 4 })).toBe(true);
  expect(sameTone(light, withStep(light, 3))).toBe(false);
  expect(sameTone(light, { ...light, tone: "dark" })).toBe(false);
  // The step of the tone not shown does not change how the app looks.
  expect(sameTone(light, { ...light, dark: 3 })).toBe(true);
});
