import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { saveLanguageChoice } from "../i18n/language";
import { NO_MORNING, saveMorning } from "./morning";
import { MorningStretchLayer } from "./MorningStretchLayer";

jest.mock("expo-notifications");
jest.mock("./chime", () => ({ chime: jest.fn(), tick: jest.fn() }));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

// The phone's documents folder, in memory, as in units.test.ts.
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
  return { File, Paths: { document: { uri: "file:///documents/" } }, files };
});

type Phone = typeof import("../../__mocks__/expo-notifications");
const phone = jest.requireMock<Phone>("expo-notifications");

beforeEach(async () => {
  phone.resetPhone();
  await act(async () => {
    saveMorning(NO_MORNING);
    saveLanguageChoice("en");
  });
});

test("nothing shows until the notification is touched", async () => {
  await render(<MorningStretchLayer />);
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  expect(screen.queryByTestId("stretch-chooser")).toBeNull();
});

test("a touch opens the Morning routine of its length at once, and «End» closes it", async () => {
  await render(<MorningStretchLayer />);
  await act(async () => phone.tap({ kind: "morning_stretch", minutes: 3 }));
  // Without asking how long: six exercises in three minutes.
  expect(screen.queryByText("How long?")).toBeNull();
  expect(screen.getByText("1 of 6")).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Overhead reach" })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "End" }));
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
  // The next morning's opens it again.
  await act(async () => phone.tap({ kind: "morning_stretch", minutes: 10 }));
  expect(screen.getByText("1 of 10")).toBeOnTheScreen();
});

test("the notification that opened the app opens the routine", async () => {
  phone.phone.last = phone.response({ kind: "morning_stretch", minutes: 5 });
  await render(<MorningStretchLayer />);
  expect(screen.getByText("1 of 7")).toBeOnTheScreen();
});

test("a push notification opens nothing here", async () => {
  await render(<MorningStretchLayer />);
  await act(async () => phone.tap({ kind: "comment", drawing_id: "d" }));
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
});

test("during a run a touch opens nothing", async () => {
  await render(<MorningStretchLayer blocked />);
  await act(async () => phone.tap({ kind: "morning_stretch", minutes: 5 }));
  expect(screen.queryByTestId("stretch-screen")).toBeNull();
});
