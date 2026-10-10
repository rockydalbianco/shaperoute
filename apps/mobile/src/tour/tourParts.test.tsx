import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

import {
  around,
  type Box,
  locate,
  MEASURE_WAIT_MS,
  type Measurable,
  measure,
  onScreen,
  partNames,
  sameBox,
  SCROLL_REST_MS,
  scrollsBack,
  tourPager,
  tourPart,
  TourScroll,
  TourScrollContext,
  useTourPager,
  useTourPart,
} from "./tourParts";

const SCREEN = { width: 400, height: 800 };

/** A view that is at `box` on the screen. */
function viewAt(box: Box): Measurable & { box: Box } {
  const view = {
    box,
    measureInWindow: (answer: (x: number, y: number, w: number, h: number) => void) =>
      answer(view.box.x, view.box.y, view.box.width, view.box.height),
  };
  return view;
}

/** A scroll as the tour sees it, scrolled down by `offset`. */
function scrollOf(view: object, offset: number): TourScroll {
  const scroll = new TourScroll();
  scroll.hold(view as ScrollView);
  scroll.onScroll({
    nativeEvent: { contentOffset: { x: 0, y: offset } },
  } as NativeSyntheticEvent<NativeScrollEvent>);
  return scroll;
}

/** A screen whose parts sit in `scroll`. */
function inside(scroll: TourScroll) {
  return function Scrolled({ children }: { children: ReactNode }) {
    return (
      <TourScrollContext.Provider value={scroll}>{children}</TourScrollContext.Provider>
    );
  };
}

afterEach(() => {
  jest.useRealTimers();
});

test("boxes are the same to half a point", () => {
  const box = { x: 10, y: 20, width: 30, height: 40 };
  expect(sameBox(box, { ...box, x: 10.3 })).toBe(true);
  expect(sameBox(box, { ...box, y: 21 })).toBe(false);
  expect(sameBox(null, null)).toBe(true);
  expect(sameBox(box, null)).toBe(false);
});

test("the box around boxes holds them all", () => {
  expect(around([])).toBeNull();
  expect(
    around([
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 100, y: 5, width: 10, height: 10 },
    ]),
  ).toEqual({ x: 10, y: 5, width: 100, height: 55 });
});

test("a box on the page next door is not on screen", () => {
  expect(onScreen({ x: 0, y: 10, width: 400, height: 50 }, SCREEN)).toBe(true);
  expect(onScreen({ x: 400, y: 10, width: 400, height: 50 }, SCREEN)).toBe(false);
  expect(onScreen({ x: -400, y: 10, width: 400, height: 50 }, SCREEN)).toBe(false);
});

test("a view that does not answer, or has no size, is not found", async () => {
  jest.useFakeTimers();
  const silent: Measurable = { measureInWindow: () => {} };
  const found = measure(silent);
  jest.advanceTimersByTime(MEASURE_WAIT_MS);
  await expect(found).resolves.toBeNull();
  await expect(
    measure(viewAt({ x: 0, y: 0, width: 0, height: 20 })),
  ).resolves.toBeNull();
});

test("parts are found by their name, together, while they are on screen", async () => {
  tourPart("test-a")(viewAt({ x: 16, y: 100, width: 100, height: 40 }));
  tourPart("test-b")(viewAt({ x: 200, y: 160, width: 100, height: 40 }));
  // On the next page: not shown.
  tourPart("test-c")(viewAt({ x: 416, y: 100, width: 100, height: 40 }));
  await expect(locate(["test-a", "test-b"], SCREEN)).resolves.toEqual({
    box: { x: 16, y: 100, width: 284, height: 100 },
    all: true,
  });
  // Not all of them on screen: the ones that are, and it says so.
  await expect(locate(["test-a", "test-c"], SCREEN)).resolves.toEqual({
    box: { x: 16, y: 100, width: 100, height: 40 },
    all: false,
  });
  await expect(locate(["test-c", "test-missing"], SCREEN)).resolves.toEqual({
    box: null,
    all: false,
  });
  await expect(locate([], SCREEN)).resolves.toEqual({ box: null, all: true });
});

test("a part gone from the screen lets its name go, not another's", async () => {
  const first = viewAt({ x: 0, y: 0, width: 10, height: 10 });
  const { result, rerender, unmount } = await renderHook(
    ({ name }: { name: string }) => useTourPart(name),
    { initialProps: { name: "test-gone" } },
  );
  result.current(first);
  expect(partNames()).toContain("test-gone");
  // The same name taken by another view meanwhile: it stays.
  const second = viewAt({ x: 0, y: 0, width: 10, height: 10 });
  tourPart("test-gone")(second);
  result.current(null);
  expect(partNames()).toContain("test-gone");
  tourPart("test-gone")(null);
  expect(partNames()).not.toContain("test-gone");
  await rerender({ name: "test-gone" });
  await unmount();
});

test("a part below the scroll's foot is scrolled to, and back at the end", async () => {
  jest.useFakeTimers();
  const part = viewAt({ x: 16, y: 900, width: 368, height: 60 });
  const scrollTo = jest.fn((to: { y: number }) => {
    // The scroll moves the part up by as much.
    part.box = { ...part.box, y: 900 - (to.y - 50) };
  });
  const host = viewAt({ x: 0, y: 100, width: 400, height: 600 });
  const scroll = scrollOf({ scrollTo, getNativeScrollRef: () => host }, 50);
  const { result } = await renderHook(() => useTourPart("test-scrolled"), {
    wrapper: inside(scroll),
  });
  result.current(part);
  const found = locate(["test-scrolled"], SCREEN);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SCROLL_REST_MS);
  });
  // 16 points under the scroll's top: 50 + 900 − 100 − 16.
  expect(scrollTo).toHaveBeenCalledWith({ y: 834, animated: true });
  await expect(found).resolves.toEqual({
    box: { x: 16, y: 116, width: 368, height: 60 },
    all: true,
  });
  scrollsBack();
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 0, animated: true });
  // Only once: the scroll is let go.
  scrollsBack();
  expect(scrollTo).toHaveBeenCalledTimes(2);
});

test("a part in sight is not scrolled to", async () => {
  const scrollTo = jest.fn();
  const host = viewAt({ x: 0, y: 100, width: 400, height: 600 });
  const scroll = scrollOf({ scrollTo, getNativeScrollRef: () => host }, 0);
  const { result } = await renderHook(() => useTourPart("test-in-sight"), {
    wrapper: inside(scroll),
  });
  result.current(viewAt({ x: 16, y: 200, width: 368, height: 60 }));
  await expect(locate(["test-in-sight"], SCREEN)).resolves.toEqual({
    box: { x: 16, y: 200, width: 368, height: 60 },
    all: true,
  });
  expect(scrollTo).not.toHaveBeenCalled();
});

test("the pager goes to a page by its title, while it is on screen", async () => {
  const onPage = jest.fn();
  const titles = ["Feed", "Draw", "Explore"];
  const { rerender, unmount } = await renderHook(
    ({ page }: { page: number }) => useTourPager(titles, page, onPage),
    { initialProps: { page: 1 } },
  );
  expect(tourPager()?.shown()).toBe("Draw");
  tourPager()?.show("Explore");
  expect(onPage).toHaveBeenCalledWith(2);
  // The page on screen already: nothing to do.
  await rerender({ page: 2 });
  expect(tourPager()?.shown()).toBe("Explore");
  tourPager()?.show("Explore");
  tourPager()?.show("Nowhere");
  expect(onPage).toHaveBeenCalledTimes(1);
  await unmount();
  expect(tourPager()).toBeNull();
});
