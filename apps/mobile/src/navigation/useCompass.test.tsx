import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";

import { COMPASS_EVERY_MS } from "./headingUp";
import { useCompass } from "./useCompass";

jest.mock("expo-location", () => ({
  watchHeadingAsync: jest.fn(),
}));

const watchHeading = jest.mocked(Location.watchHeadingAsync);

type Heading = Parameters<Parameters<typeof Location.watchHeadingAsync>[0]>[0];

/** The compass of the test: the last callback given, and its subscription. */
let needle: ((heading: Heading) => void) | null = null;
const remove = jest.fn();

beforeEach(() => {
  needle = null;
  remove.mockClear();
  watchHeading.mockReset();
  watchHeading.mockImplementation(async (callback) => {
    needle = callback;
    return { remove };
  });
  jest.useFakeTimers({ now: 1_700_000_000_000 });
});

afterEach(() => {
  jest.useRealTimers();
});

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

test("on, the compass is watched and its readings come through; off, it is let go", async () => {
  const { result, rerender } = await renderHook(
    ({ on }: { on: boolean }) => useCompass(on),
    {
      initialProps: { on: true },
    },
  );
  await flush();
  expect(watchHeading).toHaveBeenCalledTimes(1);
  expect(result.current).toBeNull();

  await act(async () => {
    needle?.({ trueHeading: 42, magHeading: 45, accuracy: 3 });
  });
  expect(result.current).toEqual({
    trueHeading: 42,
    magHeading: 45,
    accuracy: 3,
    atMs: 1_700_000_000_000,
  });

  await rerender({ on: false });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(result.current).toBeNull();
});

test("a reading that barely moved, or came too soon, is not drawn", async () => {
  const { result } = await renderHook(() => useCompass(true));
  await flush();
  await act(async () => {
    needle?.({ trueHeading: 100, magHeading: 100, accuracy: 3 });
  });
  // Too soon, however far.
  await act(async () => {
    jest.advanceTimersByTime(COMPASS_EVERY_MS - 1);
    needle?.({ trueHeading: 140, magHeading: 140, accuracy: 3 });
  });
  expect(result.current?.trueHeading).toBe(100);
  // Late enough, but barely moved.
  await act(async () => {
    jest.advanceTimersByTime(1);
    needle?.({ trueHeading: 101, magHeading: 101, accuracy: 3 });
  });
  expect(result.current?.trueHeading).toBe(100);
  await act(async () => {
    needle?.({ trueHeading: 110, magHeading: 110, accuracy: 3 });
  });
  expect(result.current?.trueHeading).toBe(110);
});

test("off, nothing is watched", async () => {
  const { result } = await renderHook(() => useCompass(false));
  await flush();
  expect(watchHeading).not.toHaveBeenCalled();
  expect(result.current).toBeNull();
});

test("a compass that refuses gives nothing, and no error", async () => {
  watchHeading.mockRejectedValueOnce(new Error("no compass"));
  const { result } = await renderHook(() => useCompass(true));
  await flush();
  expect(result.current).toBeNull();
});

test("a subscription that arrives after the compass is turned off is removed at once", async () => {
  let give: ((made: { remove: () => void }) => void) | null = null;
  watchHeading.mockImplementation(
    () =>
      new Promise((resolve) => {
        give = resolve;
      }),
  );
  const { unmount } = await renderHook(() => useCompass(true));
  await act(async () => {
    unmount();
  });
  await act(async () => {
    give?.({ remove });
    await Promise.resolve();
  });
  expect(remove).toHaveBeenCalledTimes(1);
});
