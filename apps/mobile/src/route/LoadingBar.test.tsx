import { act, render, screen } from "@testing-library/react-native";

import {
  LoadingBar,
  MapLoadingBar,
  ReadingBar,
  SLOW_TEXT,
  TICK_MS,
} from "./LoadingBar";

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

function text(id: string): unknown {
  return screen.getByTestId(id).props.accessibilityValue.text;
}

test("an API that does not answer: the bar says it is still waiting", async () => {
  await render(<LoadingBar phase="sending" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(4_000));
  expect(text("loading")).toBeUndefined();

  await act(() => jest.advanceTimersByTimeAsync(5_000));
  expect(text("loading")).toBe(SLOW_TEXT);
  expect(now()).toBeLessThanOrEqual(8);
});

test("the answer moves the bar on, and it stops saying it is waiting", async () => {
  const { rerender } = await render(<LoadingBar phase="sending" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(10_000));
  expect(text("loading")).toBe(SLOW_TEXT);
  await rerender(<LoadingBar phase="computing" distanceM={5000} />);
  await act(() => jest.advanceTimersByTimeAsync(TICK_MS));
  expect(text("loading")).toBeUndefined();
  expect(now()).toBeGreaterThanOrEqual(45);
});

test("a word gets longer before the bar says it is still waiting", async () => {
  // A 15 km shape is slow after 75 s; "CIAO" after twice 80 s.
  await render(<LoadingBar phase="computing" distanceM={15000} word="CIAO" />);
  await act(() => jest.advanceTimersByTimeAsync(100_000));
  expect(text("loading")).toBeUndefined();

  await act(() => jest.advanceTimersByTimeAsync(60_000));
  expect(text("loading")).toBe(SLOW_TEXT);
});

test("the AI's reading and the map have their own bars", async () => {
  await render(
    <>
      <ReadingBar />
      <MapLoadingBar />
    </>,
  );
  const reading = () =>
    screen.getByTestId("reading-loading").props.accessibilityValue.now;
  const map = () => screen.getByTestId("map-loading").props.accessibilityValue.now;
  expect(reading()).toBe(0);
  expect(map()).toBe(0);

  await act(() => jest.advanceTimersByTimeAsync(5_000));
  expect(map()).toBeGreaterThan(reading());
  expect(map()).toBeLessThan(95);

  await act(() => jest.advanceTimersByTimeAsync(60_000));
  expect(text("map-loading")).toBe(SLOW_TEXT);
  expect(text("reading-loading")).toBe(SLOW_TEXT);
  expect(reading()).toBeLessThanOrEqual(95);
});
