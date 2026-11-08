import resorts from "@shaperoute/shared-types/fixtures/ski-resorts.json";
import type { SkiResort } from "@shaperoute/shared-types";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { answers } from "../account/testing";
import type { PositionState } from "../location/useCurrentPosition";
import { SEARCH_DELAY_MS } from "../search/useDrawingSearch";
import { DrawingsContext, useDrawingsDoor } from "../social/drawingsDoor";
import { ResortList } from "./ResortList";
import { ResortPage } from "./ResortPage";
import { forgetFollowedResorts } from "./useFollowedResorts";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// «Your resorts» (TASK-406 part D3): «Follow» on a resort's page, and the
// resorts followed first in the list of the «Ski» search and of «Change».

const [ALPE, PASSO] = resorts.resorts as SkiResort[];
const HERE: PositionState = { status: "ok", point: [46.38, 11.52] };

function Door({
  followed,
  follow,
  children,
}: {
  followed: jest.Mock;
  follow: jest.Mock;
  children: ReactNode;
}) {
  const nothing = useDrawingsDoor();
  return (
    <DrawingsContext.Provider
      value={{ ...nothing, followedResortsOf: followed, followResortOf: follow }}
    >
      {children}
    </DrawingsContext.Provider>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  forgetFollowedResorts();
});
afterEach(() => jest.useRealTimers());

test("the resorts followed come first while nothing is typed", async () => {
  const followed = jest.fn(async () => [{ ...PASSO, away_m: null }]);
  await render(
    <Door followed={followed} follow={jest.fn()}>
      <ResortList
        typed=""
        apiUrl="http://api"
        onPick={jest.fn()}
        fetchFn={answers({ status: 200, body: resorts }) as jest.Mock}
        apiKey={null}
        locate={async () => HERE}
      />
    </Door>,
  );
  await act(async () => {
    jest.advanceTimersByTime(SEARCH_DELAY_MS);
  });
  expect(screen.getByText("Your resorts")).toBeOnTheScreen();
  expect(screen.getByTestId(`followed-${PASSO.id}`)).toBeOnTheScreen();
  expect(screen.getByText("Near you")).toBeOnTheScreen();
  expect(screen.getByTestId(`resort-${ALPE.id}`)).toBeOnTheScreen();
});

test("«Follow» on a resort's page, and «Following» takes it back", async () => {
  const followed = jest.fn(async () => []);
  const follow = jest.fn(async () => true);
  await render(
    <Door followed={followed} follow={follow}>
      <ResortPage resort={ALPE} apiUrl={null} onBack={jest.fn()} />
    </Door>,
  );
  await act(async () => {});
  await fireEvent.press(screen.getByText("Follow"));
  expect(follow).toHaveBeenLastCalledWith(ALPE.id, true);
  expect(screen.getByText("Following")).toBeOnTheScreen();
  await fireEvent.press(screen.getByText("Following"));
  expect(follow).toHaveBeenLastCalledWith(ALPE.id, false);
  expect(screen.getByText("Follow")).toBeOnTheScreen();
});

test("a follow the API refuses goes back", async () => {
  const followed = jest.fn(async () => []);
  const follow = jest.fn(async () => false);
  await render(
    <Door followed={followed} follow={follow}>
      <ResortPage resort={ALPE} apiUrl={null} onBack={jest.fn()} />
    </Door>,
  );
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByText("Follow"));
  });
  expect(screen.getByText("Follow")).toBeOnTheScreen();
});
