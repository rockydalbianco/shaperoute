import livesPage from "@shaperoute/shared-types/fixtures/lives-page.json";
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import type { LiveApiOptions } from "./liveShareApi";
import { ROW_EVERY_MS, useLives } from "./useLives";

// The Feed's row of lives asks only while someone can see it (TASK-499):
// every ROW_EVERY_MS on screen, never behind another app, at once when the
// app is back.

let listeners: ((next: AppStateStatus) => void)[] = [];
function goTo(next: AppStateStatus) {
  return act(async () => listeners.forEach((listener) => listener(next)));
}
function wait(ms: number) {
  return act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

function api() {
  const fetchFn = jest.fn(async (_input: string, _init?: RequestInit) =>
    Response.json(livesPage),
  );
  const options: LiveApiOptions = {
    baseUrl: "http://api",
    token: "t",
    fetchFn: fetchFn as unknown as typeof fetch,
    key: null,
  };
  return { fetchFn, options };
}

beforeEach(() => {
  jest.useFakeTimers();
  listeners = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    listeners.push(listener as (next: AppStateStatus) => void);
    return {
      remove: () => {
        listeners = listeners.filter((other) => other !== listener);
      },
    } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("on screen the row asks when it shows and every ROW_EVERY_MS", async () => {
  const { fetchFn, options } = api();
  const { result } = await renderHook(() => useLives(options));
  await wait(0);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(String(fetchFn.mock.calls[0][0])).toBe("http://api/lives");
  expect(result.current.lives.map((live) => live.id)).toEqual(
    livesPage.lives.map((live) => live.id),
  );
  await wait(ROW_EVERY_MS);
  await wait(ROW_EVERY_MS);
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

test("behind another app nothing is asked; back, at once and on time again", async () => {
  const { fetchFn, options } = api();
  await renderHook(() => useLives(options));
  await wait(0);
  expect(fetchFn).toHaveBeenCalledTimes(1);

  await goTo("background");
  await wait(ROW_EVERY_MS * 5);
  expect(fetchFn).toHaveBeenCalledTimes(1);

  await goTo("active");
  expect(fetchFn).toHaveBeenCalledTimes(2);
  await wait(ROW_EVERY_MS);
  expect(fetchFn).toHaveBeenCalledTimes(3);
  // Still on screen: no second question for the same return.
  await goTo("active");
  expect(fetchFn).toHaveBeenCalledTimes(3);
});

test("the control centre over the app («inactive») stops it as well", async () => {
  const { fetchFn, options } = api();
  await renderHook(() => useLives(options));
  await wait(0);
  await goTo("inactive");
  await wait(ROW_EVERY_MS * 2);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  await goTo("active");
  expect(fetchFn).toHaveBeenCalledTimes(2);
});

test("a hidden Feed asks nothing, and a row gone listens no more", async () => {
  const { fetchFn, options } = api();
  const hidden = await renderHook(() => useLives(null));
  await wait(ROW_EVERY_MS * 2);
  expect(listeners).toHaveLength(0);
  await hidden.unmount();

  const shown = await renderHook(() => useLives(options));
  await wait(0);
  expect(listeners).toHaveLength(1);
  await shown.unmount();
  expect(listeners).toHaveLength(0);
  await wait(ROW_EVERY_MS * 2);
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
