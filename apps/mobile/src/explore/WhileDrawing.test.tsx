import { render, renderHook, screen } from "@testing-library/react-native";

import { SAMPLE_FEED, type SamplePost } from "../feed/sampleFeed";
import type { Example } from "./exampleRoutes";
import {
  POSTS_SHOWN,
  postsFor,
  stillDrawing,
  useWaited,
  WhileDrawing,
} from "./WhileDrawing";

const VERCELLI = "45.3252,8.4228";
const PERGINE = "46.0635,11.2378";

function post(id: string): SamplePost {
  return {
    id,
    user: "runner",
    title: id,
    city: "trento",
    shape: "heart",
    route_m: 5000,
    minutes: 30,
    score: 90,
    line: [
      [46, 11],
      [46.01, 11],
    ],
  };
}

test("examples are still drawing while one waits or is being drawn", () => {
  const ready = { shape: "heart", status: "ready" } as Example;
  expect(stillDrawing(null)).toBe(false);
  expect(stillDrawing([ready])).toBe(false);
  expect(stillDrawing([ready, { shape: "circle", status: "drawing" }])).toBe(true);
  expect(stillDrawing([ready, { shape: "star", status: "waiting" }])).toBe(true);
  expect(stillDrawing([{ shape: "heart", status: "failed", message: "No map" }])).toBe(
    false,
  );
});

test("a city shows drawings of the feed, in its order, the same every time", () => {
  const shown = postsFor(VERCELLI);
  expect(shown).toHaveLength(POSTS_SHOWN);
  expect(new Set(shown.map((p) => p.id)).size).toBe(POSTS_SHOWN);
  expect(postsFor(VERCELLI)).toEqual(shown);
  const first = SAMPLE_FEED.indexOf(shown[0]);
  expect(shown).toEqual(
    Array.from(
      { length: POSTS_SHOWN },
      (_, i) => SAMPLE_FEED[(first + i) % SAMPLE_FEED.length],
    ),
  );
});

test("another city starts from another drawing", () => {
  expect(postsFor(PERGINE)[0].id).not.toBe(postsFor(VERCELLI)[0].id);
});

test("a short feed is shown once, an empty one not at all", () => {
  const feed = [post("a"), post("b")];
  expect(
    postsFor(VERCELLI, feed)
      .map((p) => p.id)
      .sort(),
  ).toEqual(["a", "b"]);
  expect(postsFor(VERCELLI, [])).toEqual([]);
});

test("the wait lasts until another city, not until the last example", async () => {
  const { result, rerender } = await renderHook(
    ({ key, drawing }: { key: string | null; drawing: boolean }) =>
      useWaited(key, drawing),
    { initialProps: { key: VERCELLI as string | null, drawing: false } },
  );
  // Examples already on the phone: nothing to wait for.
  expect(result.current).toBe(false);
  await rerender({ key: VERCELLI, drawing: true });
  expect(result.current).toBe(true);
  await rerender({ key: VERCELLI, drawing: false });
  expect(result.current).toBe(true);
  await rerender({ key: PERGINE, drawing: false });
  expect(result.current).toBe(false);
  await rerender({ key: null, drawing: false });
  expect(result.current).toBe(false);
});

test("shows the drawings as «Feed» does, under a line that says why", async () => {
  await render(<WhileDrawing cityKey={VERCELLI} drawing />);
  expect(screen.getByText("MEANWHILE, FROM THE FEED")).toBeOnTheScreen();
  expect(screen.getByText(/the map has to download/)).toBeOnTheScreen();
  expect(screen.getAllByTestId("feed-post")).toHaveLength(POSTS_SHOWN);
  expect(screen.getByText(postsFor(VERCELLI)[0].title)).toBeOnTheScreen();
});

test("with every example drawn the line says where they are, not to wait", async () => {
  await render(<WhileDrawing cityKey={VERCELLI} drawing={false} />);
  expect(
    screen.getByText("The shapes of this city are ready above."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/the map has to download/)).toBeNull();
  expect(screen.getAllByTestId("feed-post")).toHaveLength(POSTS_SHOWN);
});
