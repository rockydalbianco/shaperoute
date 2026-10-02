import type { RouteResult } from "@shaperoute/shared-types";
import fixture from "@shaperoute/shared-types/fixtures/route-result.json";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { FeedMapShooter, forgetFeedMaps } from "../feed/FeedMaps";
import type { Place } from "../places/photon";
import { asRecommended, type Example } from "./exampleRoutes";
import { CityExamples } from "./CityExamples";
import { CARD_MAPS_CREDIT } from "./RouteCard";

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
  // Where it is, under what it is (TASK-174).
  expect(screen.getByText("Vercelli")).toBeOnTheScreen();
  // A drawn example has a map under it: whose the maps are, once.
  expect(screen.getAllByText(CARD_MAPS_CREDIT)).toHaveLength(1);
  expect(screen.getByText(`${Math.round(result.similarity * 100)}%`)).toBeOnTheScreen();
  expect(screen.getByText("Drawing…")).toBeOnTheScreen();
  expect(screen.getByText("Next")).toBeOnTheScreen();
  expect(screen.queryByText("Try again")).toBeNull();
  // Three cards, two side by side in the section; only the ready one is a button.
  expect(screen.getAllByTestId("route-card")).toHaveLength(3);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  await fireEvent.press(screen.getByLabelText(`Heart, ${km} km`));
  expect(onOpen).toHaveBeenCalledWith(heart);
});

test("only a drawn example asks for the map under its line (TASK-174)", async () => {
  forgetFeedMaps();
  const waiting: Example[] = [
    { shape: "heart", status: "drawing" },
    { shape: "circle", status: "waiting" },
  ];
  const view = await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <CityExamples
        city={vercelli}
        examples={waiting}
        onOpen={jest.fn()}
        onRetry={jest.fn()}
      />
    </>,
  );
  expect(
    screen.queryByTestId("feed-map-page", { includeHiddenElements: true }),
  ).toBeNull();
  await view.rerender(
    <>
      <FeedMapShooter width={358} height={222} />
      <CityExamples
        city={vercelli}
        examples={[{ shape: "heart", status: "ready", route: heart }, waiting[1]]}
        onOpen={jest.fn()}
        onRetry={jest.fn()}
      />
    </>,
  );
  expect(
    screen.getByTestId("feed-map-page", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  forgetFeedMaps();
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
  // No drawing, no map, nobody to name.
  expect(screen.queryByText(CARD_MAPS_CREDIT)).toBeNull();
  await fireEvent.press(screen.getByText("Try again"));
  expect(onRetry).toHaveBeenCalled();
});
