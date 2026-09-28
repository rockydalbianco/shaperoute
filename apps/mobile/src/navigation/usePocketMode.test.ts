import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Brightness from "expo-brightness";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { AppState, type AppStateStatus } from "react-native";

import { KEEP_AWAKE_TAG, POCKET_BRIGHTNESS, usePocketMode } from "./usePocketMode";

jest.mock("expo-brightness", () => ({
  getBrightnessAsync: jest.fn(),
  setBrightnessAsync: jest.fn(),
}));
jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

const getBrightness = jest.mocked(Brightness.getBrightnessAsync);
const setBrightness = jest.mocked(Brightness.setBrightnessAsync);
const activate = jest.mocked(activateKeepAwakeAsync);
const deactivate = jest.mocked(deactivateKeepAwake);

let appState: (next: AppStateStatus) => void = () => {};
const removeAppState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  getBrightness.mockResolvedValue(0.7);
  setBrightness.mockResolvedValue();
  activate.mockResolvedValue();
  deactivate.mockResolvedValue();
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appState = listener;
    return { remove: removeAppState };
  });
});

/** Pocket mode entered, with the phone at 70% brightness. */
async function entered(active = true) {
  const hook = await renderHook(({ on }: { on: boolean }) => usePocketMode(on), {
    initialProps: { on: active },
  });
  await act(() => hook.result.current.enter());
  await waitFor(() =>
    expect(setBrightness).toHaveBeenLastCalledWith(POCKET_BRIGHTNESS),
  );
  return hook;
}

test("entering keeps the screen on and dims it to the minimum", async () => {
  const { result } = await entered();
  expect(result.current.on).toBe(true);
  expect(activate).toHaveBeenCalledWith(KEEP_AWAKE_TAG);
  expect(setBrightness).toHaveBeenCalledTimes(1);
});

test("leaving gives back the brightness it found and lets the screen sleep", async () => {
  const { result } = await entered();
  await act(() => result.current.exit());
  expect(result.current.on).toBe(false);
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);
  expect(deactivate).toHaveBeenCalledWith(KEEP_AWAKE_TAG);
});

test("the end of navigation ends pocket mode", async () => {
  const { result, rerender } = await entered();
  await rerender({ on: false });
  expect(result.current.on).toBe(false);
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);
  expect(deactivate).toHaveBeenCalledTimes(1);
});

test("Stop, which removes the screen, gives the brightness back", async () => {
  const { unmount } = await entered();
  await unmount();
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);
  expect(deactivate).toHaveBeenCalledWith(KEEP_AWAKE_TAG);
  expect(removeAppState).toHaveBeenCalled();
});

test("the app in the background ends pocket mode", async () => {
  const { result } = await entered();
  await act(() => appState("inactive"));
  await act(() => appState("background"));
  expect(result.current.on).toBe(false);
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);
  expect(deactivate).toHaveBeenCalledTimes(1);
});

test("the control centre gives the brightness back until the app returns", async () => {
  const { result } = await entered();
  await act(() => appState("inactive"));
  expect(result.current.on).toBe(true);
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);

  await act(() => appState("active"));
  await waitFor(() =>
    expect(setBrightness).toHaveBeenLastCalledWith(POCKET_BRIGHTNESS),
  );
  expect(getBrightness).toHaveBeenCalledTimes(2);
  expect(deactivate).not.toHaveBeenCalled();
});

test("entering twice does not save the dimmed brightness", async () => {
  const { result } = await entered();
  await act(() => result.current.enter());
  await act(() => appState("active"));
  await act(() => result.current.exit());
  expect(getBrightness).toHaveBeenCalledTimes(1);
  expect(setBrightness).toHaveBeenLastCalledWith(0.7);
});

test("a late brightness reading after leaving does not dim the screen", async () => {
  let answer: (value: number) => void = () => {};
  getBrightness.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const { result } = await renderHook(() => usePocketMode(true));
  await act(() => result.current.enter());
  await act(() => result.current.exit());
  await act(async () => answer(0.7));
  expect(setBrightness).not.toHaveBeenCalled();
});

test("without a route to follow pocket mode does not start", async () => {
  const { result } = await renderHook(() => usePocketMode(false));
  await act(() => result.current.enter());
  expect(result.current.on).toBe(false);
  expect(activate).not.toHaveBeenCalled();
  expect(getBrightness).not.toHaveBeenCalled();
});

test("a phone without brightness control still goes black", async () => {
  getBrightness.mockRejectedValue(new Error("unavailable"));
  const { result } = await renderHook(() => usePocketMode(true));
  await act(() => result.current.enter());
  expect(result.current.on).toBe(true);
  await act(() => result.current.exit());
  expect(setBrightness).not.toHaveBeenCalled();
});
