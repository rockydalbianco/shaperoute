import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react-native";

import { forgetNoticeSeen, markNoticeSeen, noticeSeen } from "../paddle/safetyNotice";
import {
  forgetSwimNoticeSeen,
  markSwimNoticeSeen,
  swimNoticeSeen,
} from "../swim/safetyNotice";

import {
  forgetSnowNoticeSeen,
  markSnowNoticeSeen,
  SNOW_NOTICE_FILE,
  snowNoticeSeen,
  useSnowNotice,
} from "./safetyNotice";
import { SNOW_NOTICE_LINES, SNOW_NOTICE_TITLE, SnowNotice } from "./SnowNotice";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
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
const NOTICE_URI = `file:///documents/${SNOW_NOTICE_FILE}`;

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
  forgetSnowNoticeSeen();
  forgetSwimNoticeSeen();
  forgetNoticeSeen();
});

test("not read on a new phone; read, it stays read at the next opening", () => {
  expect(snowNoticeSeen()).toBe(false);
  markSnowNoticeSeen();
  expect(disk.files.get(NOTICE_URI)).toBe('{"seen":true}');
  forgetSnowNoticeSeen();
  expect(snowNoticeSeen()).toBe(true);
});

test("the paddle's and the swim's notices read are not the snow's, nor the other way round", () => {
  markNoticeSeen();
  markSwimNoticeSeen();
  expect(snowNoticeSeen()).toBe(false);
  forgetNoticeSeen();
  forgetSwimNoticeSeen();
  disk.files.clear();
  markSnowNoticeSeen();
  expect(noticeSeen()).toBe(false);
  expect(swimNoticeSeen()).toBe(false);
});

test("a file that does not read is a notice not read", () => {
  for (const text of ["", "not json", "null", "true", '{"seen":"yes"}', "{}"]) {
    disk.files.set(NOTICE_URI, text);
    forgetSnowNoticeSeen();
    expect(snowNoticeSeen()).toBe(false);
  }
});

test("a phone that refuses to write keeps it read until the app closes", () => {
  disk.state.failing = true;
  expect(() => markSnowNoticeSeen()).not.toThrow();
  expect(snowNoticeSeen()).toBe(true);
  forgetSnowNoticeSeen();
  expect(snowNoticeSeen()).toBe(false);
});

test("the first «Start» waits for «I understand», the next ones go at once", async () => {
  const start = jest.fn();
  const { result } = await renderHook(() => useSnowNotice());
  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(true);
  expect(start).not.toHaveBeenCalled();
  await act(async () => result.current.accept());
  expect(result.current.asking).toBe(false);
  expect(start).toHaveBeenCalledTimes(1);
  expect(snowNoticeSeen()).toBe(true);

  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(false);
  expect(start).toHaveBeenCalledTimes(2);
});

test("«Not now» starts nothing and asks again at the next «Start»", async () => {
  const start = jest.fn();
  const { result } = await renderHook(() => useSnowNotice());
  await act(async () => result.current.ask(start));
  await act(async () => result.current.dismiss());
  expect(result.current.asking).toBe(false);
  expect(start).not.toHaveBeenCalled();
  expect(snowNoticeSeen()).toBe(false);
  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(true);
});

test("the notice says the four things the user approved, with «I understand» and «Not now»", async () => {
  const onAccept = jest.fn();
  const onDismiss = jest.fn();
  await render(<SnowNotice visible onAccept={onAccept} onDismiss={onDismiss} />);
  expect(SNOW_NOTICE_TITLE).toBe("Before you head out on snowshoes");
  expect(screen.getByText(SNOW_NOTICE_TITLE)).toBeOnTheScreen();
  // The emoji is for the eyes only.
  expect(screen.getByText("❄️", { includeHiddenElements: true })).toBeOnTheScreen();
  expect(SNOW_NOTICE_LINES).toEqual([
    "Check the avalanche bulletin and the weather before you go. MuW does not know them.",
    "The route avoids slopes over 25°, woods, pistes and rock. That does not make it safe: an avalanche can come from above.",
    "Stay off the pistes and follow the local rules: parks, reserves, wildlife quiet zones, private land. MuW does not know them all.",
    "Never go alone, tell someone where you are going, and turn back if the snow or the weather changes.",
  ]);
  for (const line of SNOW_NOTICE_LINES) {
    expect(screen.getByText(line)).toBeOnTheScreen();
  }
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(onAccept).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test("hidden, the notice shows nothing", async () => {
  await render(
    <SnowNotice visible={false} onAccept={jest.fn()} onDismiss={jest.fn()} />,
  );
  expect(screen.queryByText(SNOW_NOTICE_TITLE)).toBeNull();
});
