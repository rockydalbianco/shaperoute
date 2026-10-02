import { render, screen } from "@testing-library/react-native";

import { FeedPost, postFacts, shapeLabel } from "./FeedPost";
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

test("a screen reader hears the drawing as one thing", async () => {
  await render(<FeedPost post={POST} width={358} />);
  expect(
    screen.getByLabelText(
      "fede_km in Firenze: Dog walk, without the dog. Dog head · 10.5 km · 1 h 04 min. Score 92 out of 100.",
    ),
  ).toBeOnTheScreen();
});
