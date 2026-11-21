import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { motion } from "../theme/tokens";
import { runAnimationsOnJs } from "./animationsOnJs.testing";
import { SHEET_GONE, SheetModal } from "./SheetModal";
import { useReduceMotion } from "./useReduceMotion";

// A sheet that closes (TASK-470 C): its clear Modal takes every touch while
// it is there, seen or not. It once stayed until the spring rested, 573 ms
// after the close on the simulator, while the sheet was out of sight after
// a tenth or two of a second: a touch in between was lost. Now the Modal
// goes as the sheet leaves the screen.

jest.mock("./useReduceMotion");
const reduceMotion = jest.mocked(useReduceMotion);

const FRAME = 16;
// The window of the jest preset.
const HEIGHT = 1334;

function lift(): number {
  const style = StyleSheet.flatten(screen.getByTestId("sheet").props.style) as {
    transform?: { translateY: number }[];
  };
  return style.transform?.[0].translateY ?? 0;
}

function modalOn(): boolean {
  // The Modal of the jest preset draws nothing while it is not visible.
  return screen.queryByText("Filters") !== null;
}

function Screen({
  open,
  onTab,
  onHidden,
}: {
  open: boolean;
  onTab: () => void;
  onHidden?: () => void;
}) {
  return (
    <View>
      <Pressable accessibilityRole="tab" accessibilityLabel="Feed" onPress={onTab} />
      <SheetModal
        visible={open}
        onRequestClose={() => {}}
        onHidden={onHidden}
        testID="sheet"
      >
        <Text>Filters</Text>
      </SheetModal>
    </View>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  reduceMotion.mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("closing, the Modal goes as soon as the sheet is out of sight, not at the spring's rest", async () => {
  const onHidden = jest.fn();
  const view = await render(<Screen open onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(1500));
  await view.rerender(<Screen open={false} onTab={jest.fn()} onHidden={onHidden} />);

  let ms = 0;
  let last = 0;
  while (modalOn() && ms < 1000) {
    last = lift();
    await act(() => jest.advanceTimersByTimeAsync(FRAME));
    ms += FRAME;
  }
  // Gone well before the spring rests (about 570 ms), as a sheet goes.
  expect(ms).toBeLessThanOrEqual(320);
  expect(ms).toBeGreaterThan(motion.pressMs);
  // And not before: the frame before, the sheet was nine tenths down or close.
  expect(last).toBeGreaterThan(HEIGHT * (1 - SHEET_GONE) * 0.95);
  expect(onHidden).toHaveBeenCalledTimes(1);
  // Nothing more when the spring would have rested.
  await act(() => jest.advanceTimersByTimeAsync(1000));
  expect(onHidden).toHaveBeenCalledTimes(1);
});

test("a touch right after the sheet is gone reaches the page under it", async () => {
  const onTab = jest.fn();
  const view = await render(<Screen open onTab={onTab} />);
  await act(() => jest.advanceTimersByTimeAsync(1500));
  await view.rerender(<Screen open={false} onTab={onTab} />);
  await act(() => jest.advanceTimersByTimeAsync(320));
  // On the phone a Modal on screen would take this touch.
  expect(modalOn()).toBe(false);
  await fireEvent.press(screen.getByRole("tab", { name: "Feed" }));
  expect(onTab).toHaveBeenCalledTimes(1);
});

test("opened again before it is gone, it comes back, and the Modal stays", async () => {
  const onHidden = jest.fn();
  const view = await render(<Screen open onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(1500));
  await view.rerender(<Screen open={false} onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(5 * FRAME));
  await view.rerender(<Screen open onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(1500));
  expect(modalOn()).toBe(true);
  expect(lift()).toBeCloseTo(0, 0);
  expect(onHidden).not.toHaveBeenCalled();
});

test("closed and opened again after it is gone, it comes up from below as the first time", async () => {
  const view = await render(<Screen open onTab={jest.fn()} />);
  await act(() => jest.advanceTimersByTimeAsync(1500));
  await view.rerender(<Screen open={false} onTab={jest.fn()} />);
  await act(() => jest.advanceTimersByTimeAsync(400));
  expect(modalOn()).toBe(false);
  await view.rerender(<Screen open onTab={jest.fn()} />);
  await act(() => jest.advanceTimersByTimeAsync(FRAME));
  // From the bottom edge, not from a tenth of the way up.
  expect(lift()).toBeGreaterThan(HEIGHT * 0.95);
});

test("with «Reduce Motion» it fades out whole, then the Modal goes", async () => {
  reduceMotion.mockReturnValue(true);
  const onHidden = jest.fn();
  const view = await render(<Screen open onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(500));
  await view.rerender(<Screen open={false} onTab={jest.fn()} onHidden={onHidden} />);
  await act(() => jest.advanceTimersByTimeAsync(motion.pressMs / 2));
  expect(onHidden).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTimeAsync(motion.pressMs));
  expect(onHidden).toHaveBeenCalledTimes(1);
});
