/**
 * «Listen», under «Voice» on the run's «Data», with «Miles» chosen in
 * «Settings» (TASK-182, part C): the sample turn is said in feet, as the
 * turns of the run are. In kilometres it is in VoiceSetting.test.tsx.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";

import { setVoice } from "../navigation/runControl";
import { saveUnitsChoice } from "../units/units";
import { DEFAULT_VOICE_CHOICE, saveVoiceChoice } from "./voiceChoice";
import { VoiceSetting } from "./VoiceSetting";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => [
    { identifier: "samantha", name: "Samantha", language: "en-US", quality: "Default" },
    { identifier: "daniel", name: "Daniel", language: "en-GB", quality: "Enhanced" },
    { identifier: "alice", name: "Alice", language: "it-IT", quality: "Default" },
  ]),
  VoiceQuality: { Default: "Default", Enhanced: "Enhanced" },
}));
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
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

beforeEach(() => {
  saveVoiceChoice(DEFAULT_VOICE_CHOICE);
  saveUnitsChoice("mi");
  setVoice(true);
  jest.mocked(Speech.speak).mockClear();
});

afterEach(() => {
  saveUnitsChoice("phone");
  saveVoiceChoice(DEFAULT_VOICE_CHOICE);
});

/** Draws the row, once the phone has said which voices it has. */
async function drawn() {
  await render(<VoiceSetting />);
  await act(async () => {});
}

test("with miles «Listen» says the turn in feet", async () => {
  await drawn();
  await fireEvent.press(screen.getByRole("button", { name: "Listen" }));
  expect(Speech.speak).toHaveBeenLastCalledWith(
    "In 150 feet, turn left onto Via Roma",
    {
      language: "en-US",
    },
  );
});

test("in Italian too, and in metres again with «Kilometres»", async () => {
  saveVoiceChoice({ language: "it", voices: { it: "alice" } });
  await drawn();
  await fireEvent.press(screen.getByRole("button", { name: "Listen" }));
  expect(Speech.speak).toHaveBeenLastCalledWith(
    "Tra 150 piedi, svolta a sinistra su Via Roma",
    { language: "it-IT", voice: "alice" },
  );
  // «Settings», «Units», «Kilometres»: the next «Listen» is as before.
  saveUnitsChoice("km");
  await fireEvent.press(screen.getByRole("button", { name: "Listen" }));
  expect(Speech.speak).toHaveBeenLastCalledWith(
    "Tra 50 metri, svolta a sinistra su Via Roma",
    { language: "it-IT", voice: "alice" },
  );
});
