/**
 * «Draw» by bike (TASK-190): the distance field keeps to 10–30 km, and a
 * shape that fits at another distance is offered it within them. A run's
 * panel is in RoutePanel.test.tsx; the whole app by bike in AppBike.test.tsx.
 */
import type { Activity, RouteRequest } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { toDistanceM } from "./distance";
import { RouteChoice, RouteOutcome } from "./RoutePanel";
import { checkWord } from "./wordInput";

function choice(distanceText: string, onDistanceText: jest.Mock, activity?: Activity) {
  const distanceM = toDistanceM(distanceText, activity);
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText="heart"
      shape="heart"
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", distanceM, activity)}
      letterStyle="round"
      onLetterStyle={jest.fn()}
      distanceText={distanceText}
      distanceM={distanceM}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={onDistanceText}
      activity={activity}
    />
  );
}

test("by bike a run's distance is out: the field says 10 to 30 km", async () => {
  const onDistanceText = jest.fn();
  await render(choice("5", onDistanceText, "cycling"));
  expect(screen.getByText("Enter a distance between 10 and 30 km.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Longer" }));
  expect(onDistanceText).toHaveBeenLastCalledWith("10");
});

test("by bike − and + stay within 10 and 30 km", async () => {
  const onDistanceText = jest.fn();
  const { rerender } = await render(choice("30", onDistanceText, "cycling"));
  expect(screen.queryByText(/Enter a distance/)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Longer" }));
  expect(onDistanceText).toHaveBeenLastCalledWith("30");
  await fireEvent.press(screen.getByRole("button", { name: "Shorter" }));
  expect(onDistanceText).toHaveBeenLastCalledWith("29");
  await rerender(choice("10", onDistanceText, "cycling"));
  await fireEvent.press(screen.getByRole("button", { name: "Shorter" }));
  expect(onDistanceText).toHaveBeenLastCalledWith("10");
});

test("without an activity the field is a run's, as before", async () => {
  const onDistanceText = jest.fn();
  await render(choice("25", onDistanceText));
  expect(screen.getByText("Enter a distance between 1 and 21 km.")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Shorter" }));
  expect(onDistanceText).toHaveBeenLastCalledWith("21");
});

const bikeHeart: RouteRequest = {
  start: [46.0671, 11.1214],
  shape: "heart",
  distance_m: 15_000,
  activity: "cycling",
};

function failed(request: RouteRequest, suggested: number, onTryDistance: jest.Mock) {
  return (
    <RouteOutcome
      view={{
        status: "failed",
        request,
        problem: {
          kind: "api_error",
          code: "shape_not_drawable",
          message: "no",
          suggested_distance_m: suggested,
        },
      }}
      onCancel={jest.fn()}
      exporting={{ status: "idle" }}
      onExport={jest.fn()}
      onTryDistance={onTryDistance}
      onPickShape={jest.fn()}
      onStart={jest.fn()}
      onSignal={jest.fn()}
    />
  );
}

test("by bike a shape that fits at 25 km is offered 25 km", async () => {
  const onTryDistance = jest.fn();
  await render(failed(bikeHeart, 25_000, onTryDistance));
  await fireEvent.press(screen.getByText("Try 25 km"));
  expect(onTryDistance).toHaveBeenCalledWith(25_000);
});

test("for a run the same 25 km is not offered: the shapes are", async () => {
  await render(failed({ ...bikeHeart, activity: "running" }, 25_000, jest.fn()));
  expect(screen.queryByText("Try 25 km")).toBeNull();
  expect(screen.getByText("star")).toBeTruthy();
});
