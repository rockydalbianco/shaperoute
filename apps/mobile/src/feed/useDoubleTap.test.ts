import { act, renderHook } from "@testing-library/react-native";

import { DOUBLE_TAP_MS, useDoubleTap } from "./useDoubleTap";

// Taps on the picture of a post: two are its super like, one waits to know
// it is alone (TASK-454 part B).

const alone = jest.fn();
const twice = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  alone.mockClear();
  twice.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function wait(ms: number) {
  return act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

test("one tap does what it does alone, once no second came", async () => {
  const { result } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  await wait(DOUBLE_TAP_MS - 1);
  expect(alone).not.toHaveBeenCalled();
  await wait(1);
  expect(alone).toHaveBeenCalledTimes(1);
  expect(twice).not.toHaveBeenCalled();
});

test("two taps in time are a double tap, and neither is one alone", async () => {
  const { result } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  await wait(DOUBLE_TAP_MS - 1);
  result.current(alone);
  expect(twice).toHaveBeenCalledTimes(1);
  await wait(DOUBLE_TAP_MS * 2);
  expect(alone).not.toHaveBeenCalled();
  expect(twice).toHaveBeenCalledTimes(1);
});

test("two taps too far apart are two taps alone", async () => {
  const { result } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  await wait(DOUBLE_TAP_MS);
  result.current(alone);
  await wait(DOUBLE_TAP_MS);
  expect(alone).toHaveBeenCalledTimes(2);
  expect(twice).not.toHaveBeenCalled();
});

test("a third tap starts again: it waits for a fourth", async () => {
  const { result } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  result.current(alone);
  result.current(alone);
  expect(twice).toHaveBeenCalledTimes(1);
  await wait(DOUBLE_TAP_MS);
  expect(alone).toHaveBeenCalledTimes(1);
});

test("the tap that waits does what it would do, not what the next would", async () => {
  const other = jest.fn();
  const { result } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  await wait(DOUBLE_TAP_MS);
  result.current(other);
  await wait(DOUBLE_TAP_MS);
  expect(alone).toHaveBeenCalledTimes(1);
  expect(other).toHaveBeenCalledTimes(1);
});

test("where two taps mean nothing, a tap does not wait", async () => {
  const { result } = await renderHook(() => useDoubleTap(undefined));
  result.current(alone);
  expect(alone).toHaveBeenCalledTimes(1);
  result.current(alone);
  expect(alone).toHaveBeenCalledTimes(2);
});

test("the newest answer to two taps is the one called", async () => {
  const newer = jest.fn();
  const { result, rerender } = await renderHook(
    ({ onDouble }: { onDouble: () => void }) => useDoubleTap(onDouble),
    { initialProps: { onDouble: twice } },
  );
  const tap = result.current;
  await rerender({ onDouble: newer });
  // The same function across renders: a picture's `onPress` does not change.
  expect(result.current).toBe(tap);
  tap(alone);
  tap(alone);
  expect(newer).toHaveBeenCalledTimes(1);
  expect(twice).not.toHaveBeenCalled();
});

test("a picture that goes away takes its waiting tap along", async () => {
  const { result, unmount } = await renderHook(() => useDoubleTap(twice));
  result.current(alone);
  await unmount();
  await wait(DOUBLE_TAP_MS * 2);
  expect(alone).not.toHaveBeenCalled();
});
