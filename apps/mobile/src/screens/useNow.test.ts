import { act, renderHook } from "@testing-library/react-native";

import { countdownNumber } from "./Countdown";
import { useNow } from "./RunPanel";

const NOW = Date.UTC(2026, 9, 6, 7, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
});

afterEach(() => {
  jest.useRealTimers();
});

test("turned on, the clock is read again at once: the countdown starts at 3 (TASK-254)", async () => {
  const { result, rerender } = await renderHook<number, { on: boolean }>(
    ({ on }) => useNow(on, 100),
    {
      initialProps: { on: false },
    },
  );
  expect(result.current).toBe(NOW);
  // The screen was open for a while before «Start».
  await act(async () => {
    await jest.advanceTimersByTimeAsync(12_000);
  });
  expect(result.current).toBe(NOW);
  await rerender({ on: true });
  expect(result.current).toBe(NOW + 12_000);
  expect(countdownNumber(Date.now() + 3_000 - result.current)).toBe(3);
  // Then every tick.
  await act(async () => {
    await jest.advanceTimersByTimeAsync(250);
  });
  expect(result.current).toBe(NOW + 12_200);
  // Off, it stands still; on again, it is read again.
  await rerender({ on: false });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5_000);
  });
  expect(result.current).toBe(NOW + 12_200);
  await rerender({ on: true });
  expect(result.current).toBe(NOW + 17_250);
});
