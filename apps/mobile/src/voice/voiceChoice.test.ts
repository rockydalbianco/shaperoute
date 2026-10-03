import * as Speech from "expo-speech";

import * as language from "../i18n/language";
import {
  DEFAULT_VOICE_CHOICE,
  loadVoiceChoice,
  loadVoices,
  saveVoiceChoice,
  speaking,
  spokenWords,
  VOICE_FILE,
  voiceChoice,
  voicesOf,
} from "./voiceChoice";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(),
}));
// The phone's documents folder, in memory.
const mockFiles = new Map<string, string>();
jest.mock("expo-file-system", () => {
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return mockFiles.has(this.uri);
    }
    create(): void {
      mockFiles.set(this.uri, "");
    }
    write(text: string): void {
      mockFiles.set(this.uri, text);
    }
    textSync(): string {
      return mockFiles.get(this.uri) ?? "";
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

const FILE = `file:///documents/${VOICE_FILE}`;

function voice(identifier: string, name: string, tag: string): Speech.Voice {
  return {
    identifier,
    name,
    language: tag,
    quality: "Default" as Speech.VoiceQuality,
  };
}

const SAMANTHA = voice("samantha", "Samantha", "en-US");
const DANIEL = voice("daniel", "Daniel", "en-GB");
const ALICE = voice("alice", "Alice", "it-IT");
const LUCA = voice("luca", "Luca", "it_IT");
const PHONE = [SAMANTHA, ALICE, DANIEL, LUCA, voice("anna", "Anna", "de-DE")];

afterEach(() => {
  mockFiles.clear();
  saveVoiceChoice(DEFAULT_VOICE_CHOICE);
  mockFiles.clear();
});

test("with nothing chosen the voice speaks as before: English, the phone's own voice", () => {
  expect(loadVoiceChoice()).toEqual(DEFAULT_VOICE_CHOICE);
  expect(speaking()).toEqual({ language: "en", options: { language: "en-US" } });
  expect(speaking(DEFAULT_VOICE_CHOICE, "en", PHONE)).toEqual({
    language: "en",
    options: { language: "en-US" },
  });
});

test("the voice follows the app's language until one is chosen for it alone", () => {
  expect(speaking(DEFAULT_VOICE_CHOICE, "it", PHONE)).toEqual({
    language: "it",
    options: { language: "it-IT" },
  });
  const french = { language: "fr" as const, voices: {} };
  expect(speaking(french, "it", null).language).toBe("fr");
  // The app's language now, read when the voice speaks.
  const app = jest.spyOn(language, "appLanguage").mockReturnValue("de");
  expect(speaking().options).toEqual({ language: "de-DE" });
  app.mockRestore();
});

test("a chosen voice is asked for by its identifier, from any country of its language", () => {
  const choice = { language: "en" as const, voices: { en: "daniel" } };
  expect(speaking(choice, "it", PHONE)).toEqual({
    language: "en",
    options: { language: "en-US", voice: "daniel" },
  });
  // Each language keeps its own voice.
  const app = { language: "app" as const, voices: { en: "daniel", it: "luca" } };
  expect(speaking(app, "it", PHONE).options).toEqual({
    language: "it-IT",
    voice: "luca",
  });
  expect(speaking(app, "en", PHONE).options).toEqual({
    language: "en-US",
    voice: "daniel",
  });
});

test("a voice gone from the phone leaves its language's own voice, without an error", () => {
  const choice = { language: "it" as const, voices: { it: "federica" } };
  expect(speaking(choice, "en", PHONE)).toEqual({
    language: "it",
    options: { language: "it-IT" },
  });
  // Before the phone's voices are read, none is asked for by name: iOS
  // says nothing for a voice it does not find.
  expect(speaking({ ...choice, voices: { it: "alice" } }, "en", null).options).toEqual({
    language: "it-IT",
  });
});

test("a language the phone has no voice for is spoken in English", () => {
  const choice = { language: "es" as const, voices: { en: "daniel" } };
  expect(speaking(choice, "it", PHONE)).toEqual({
    language: "en",
    options: { language: "en-US", voice: "daniel" },
  });
  // A phone that gives no voices at all says nothing about any language.
  expect(speaking(choice, "it", []).language).toBe("es");
  expect(speaking(choice, "it", null).language).toBe("es");
});

test("the voices of a language are those of every country, by name", () => {
  expect(voicesOf("en", PHONE)).toEqual([DANIEL, SAMANTHA]);
  expect(voicesOf("it", PHONE)).toEqual([ALICE, LUCA]);
  expect(voicesOf("fr", PHONE)).toEqual([]);
});

test("the choice stays on the phone for the next opening of the app", () => {
  const choice = { language: "it" as const, voices: { it: "alice", en: "daniel" } };
  saveVoiceChoice(choice);
  expect(voiceChoice()).toEqual(choice);
  expect(JSON.parse(mockFiles.get(FILE) ?? "")).toEqual(choice);
  // What a new opening reads.
  expect(loadVoiceChoice()).toEqual(choice);
});

test("a file that does not read, or names what is not there, is no choice", () => {
  mockFiles.set(FILE, "{");
  expect(loadVoiceChoice()).toEqual(DEFAULT_VOICE_CHOICE);
  mockFiles.set(
    FILE,
    JSON.stringify({ language: "pt", voices: { pt: "joana", it: 3 } }),
  );
  expect(loadVoiceChoice()).toEqual(DEFAULT_VOICE_CHOICE);
  mockFiles.set(FILE, JSON.stringify({ language: "de", voices: ["anna"] }));
  expect(loadVoiceChoice()).toEqual({ language: "de", voices: {} });
});

test("the words said are in the language of the choice", () => {
  expect(spokenWords().paused).toBe("Paused.");
  saveVoiceChoice({ language: "it", voices: {} });
  expect(spokenWords().paused).toBe("In pausa.");
});

test("the phone's voices are read once, and a phone that fails gives none", async () => {
  jest
    .mocked(Speech.getAvailableVoicesAsync)
    .mockRejectedValueOnce(new Error("no TTS"));
  await expect(loadVoices()).resolves.toEqual([]);
  await expect(loadVoices()).resolves.toEqual([]);
  expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
  // Knowing nothing, the voice speaks as before.
  expect(speaking().options).toEqual({ language: "en-US" });
});
