import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { setVoice } from "../navigation/runControl";
import { DEFAULT_VOICE_CHOICE, saveVoiceChoice } from "./voiceChoice";
import { VoiceSetting } from "./VoiceSetting";

// The row and the sheet of «Voice» in the app's language (TASK-210): the
// languages keep their own names, the rest is Italian.

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => [
    { identifier: "alice", name: "Alice", language: "it-IT", quality: "Default" },
    { identifier: "paola", name: "Paola", language: "it-IT", quality: "Enhanced" },
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
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

beforeEach(async () => {
  saveVoiceChoice(DEFAULT_VOICE_CHOICE);
  setVoice(true);
  await act(async () => saveLanguageChoice("it"));
});

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
});

test("the row, the sheet and the notes speak Italian", async () => {
  await render(<VoiceSetting />);
  await act(async () => {});
  expect(screen.getByText("Italiano · Predefinita")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Ascolta" })).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", {
      name: "Lingua della voce e voce: Italiano, Predefinita",
    }),
  );
  expect(screen.getByLabelText("Lingua")).toBeOnTheScreen();
  expect(
    screen.getByRole("radio", { name: "Lingua dell'app, Italiano" }),
  ).toBeChecked();
  expect(screen.getByLabelText("Voce")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Predefinita" })).toBeChecked();
  expect(
    screen.getByRole("radio", { name: "Paola, it-IT · Migliorata" }),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("radio", { name: "Français" }));
  expect(
    screen.getByText(
      "Questo telefono non ha una voce per Français: la voce parla inglese.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Fatto" })).toBeOnTheScreen();
  expect(screen.queryByText("Done")).toBeNull();
});
