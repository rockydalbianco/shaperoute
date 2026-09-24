import { act, render, screen } from "@testing-library/react-native";

import { LoadingBar, TICK_MS } from "./LoadingBar";

function now(): number {
  return screen.getByRole("progressbar").props.accessibilityValue.now as number;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("fills as the time passes, and never goes back", async () => {
  await render(<LoadingBar phase="computing" distanceM={5000} />);
  const start = now();
  expect(start).toBe(45);

  await act(() => jest.advanceTimersByTimeAsync(10_000));
  const later = now();
  expect(later).toBeGreaterThan(start);
  expect(later).toBeLessThan(95);
});

test("a new phase starts from its own beginning, never below what was shown", async () => {
  const { rerender } = await render(<LoadingBar phase="queued" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(TICK_MS * 4));
  await rerender(<LoadingBar phase="downloading_map" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(TICK_MS));
  expect(now()).toBeGreaterThanOrEqual(8);

  await act(() => jest.advanceTimersByTimeAsync(60_000));
  await rerender(<LoadingBar phase="computing" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(TICK_MS));
  expect(now()).toBeGreaterThanOrEqual(45);
});
