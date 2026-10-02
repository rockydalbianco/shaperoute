import { fireEvent, render, screen } from "@testing-library/react-native";

import { FeedMapShooter, forgetFeedMaps } from "./FeedMaps";
import { FeedPost, MAP_CREDIT, postFacts, shapeLabel } from "./FeedPost";
import type { SamplePost } from "./sampleFeed";

const POST: SamplePost = {
  id: "firenze-dog_head-10000-4",
  user: "fede_km",
  title: "Dog walk, without the dog",
  city: "firenze",
  shape: "dog_head",
  route_m: 10514,
  minutes: 64,
  score: 92,
  // A square: four stretches to draw.
  line: [
    [43.77, 11.25],
    [43.77, 11.26],
    [43.78, 11.26],
    [43.78, 11.25],
    [43.77, 11.25],
  ],
};

beforeEach(() => {
  forgetFeedMaps();
});

test("a shape is written as it is read", () => {
  expect(shapeLabel("dog_head")).toBe("Dog head");
  expect(shapeLabel("moon")).toBe("Moon");
});

test("the facts of a drawing: what, how far, how long", () => {
  expect(postFacts(POST)).toBe("Dog head · 10.5 km · 1 h 04 min");
  expect(postFacts({ ...POST, shape: "moon", route_m: 4884, minutes: 27 })).toBe(
    "Moon · 4.9 km · 27 min",
  );
});

test("shows who ran it and where, the title, the facts and the score", async () => {
  await render(<FeedPost post={POST} width={358} />);
  expect(screen.getByText("fede_km")).toBeOnTheScreen();
  expect(screen.getByText("F")).toBeOnTheScreen();
  expect(screen.getByText("Firenze")).toBeOnTheScreen();
  expect(screen.getByText("Dog walk, without the dog")).toBeOnTheScreen();
  expect(screen.getByText("Dog head · 10.5 km · 1 h 04 min")).toBeOnTheScreen();
  expect(screen.getByText("92")).toBeOnTheScreen();
  expect(screen.getByText("out of 100")).toBeOnTheScreen();
});

test("draws the line, one view for each stretch, as wide as the card", async () => {
  await render(<FeedPost post={POST} width={358} />);
  const drawing = screen.getByTestId("feed-drawing");
  expect(drawing).toHaveStyle({ width: 358, height: 222 });
  // Four stretches, and the score over them.
  expect(drawing.children).toHaveLength(5);
});

test("until its picture is taken there is no map, and no credit for one", async () => {
  await render(<FeedPost post={POST} width={358} />);
  expect(screen.queryByTestId("feed-map")).toBeNull();
  expect(screen.queryByText(MAP_CREDIT)).toBeNull();
});

test("lays the map under the line, and says whose it is", async () => {
  await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <FeedPost post={POST} width={358} />
    </>,
  );
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  const picture = "data:image/jpeg;base64,AAAA";
  await fireEvent(page, "message", {
    nativeEvent: {
      data: JSON.stringify({
        type: "shot",
        key: "firenze-dog_head-10000-4:358x222",
        image: picture,
      }),
    },
  });

  const drawing = screen.getByTestId("feed-drawing");
  // The map, the four stretches, the score, the credit: the map first, so
  // that everything else is over it.
  expect(drawing.children).toHaveLength(7);
  const map = screen.getByTestId("feed-map", { includeHiddenElements: true });
  expect(drawing.children[0]).toBe(map);
  expect(map).toHaveProp("source", { uri: picture });
  expect(map).toHaveStyle({ position: "absolute", left: 0, top: 0 });
  // The makers of the map, named as they ask.
  expect(MAP_CREDIT).toContain("OpenFreeMap");
  expect(MAP_CREDIT).toContain("© OpenMapTiles");
  expect(MAP_CREDIT).toContain("OpenStreetMap");
  expect(screen.getByText(MAP_CREDIT)).toBeOnTheScreen();
});

test("a screen reader hears the drawing as one thing", async () => {
  await render(<FeedPost post={POST} width={358} />);
  expect(
    screen.getByLabelText(
      "fede_km in Firenze: Dog walk, without the dog. Dog head · 10.5 km · 1 h 04 min. Score 92 out of 100.",
    ),
  ).toBeOnTheScreen();
});

test("with nowhere to open it, the drawing is not a button", async () => {
  await render(<FeedPost post={POST} width={358} />);
  expect(screen.queryByRole("button")).toBeNull();
});

test("a tap opens its route, and a screen reader hears where it leads", async () => {
  const onOpen = jest.fn();
  await render(<FeedPost post={POST} width={358} onOpen={onOpen} />);
  const card = screen.getByRole("button", {
    name: "fede_km in Firenze: Dog walk, without the dog. Dog head · 10.5 km · 1 h 04 min. Score 92 out of 100.",
  });
  expect(card).toHaveProp("accessibilityHint", "Opens the route on the map");
  await fireEvent.press(card);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test("a swipe that ends on the card is not a tap", async () => {
  const onOpen = jest.fn();
  await render(<FeedPost post={POST} width={358} onOpen={onOpen} />);
  const card = screen.getByRole("button");
  const at = (pageX: number, pageY: number) => ({ nativeEvent: { pageX, pageY } });

  // Across the card, on the first page: no page moves, the touch ends here.
  await fireEvent(card, "pressIn", at(80, 300));
  await fireEvent.press(card, at(340, 300));
  expect(onOpen).not.toHaveBeenCalled();

  // A finger that trembles has tapped.
  await fireEvent(card, "pressIn", at(80, 300));
  await fireEvent.press(card, at(86, 304));
  expect(onOpen).toHaveBeenCalledTimes(1);
});
