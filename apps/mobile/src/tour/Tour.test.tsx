import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { AppState, Text } from "react-native";

import { saveLanguageChoice } from "../i18n/language";
import { pageTitle } from "../screens/pageTitles";
import { SETTLE_MS, SETTLE_TRIES, SKIP_LOCK_S, Tour } from "./Tour";
import { type Box, type Located, pageName, tabName, useTourPager } from "./tourParts";
import { TOUR_PART, TOUR_STEPS } from "./tourSteps";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
// The sport of «Settings»: «Run» unless a test says.
let mockSport = "run";
jest.mock("../settings/useSport", () => ({ useSport: () => mockSport }));

const TITLES = [pageTitle("feed"), pageTitle("draw"), pageTitle("explore")];

/** The pages as the pager gives them to the tour: «Draw» on screen. */
const pagesShown: string[] = [];
function Pages() {
  const [page, setPage] = useState(1);
  useTourPager(TITLES, page, (index) => {
    pagesShown.push(TITLES[index]);
    setPage(index);
  });
  return <Text>{`On ${TITLES[page]}`}</Text>;
}

const PART: Box = { x: 16, y: 120, width: 368, height: 80 };
/** The names asked for, once per step: measured again, not asked again. */
const asked: string[][] = [];
let found: Box | null = PART;
/** How many times more a part is still moving when measured. */
let moving = 0;
async function locateParts(names: readonly string[]): Promise<Located> {
  if (JSON.stringify(asked[asked.length - 1]) !== JSON.stringify(names)) {
    asked.push([...names]);
  }
  if (names.length === 0) {
    return { box: null, all: true };
  }
  if (moving > 0) {
    moving -= 1;
    return { box: { ...PART, x: PART.x + 100 * moving }, all: true };
  }
  return { box: found, all: found !== null };
}

/** Lets the tour find its step's part: measured, and again to see it still. */
async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2 * SETTLE_MS);
  });
}

/** A part not on screen: the tour measures it again, then shows the words. */
async function settleMissing() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SETTLE_MS * SETTLE_TRIES);
  });
}

async function showTour(lockSeconds = SKIP_LOCK_S, withPages = true) {
  const onEnd = jest.fn();
  await render(
    <>
      {withPages && <Pages />}
      <Tour lockSeconds={lockSeconds} onEnd={onEnd} locateParts={locateParts} />
    </>,
  );
  await settle();
  return onEnd;
}

async function seconds(count: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(count * 1000);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  pagesShown.length = 0;
  asked.length = 0;
  found = PART;
  moving = 0;
  mockSport = "run";
});

afterEach(async () => {
  await act(async () => saveLanguageChoice("phone"));
  jest.useRealTimers();
});

test("the tour opens on its welcome, «Skip» counting down from 5", async () => {
  const onEnd = await showTour();
  expect(screen.getByRole("header", { name: "Welcome to MuW" })).toBeOnTheScreen();
  const skip = screen.getByRole("button", { name: "Skip" });
  expect(skip).toBeDisabled();
  expect(screen.getByText("Skip (5)")).toBeOnTheScreen();
  // Touched while it waits: nothing.
  await fireEvent.press(skip);
  expect(onEnd).not.toHaveBeenCalled();
  await seconds(1);
  expect(screen.getByText("Skip (4)")).toBeOnTheScreen();
  await seconds(SKIP_LOCK_S - 1);
  expect(screen.getByText("Skip")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled();
  await fireEvent.press(screen.getByRole("button", { name: "Skip" }));
  expect(onEnd).toHaveBeenCalledWith(true);
});

test("«Next» can be touched at once, and the count goes on through the steps", async () => {
  await showTour();
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  await settle();
  expect(screen.getByRole("header", { name: "Where you start" })).toBeOnTheScreen();
  // Not from 5 again: the count is the tour's, not the step's.
  await seconds(1);
  expect(screen.getByText("Skip (4)")).toBeOnTheScreen();
});

test("the steps go through «Draw», the header, «Explore» and «Feed», and end on «Draw»", async () => {
  const onEnd = await showTour();
  const titles: string[] = [];
  for (const step of TOUR_STEPS) {
    const header = screen.getAllByRole("header")[0];
    titles.push(String(header.props.children));
    if (step !== TOUR_STEPS[TOUR_STEPS.length - 1]) {
      await fireEvent.press(screen.getByRole("button", { name: "Next" }));
      await settle();
    }
  }
  expect(titles).toEqual([
    "Welcome to MuW",
    "Where you start",
    "What you draw",
    "How far",
    "Draw route",
    "Sport and profile",
    "Explore",
    "Feed",
  ]);
  expect(asked).toEqual([
    [],
    [TOUR_PART.start],
    [TOUR_PART.shapes],
    [TOUR_PART.distance],
    [TOUR_PART.draw],
    [TOUR_PART.header],
    [tabName("Explore"), pageName("Explore")],
    [tabName("Feed"), pageName("Feed")],
  ]);
  expect(pagesShown).toEqual(["Explore", "Feed"]);
  // The last step has no «Skip»: «Let's go» ends it.
  expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Let's go" }));
  expect(onEnd).toHaveBeenCalledWith(true);
  expect(pagesShown).toEqual(["Explore", "Feed", "Draw"]);
  expect(screen.getByText("On Draw")).toBeOnTheScreen();
});

test("a part found is in the light; the words alone have none", async () => {
  await showTour();
  // The welcome: no part.
  expect(screen.queryByTestId("tour-light")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  await settle();
  expect(screen.getByTestId("tour-light")).toBeOnTheScreen();
  // A part not on screen: its words all the same, without the light.
  found = null;
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  await settle();
  // Still looking for it a while.
  expect(screen.queryByRole("header", { name: "What you draw" })).toBeNull();
  await settleMissing();
  expect(screen.getByRole("header", { name: "What you draw" })).toBeOnTheScreen();
  expect(screen.queryByTestId("tour-light")).toBeNull();
});

test("a part still moving, as a page sliding in, is shown once it rests", async () => {
  await showTour();
  moving = 3;
  await fireEvent.press(screen.getByRole("button", { name: "Next" }));
  await settle();
  expect(screen.queryByRole("header", { name: "Where you start" })).toBeNull();
  await act(async () => {
    await jest.advanceTimersByTimeAsync(SETTLE_MS * 3);
  });
  expect(screen.getByRole("header", { name: "Where you start" })).toBeOnTheScreen();
  expect(screen.getByTestId("tour-light")).toHaveStyle({ left: PART.x - 6 });
});

test("asked again from the guide, «Skip» works at once", async () => {
  const onEnd = await showTour(0);
  expect(screen.getByText("Skip")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Skip" }));
  expect(onEnd).toHaveBeenCalledWith(true);
});

test("without the pages on screen the tour does not start, nor counts as seen", async () => {
  const onEnd = await showTour(SKIP_LOCK_S, false);
  expect(onEnd).toHaveBeenCalledWith(false);
});

test("the count stops while the phone asks something over the app", async () => {
  await showTour();
  const before = Object.getOwnPropertyDescriptor(AppState, "currentState");
  Object.defineProperty(AppState, "currentState", {
    value: "inactive",
    configurable: true,
  });
  await seconds(SKIP_LOCK_S);
  expect(screen.getByText("Skip (5)")).toBeOnTheScreen();
  if (before) {
    Object.defineProperty(AppState, "currentState", before);
  }
  await seconds(1);
  expect(screen.getByText("Skip (4)")).toBeOnTheScreen();
});

test("with «Paddle» the shapes' step speaks of the water only", async () => {
  mockSport = "paddle";
  await showTour();
  for (let step = 0; step < 2; step += 1) {
    await fireEvent.press(screen.getByRole("button", { name: "Next" }));
    await settle();
  }
  expect(screen.getByRole("header", { name: "What you draw" })).toBeOnTheScreen();
  expect(
    screen.getByText("Pick a shape here: on the water, the shapes of the catalogue."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/«Word»/)).toBeNull();
});

test("in Italian the tour speaks Italian", async () => {
  await act(async () => saveLanguageChoice("it"));
  await showTour();
  expect(screen.getByRole("header", { name: "Ciao, questo è MuW" })).toBeOnTheScreen();
  expect(screen.getByText("Salta (5)")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Avanti" })).toBeOnTheScreen();
  expect(screen.getByLabelText("1 di 8")).toBeOnTheScreen();
});
