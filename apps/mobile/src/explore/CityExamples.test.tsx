import type { RouteResult } from "@shaperoute/shared-types";
import fixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Place } from "../places/photon";
import { asRecommended, type Example } from "./exampleRoutes";
import { CityExamples } from "./CityExamples";

const vercelli: Place = {
  label: "Vercelli, Piedmont, Italy",
  point: [45.3252, 8.4228],
};
const result = fixture as unknown as RouteResult;
const heart = asRecommended(vercelli, "heart", result).route;

test("one card per shape: ready opens, the others say where they are", async () => {
  const onOpen = jest.fn();
  const examples: Example[] = [
    { shape: "heart", status: "ready", route: heart },
    { shape: "circle", status: "drawing" },
    { shape: "star", status: "waiting" },
  ];
  await render(
    <CityExamples
      city={vercelli}
      examples={examples}
      onOpen={onOpen}
      onRetry={jest.fn()}
    />,
  );
  expect(screen.getByText("EXAMPLES IN VERCELLI")).toBeOnTheScreen();
  const km = (result.distance_m / 1000).toFixed(1);
  expect(screen.getByText(`Heart · ${km} km`)).toBeOnTheScreen();
  expect(screen.getByText(`${Math.round(result.similarity * 100)}%`)).toBeOnTheScreen();
  expect(screen.getByText("Drawing…")).toBeOnTheScreen();
  expect(screen.getByText("Next")).toBeOnTheScreen();
  expect(screen.queryByText("Try again")).toBeNull();
  await fireEvent.press(screen.getByLabelText(`Heart, ${km} km`));
  expect(onOpen).toHaveBeenCalledWith(heart);
});

test("what failed says why, once, with Try again", async () => {
  const onRetry = jest.fn();
  const message = "Map data for this area could not be downloaded. Try again later.";
  const examples: Example[] = [
    { shape: "heart", status: "failed", message },
    { shape: "circle", status: "failed", message },
    { shape: "star", status: "failed", message },
  ];
  await render(
    <CityExamples
      city={vercelli}
      examples={examples}
      onOpen={jest.fn()}
      onRetry={onRetry}
    />,
  );
  expect(screen.getAllByText(message)).toHaveLength(1);
  expect(screen.getAllByText("Not drawn")).toHaveLength(3);
  await fireEvent.press(screen.getByText("Try again"));
  expect(onRetry).toHaveBeenCalled();
});
