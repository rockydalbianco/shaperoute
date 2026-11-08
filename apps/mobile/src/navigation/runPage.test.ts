import { act, renderHook } from "@testing-library/react-native";

import {
  FIRST_PAGE,
  pageAfter,
  pageBefore,
  RUN_PAGES,
  runPage,
  setRunPage,
  swipedTo,
  useRunPage,
} from "./runPage";

afterEach(() => setRunPage(FIRST_PAGE));

test("the three pages lie Compass, Map, Data, and a run opens on Map", () => {
  expect(RUN_PAGES).toEqual(["compass", "map", "data"]);
  expect(FIRST_PAGE).toBe("map");
  expect(pageAfter("compass")).toBe("map");
  expect(pageAfter("map")).toBe("data");
  expect(pageAfter("data")).toBeNull();
  expect(pageBefore("compass")).toBeNull();
  expect(pageBefore("map")).toBe("compass");
  expect(pageBefore("data")).toBe("map");
});

test("a swipe is sideways and long enough: left for the page on the right, right for the one on the left", () => {
  expect(swipedTo(-80, 5, "map")).toBe("data");
  expect(swipedTo(80, -5, "map")).toBe("compass");
  expect(swipedTo(-80, 0, "compass")).toBe("map");
  expect(swipedTo(80, 0, "data")).toBe("map");
  // From Map, as before TASK-422.
  expect(swipedTo(-80, 5)).toBe("data");
});

test("past the ends a swipe asks for nothing, nor does a short or slanted one", () => {
  expect(swipedTo(80, 0, "compass")).toBeNull();
  expect(swipedTo(-80, 0, "data")).toBeNull();
  expect(swipedTo(-30, 0, "map")).toBeNull();
  expect(swipedTo(-80, 60, "map")).toBeNull();
  expect(swipedTo(0, 0, "map")).toBeNull();
});

test("the page open is one for the run, and a screen follows it", async () => {
  const { result } = await renderHook(() => useRunPage());
  expect(result.current).toBe("map");
  await act(async () => {
    setRunPage("compass");
  });
  expect(result.current).toBe("compass");
  expect(runPage()).toBe("compass");
});
