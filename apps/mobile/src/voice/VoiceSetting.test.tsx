import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";

import { setVoice } from "../navigation/runControl";
import {
  DEFAULT_VOICE_CHOICE,
  loadVoiceChoice,
  saveVoiceChoice,
  voiceChoice,
} from "./voiceChoice";
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
  setVoice(true);
  jest.mocked(Speech.speak).mockClear();
});

/** Draws the row, once the phone has said which voices it has. */
async function drawn() {
  await render(<VoiceSetting />);
  await act(async () => {});
}

test("before any choice: the app's language, the phone's own voice", async () => {
  await drawn();
  await fireEvent.press(
    screen.getByRole("button", { name: "Voice language and voice: English, Default" }),
  );
  expect(screen.getByRole("radio", { name: "App language, English" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Default" })).toBeChecked();
  // The English voices of every country, by name.
  expect(
    screen.getByRole("radio", { name: "Daniel, en-GB · Enhanced" }),
  ).not.toBeChecked();
  expect(screen.getByRole("radio", { name: "Samantha, en-US" })).toBeOnTheScreen();
  expect(screen.queryByRole("radio", { name: "Alice, it-IT" })).toBeNull();
  // The five languages, each in its own name, in the user's order.
  expect(
    screen
      .getAllByRole("radio")
      .slice(1, 6)
      .map((radio) => radio.props.accessibilityLabel),
  ).toEqual(["English", "Deutsch", "Italiano", "Español", "Français"]);
});

test("a language and a voice are chosen, kept on the phone, and heard", async () => {
  await drawn();
  await fireEvent.press(
    screen.getByRole("button", { name: /^Voice language and voice/ }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Italiano" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Alice, it-IT" }));
  expect(voiceChoice()).toEqual({ language: "it", voices: { it: "alice" } });
  // What the next opening of the app reads.
  expect(loadVoiceChoice()).toEqual({ language: "it", voices: { it: "alice" } });

  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  expect(
    screen.getByRole("button", { name: "Voice language and voice: Italiano, Alice" }),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Listen" }));
  expect(Speech.speak).toHaveBeenCalledWith(
    "Tra 50 metri, svolta a sinistra su Via Roma",
    {
      language: "it-IT",
      voice: "alice",
    },
  );
});

test("«Default» gives the language back to the phone's own voice", async () => {
  saveVoiceChoice({ language: "en", voices: { en: "daniel" } });
  await drawn();
  await fireEvent.press(
    screen.getByRole("button", { name: "Voice language and voice: English, Daniel" }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Default" }));
  expect(voiceChoice()).toEqual({ language: "en", voices: {} });
});

test("a language the phone has no voice for says so, and English speaks", async () => {
  await drawn();
  await fireEvent.press(
    screen.getByRole("button", { name: /^Voice language and voice/ }),
  );
  await fireEvent.press(screen.getByRole("radio", { name: "Français" }));
  expect(
    screen.getByText("This phone has no Français voice: the voice speaks English."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Français" })).toBeChecked();
  await fireEvent.press(screen.getByRole("button", { name: "Done" }));
  await fireEvent.press(screen.getByRole("button", { name: "Listen" }));
  expect(Speech.speak).toHaveBeenCalledWith("In 50 metres, turn left onto Via Roma", {
    language: "en-US",
  });
});

test("with «Voice» off the choice is there and nothing is said", async () => {
  setVoice(false);
  await drawn();
  const listen = screen.getByRole("button", { name: "Listen" });
  expect(listen).toBeDisabled();
  await fireEvent.press(listen);
  expect(Speech.speak).not.toHaveBeenCalled();
  await fireEvent.press(
    screen.getByRole("button", { name: /^Voice language and voice/ }),
  );
  expect(screen.getByRole("radio", { name: "Italiano" })).toBeOnTheScreen();
});
