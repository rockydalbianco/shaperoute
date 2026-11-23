import { act, render, screen } from "@testing-library/react-native";
import { Keyboard, Platform, Pressable, StyleSheet, Text } from "react-native";

import { runAnimationsOnJs } from "./animationsOnJs.testing";
import {
  closesOnRelease,
  EDGE_BACK_DIM,
  EDGE_BACK_WIDTH,
  EdgeBack,
  startsEdgeBack,
} from "./EdgeBack";
import { motion } from "../theme/tokens";
import { useReduceMotion } from "./useReduceMotion";

// The way back from the left edge on iOS (TASK-470 E, the user's choice of
// 2026-11-12, «A, la pagina segue»): the page follows the finger, and past a
// third of the screen or flicked it closes as its «←»; else it comes back.

jest.mock("./useReduceMotion");

// The window of the tests (react-native's jest setup).
const WIDTH = 750;
const FRAME = 16;

/** One finger, as the responder system tells it to the views: the touch
 * history `PanResponder` reads. */
class Finger {
  private bank = {
    touchActive: true,
    startPageX: 0,
    startPageY: 0,
    startTimeStamp: 0,
    currentPageX: 0,
    currentPageY: 0,
    currentTimeStamp: 0,
    previousPageX: 0,
    previousPageY: 0,
    previousTimeStamp: 0,
  };
  private time = 1000;

  constructor(private readonly view: () => { props: Record<string, unknown> }) {}

  private event() {
    const { currentPageX: pageX, currentPageY: pageY } = this.bank;
    return {
      nativeEvent: { touches: [{ pageX, pageY }], pageX, pageY },
      touchHistory: {
        numberActiveTouches: this.bank.touchActive ? 1 : 0,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: this.time,
        touchBank: [{ ...this.bank }],
      },
    };
  }

  private async call(name: string): Promise<unknown> {
    const handler = this.view().props[name] as
      ((event: unknown) => unknown) | undefined;
    let result: unknown;
    await act(() => {
      result = handler?.(this.event());
    });
    return result;
  }

  async down(x: number, y = 400) {
    this.time += FRAME;
    Object.assign(this.bank, {
      touchActive: true,
      startPageX: x,
      startPageY: y,
      startTimeStamp: this.time,
      currentPageX: x,
      currentPageY: y,
      currentTimeStamp: this.time,
      previousPageX: x,
      previousPageY: y,
      previousTimeStamp: this.time,
    });
    await this.call("onStartShouldSetResponderCapture");
    await this.call("onStartShouldSetResponder");
  }

  private granted = false;

  /** Moves to `x`, `ms` after the last; true once the page has the finger. */
  async move(x: number, y = 400, ms = FRAME): Promise<boolean> {
    this.time += ms;
    Object.assign(this.bank, {
      previousPageX: this.bank.currentPageX,
      previousPageY: this.bank.currentPageY,
      previousTimeStamp: this.bank.currentTimeStamp,
      currentPageX: x,
      currentPageY: y,
      currentTimeStamp: this.time,
    });
    if (!this.granted) {
      if ((await this.call("onMoveShouldSetResponderCapture")) === true) {
        this.granted = true;
        await this.call("onResponderGrant");
      }
      return this.granted;
    }
    await this.call("onResponderMove");
    return true;
  }

  async up() {
    this.time += FRAME;
    this.bank.touchActive = false;
    this.bank.currentTimeStamp = this.time;
    if (this.granted) {
      await this.call("onResponderRelease");
    }
  }
}

function pageX(): number {
  const style = StyleSheet.flatten(screen.getByTestId("page").props.style) as {
    transform?: { translateX: number }[];
  };
  return style.transform?.[0]?.translateX ?? 0;
}

function pageOpacity(): number {
  const style = StyleSheet.flatten(screen.getByTestId("page").props.style) as {
    opacity?: number;
  };
  return style.opacity ?? 1;
}

function dim(): number {
  const style = StyleSheet.flatten(
    screen.getByTestId("page-dim", { includeHiddenElements: true }).props.style,
  ) as {
    opacity: number;
  };
  return style.opacity;
}

async function frames(count: number) {
  for (let i = 0; i < count; i += 1) {
    await act(() => jest.advanceTimersByTimeAsync(FRAME));
  }
}

async function page(onBack: () => void, enabled = true) {
  await render(
    <EdgeBack onBack={onBack} enabled={enabled} testID="page">
      <Text>Settings</Text>
    </EdgeBack>,
  );
  return new Finger(() => screen.getByTestId("page"));
}

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  jest.mocked(useReduceMotion).mockReturnValue(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("from the left edge, to the right: the way back; from further in, or down, not", () => {
  expect(startsEdgeBack({ moveX: 30, dx: 20, dy: 2 })).toBe(true);
  expect(startsEdgeBack({ moveX: 60, dx: 20, dy: 2 })).toBe(false);
  // A touch on the «←» near the edge: it has hardly moved.
  expect(startsEdgeBack({ moveX: 14, dx: 4, dy: 0 })).toBe(false);
  // Down the page, a scroll.
  expect(startsEdgeBack({ moveX: 20, dx: 12, dy: 30 })).toBe(false);
  // To the left.
  expect(startsEdgeBack({ moveX: 0, dx: -12, dy: 0 })).toBe(false);
});

test("let go past a third, or flicked, the page closes; else it comes back", () => {
  expect(closesOnRelease(WIDTH / 3 + 1, 0, WIDTH)).toBe(true);
  expect(closesOnRelease(WIDTH / 3 - 1, 0, WIDTH)).toBe(false);
  expect(closesOnRelease(80, 0.9, WIDTH)).toBe(true);
  expect(closesOnRelease(80, 0.2, WIDTH)).toBe(false);
});

test("the page follows the finger from the edge, the app dark under it, and past a third it goes", async () => {
  const onBack = jest.fn();
  const finger = await page(onBack);
  expect(dim()).toBe(0);

  await finger.down(EDGE_BACK_WIDTH / 2);
  expect(await finger.move(EDGE_BACK_WIDTH / 2 + 12)).toBe(true);
  // From where the finger is, no jump back by the way it went first.
  await finger.move(200, 400, 100);
  await frames(1);
  expect(pageX()).toBeCloseTo(200 - EDGE_BACK_WIDTH / 2, 0);
  expect(dim()).toBeGreaterThan(0);
  expect(dim()).toBeLessThanOrEqual(EDGE_BACK_DIM);

  await finger.move(400, 400, 200);
  await finger.up();
  expect(onBack).not.toHaveBeenCalled();
  // Out of sight as a sheet goes, and closed then, not a spring's rest later.
  await frames(Math.ceil(motion.sheetMs / FRAME) + 2);
  expect(onBack).toHaveBeenCalledTimes(1);
  // The page that stays (its content changed) is in its place again.
  expect(pageX()).toBe(0);
});

test("let go before a third, slowly, the page comes back and stays open", async () => {
  const onBack = jest.fn();
  const finger = await page(onBack);
  await finger.down(10);
  await finger.move(30);
  await finger.move(150, 400, 300);
  await finger.move(160, 400, 300);
  await finger.up();
  const xs: number[] = [];
  for (let i = 0; i < 60; i += 1) {
    await frames(1);
    xs.push(pageX());
  }
  expect(onBack).not.toHaveBeenCalled();
  expect(pageX()).toBeCloseTo(0, 0);
  // On `glide`: back, never past its place.
  expect(Math.min(...xs)).toBeGreaterThan(-0.5);
});

test("a finger from further in, or down the page, is the page's own", async () => {
  const onBack = jest.fn();
  let finger = await page(onBack);
  await finger.down(120);
  expect(await finger.move(300)).toBe(false);
  await finger.up();

  finger = new Finger(() => screen.getByTestId("page"));
  await finger.down(10, 300);
  expect(await finger.move(16, 380)).toBe(false);
  await finger.up();
  expect(onBack).not.toHaveBeenCalled();
  expect(pageX()).toBe(0);
});

test("with «Reduce Motion» the page fades instead of sliding", async () => {
  jest.mocked(useReduceMotion).mockReturnValue(true);
  const onBack = jest.fn();
  const finger = await page(onBack);
  await finger.down(10);
  await finger.move(30);
  await finger.move(400, 400, 200);
  await frames(1);
  expect(pageX()).toBe(0);
  expect(pageOpacity()).toBeLessThan(1);
  await finger.up();
  await frames(30);
  expect(onBack).toHaveBeenCalledTimes(1);
});

test("off where it is not asked for, and on Android, which has its own back", async () => {
  const onBack = jest.fn();
  let finger = await page(onBack, false);
  await finger.down(10);
  expect(await finger.move(60)).toBe(false);

  const os = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
  try {
    finger = await page(onBack);
    await finger.down(10);
    expect(await finger.move(60)).toBe(false);
  } finally {
    Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  }
  expect(onBack).not.toHaveBeenCalled();
});

test("the keyboard goes as the finger takes the page", async () => {
  const dismiss = jest.spyOn(Keyboard, "dismiss");
  const finger = await page(jest.fn());
  await finger.down(10);
  expect(dismiss).not.toHaveBeenCalled();
  await finger.move(40);
  expect(dismiss).toHaveBeenCalledTimes(1);
});

test("VoiceOver still finds the page's «←»: the way back hides nothing", async () => {
  const onBack = jest.fn();
  await render(
    <EdgeBack onBack={onBack} testID="page">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
      />
      <Text>Settings</Text>
    </EdgeBack>,
  );
  expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  expect(screen.getByTestId("page").props.accessible).toBeFalsy();
  // The shade is no element of the page.
  expect(
    screen.getByTestId("page-dim", { includeHiddenElements: true }).props
      .accessibilityElementsHidden,
  ).toBe(true);
});
