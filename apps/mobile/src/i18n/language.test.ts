import {
  appLanguage,
  LANGUAGE_FILE,
  languageOf,
  loadLanguageChoice,
  saveLanguageChoice,
  subscribeLanguage,
} from "./language";

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
const LANGUAGE_URI = `file:///documents/${LANGUAGE_FILE}`;

afterEach(() => {
  disk.state.failing = false;
  saveLanguageChoice("phone");
  disk.files.clear();
});

test("with no choice the app follows the phone, English in tests (ADR-0172)", () => {
  expect(loadLanguageChoice()).toBe("phone");
  expect(appLanguage()).toBe("en");
  expect(languageOf("phone", () => "it")).toBe("it");
  expect(languageOf("de", () => "it")).toBe("de");
});

test("a language chosen is kept for the next opening, and «Phone language» forgets it", () => {
  saveLanguageChoice("it");
  expect(disk.files.get(LANGUAGE_URI)).toBe('{"language":"it"}');
  expect(loadLanguageChoice()).toBe("it");
  expect(appLanguage()).toBe("it");
  saveLanguageChoice("phone");
  expect(disk.files.has(LANGUAGE_URI)).toBe(false);
  expect(loadLanguageChoice()).toBe("phone");
  expect(appLanguage()).toBe("en");
});

test("a file that does not read, or names another language, is the phone's", () => {
  disk.files.set(LANGUAGE_URI, "not json");
  expect(loadLanguageChoice()).toBe("phone");
  disk.files.set(LANGUAGE_URI, '{"language":"pt"}');
  expect(loadLanguageChoice()).toBe("phone");
  disk.files.set(LANGUAGE_URI, '{"language":"fr"}');
  expect(loadLanguageChoice()).toBe("fr");
});

test("a phone that refuses to keep the choice still shows it until the app closes", () => {
  disk.state.failing = true;
  saveLanguageChoice("es");
  expect(appLanguage()).toBe("es");
  expect(loadLanguageChoice()).toBe("phone");
});

test("the app is told of each new language, once, until it stops listening", () => {
  const heard: string[] = [];
  const stop = subscribeLanguage((language) => heard.push(language));
  saveLanguageChoice("de");
  saveLanguageChoice("de");
  saveLanguageChoice("en");
  stop();
  saveLanguageChoice("fr");
  expect(heard).toEqual(["de", "en"]);
});
