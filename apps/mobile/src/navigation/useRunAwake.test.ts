import { renderHook } from "@testing-library/react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { KEEP_AWAKE_TAG } from "./usePocketMode";
import { RUN_AWAKE_TAG, useRunAwake } from "./useRunAwake";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest.mocked(activateKeepAwakeAsync).mockClear();
  jest.mocked(deactivateKeepAwake).mockClear();
});

test("the screen is kept on while the run is live, and let go when it ends", async () => {
  const { rerender, unmount } = await renderHook(
    ({ on }: { on: boolean }) => useRunAwake(on),
    {
      initialProps: { on: true },
    },
  );
  expect(activateKeepAwakeAsync).toHaveBeenCalledWith(RUN_AWAKE_TAG);
  expect(deactivateKeepAwake).not.toHaveBeenCalled();
  await rerender({ on: false });
  expect(deactivateKeepAwake).toHaveBeenCalledWith(RUN_AWAKE_TAG);
  await unmount();
  expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(1);
});

test("leaving the screen mid-run lets it go too", async () => {
  const { unmount } = await renderHook(() => useRunAwake(true));
  await unmount();
  expect(deactivateKeepAwake).toHaveBeenCalledWith(RUN_AWAKE_TAG);
});

test("not live, nothing is asked; and the tag is not pocket mode's", async () => {
  const { unmount } = await renderHook(() => useRunAwake(false));
  expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
  await unmount();
  expect(deactivateKeepAwake).not.toHaveBeenCalled();
  expect(RUN_AWAKE_TAG).not.toBe(KEEP_AWAKE_TAG);
});

test("a phone that refuses does not stop the run", async () => {
  jest.mocked(activateKeepAwakeAsync).mockRejectedValueOnce(new Error("no"));
  jest.mocked(deactivateKeepAwake).mockRejectedValueOnce(new Error("no"));
  const { unmount } = await renderHook(() => useRunAwake(true));
  await unmount();
  await Promise.resolve();
});
