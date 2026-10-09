import { act, renderHook } from "@testing-library/react-native";

import { SKIP_LOCK_S } from "./Tour";
import { forgetTourSeen, markTourSeen, TOUR_FILE, tourSeen } from "./tourSeen";
import { askTour, useTour } from "./useTour";

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
const TOUR_URI = `file:///documents/${TOUR_FILE}`;

beforeEach(() => {
  disk.files.clear();
  disk.state.failing = false;
  forgetTourSeen();
});

test("at the first opening the tour is on, with «Skip» waiting", async () => {
  const { result } = await renderHook(() => useTour());
  expect(result.current.on).toEqual({ key: 0, lockSeconds: SKIP_LOCK_S });
});

test("seen to its end, the tour is kept and does not come back", async () => {
  const { result } = await renderHook(() => useTour());
  await act(async () => result.current.end(true));
  expect(result.current.on).toBeNull();
  expect(JSON.parse(disk.files.get(TOUR_URI) ?? "")).toEqual({ seen: true });
  // The app opened again.
  forgetTourSeen();
  const again = await renderHook(() => useTour());
  expect(again.result.current.on).toBeNull();
});

test("a tour that could not show is not kept: it comes at the next opening", async () => {
  const { result } = await renderHook(() => useTour());
  await act(async () => result.current.end(false));
  expect(result.current.on).toBeNull();
  expect(disk.files.has(TOUR_URI)).toBe(false);
  expect(tourSeen()).toBe(false);
});

test("«Watch the tour» shows it again, with «Skip» at once", async () => {
  markTourSeen();
  const { result } = await renderHook(() => useTour());
  expect(result.current.on).toBeNull();
  await act(async () => askTour());
  expect(result.current.on).toEqual({ key: 1, lockSeconds: 0 });
  // Asked again while on: from its first step.
  await act(async () => askTour());
  expect(result.current.on).toEqual({ key: 2, lockSeconds: 0 });
});

test("a file that does not read shows the tour; a phone that cannot write keeps it until it closes", async () => {
  disk.files.set(TOUR_URI, "{broken");
  expect(tourSeen()).toBe(false);
  disk.state.failing = true;
  markTourSeen();
  expect(tourSeen()).toBe(true);
  forgetTourSeen();
  expect(tourSeen()).toBe(false);
});
