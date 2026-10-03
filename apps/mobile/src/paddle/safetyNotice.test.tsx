import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react-native";

import {
  forgetNoticeSeen,
  markNoticeSeen,
  noticeSeen,
  PADDLE_NOTICE_FILE,
  usePaddleNotice,
} from "./safetyNotice";
import { NOTICE_LINES, NOTICE_TITLE, PaddleNotice } from "./PaddleNotice";

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
const NOTICE_URI = `file:///documents/${PADDLE_NOTICE_FILE}`;

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
  forgetNoticeSeen();
});

test("not read on a new phone; read, it stays read at the next opening", () => {
  expect(noticeSeen()).toBe(false);
  markNoticeSeen();
  expect(disk.files.get(NOTICE_URI)).toBe('{"seen":true}');
  forgetNoticeSeen();
  expect(noticeSeen()).toBe(true);
});

test("a file that does not read is a notice not read", () => {
  for (const text of ["", "not json", "null", "true", '{"seen":"yes"}', "{}"]) {
    disk.files.set(NOTICE_URI, text);
    forgetNoticeSeen();
    expect(noticeSeen()).toBe(false);
  }
});

test("a phone that refuses to write keeps it read until the app closes", () => {
  disk.state.failing = true;
  expect(() => markNoticeSeen()).not.toThrow();
  expect(noticeSeen()).toBe(true);
  forgetNoticeSeen();
  expect(noticeSeen()).toBe(false);
});

test("the first «Start» waits for «I understand», the next ones go at once", async () => {
  const start = jest.fn();
  const { result } = await renderHook(() => usePaddleNotice());
  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(true);
  expect(start).not.toHaveBeenCalled();
  await act(async () => result.current.accept());
  expect(result.current.asking).toBe(false);
  expect(start).toHaveBeenCalledTimes(1);
  expect(noticeSeen()).toBe(true);

  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(false);
  expect(start).toHaveBeenCalledTimes(2);
});

test("«Not now» starts nothing and asks again at the next «Start»", async () => {
  const start = jest.fn();
  const { result } = await renderHook(() => usePaddleNotice());
  await act(async () => result.current.ask(start));
  await act(async () => result.current.dismiss());
  expect(result.current.asking).toBe(false);
  expect(start).not.toHaveBeenCalled();
  expect(noticeSeen()).toBe(false);
  await act(async () => result.current.ask(start));
  expect(result.current.asking).toBe(true);
});

test("the notice says the four things, with «I understand» and «Not now»", async () => {
  const onAccept = jest.fn();
  const onDismiss = jest.fn();
  await render(<PaddleNotice visible onAccept={onAccept} onDismiss={onDismiss} />);
  expect(screen.getByText(NOTICE_TITLE)).toBeOnTheScreen();
  expect(NOTICE_LINES).toEqual([
    "Wear a life jacket.",
    "Check the weather and the wind before you go out.",
    "Follow the local rules: swimming areas, boat lanes, harbours. Sgrava does not know them.",
    "The route stays within 1 km of the shore. That does not make it safe or allowed.",
  ]);
  for (const line of NOTICE_LINES) {
    expect(screen.getByText(line)).toBeOnTheScreen();
  }
  await fireEvent.press(screen.getByRole("button", { name: "I understand" }));
  expect(onAccept).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole("button", { name: "Not now" }));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test("hidden, the notice shows nothing", async () => {
  await render(
    <PaddleNotice visible={false} onAccept={jest.fn()} onDismiss={jest.fn()} />,
  );
  expect(screen.queryByText(NOTICE_TITLE)).toBeNull();
});
