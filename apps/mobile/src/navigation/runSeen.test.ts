import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { setPocketOn } from "./pocketOn";
import { useRunSeen } from "./runSeen";

// Whether anyone can see the run's numbers (TASK-496): not behind another
// app, not with the phone locked, not under pocket mode's black screen.

let listeners: ((next: AppStateStatus) => void)[] = [];
let state: AppStateStatus = "active";
function goTo(next: AppStateStatus) {
  state = next;
  return act(async () => listeners.forEach((listener) => listener(next)));
}

beforeEach(() => {
  listeners = [];
  state = "active";
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => state,
  });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(async () => {
  await act(async () => setPocketOn(false));
  jest.restoreAllMocks();
});

test("in front and out of the pocket, seen; behind another app or locked, not", async () => {
  const { result } = await renderHook(() => useRunSeen(true));
  expect(result.current).toBe(true);
  await goTo("inactive");
  expect(result.current).toBe(false);
  await goTo("background");
  expect(result.current).toBe(false);
  await goTo("active");
  expect(result.current).toBe(true);
});

test("under the black screen of pocket mode, not seen", async () => {
  const { result } = await renderHook(() => useRunSeen(true));
  await act(async () => setPocketOn(true));
  expect(result.current).toBe(false);
  await act(async () => setPocketOn(false));
  expect(result.current).toBe(true);
});

test("out of a run in progress the app is not watched, and the numbers are seen", async () => {
  state = "background";
  const { result, rerender } = await renderHook<boolean, { watching: boolean }>(
    ({ watching }) => useRunSeen(watching),
    { initialProps: { watching: false } },
  );
  expect(result.current).toBe(true);
  expect(listeners).toHaveLength(0);
  await rerender({ watching: true });
  expect(result.current).toBe(false);
  expect(listeners).toHaveLength(1);
  await rerender({ watching: false });
  expect(listeners).toHaveLength(0);
});
