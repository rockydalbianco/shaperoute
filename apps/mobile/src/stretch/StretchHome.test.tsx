import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { category, compose, defaultChoice } from "./compose";
import { resetChoicesForTests } from "./stretchChoices";
import { ENTER_GAP_MS, ENTER_MS, StretchHome } from "./StretchHome";

jest.mock("../stretchSport/StretchSessionHost", () => ({
  startCategorySession: jest.fn(),
}));

const { startCategorySession } = jest.requireMock<{ startCategorySession: jest.Mock }>(
  "../stretchSport/StretchSessionHost",
);

/** 2026-11-27 is a Friday. */
const at = (hour: number) => new Date(2026, 10, 27, hour);

async function show(now: Date) {
  await render(<StretchHome now={now} />);
  // Every part has come in.
  await act(() => jest.advanceTimersByTimeAsync(ENTER_MS + 6 * ENTER_GAP_MS));
}

function press(testID: string) {
  return act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  resetChoicesForTests();
  startCategorySession.mockClear();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("the stretching home", () => {
  it("proposes the routine of the hour in «Today» and starts it", async () => {
    await show(at(7));
    expect(screen.getByRole("header", { name: "Morning" })).toBeOnTheScreen();
    await press("stretch-today-start");
    const morning = category("morning");
    const routine = compose(morning, defaultChoice(morning));
    expect(startCategorySession).toHaveBeenCalledWith("morning", 5, routine.exercises);
  });

  it("proposes the desk on a working afternoon and bed late at night", async () => {
    await show(at(15));
    expect(screen.getByRole("header", { name: "Desk break" })).toBeOnTheScreen();
    await screen.unmount();
    await show(at(23));
    expect(screen.getByRole("header", { name: "Bedtime" })).toBeOnTheScreen();
  });

  it("shows the five groups, each category a tile: one for a sport, one for intimacy", async () => {
    await show(at(7));
    for (const title of ["Body", "Moments", "Sports", "Intimacy", "More"]) {
      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    }
    for (const hint of [
      "12 areas",
      "7 moments",
      "Before and after",
      "Hips, pelvis, lower back and breath",
      "Goals and gentle starts",
    ]) {
      expect(screen.getByText(hint)).toBeOnTheScreen();
    }
    // 12 areas, 7 moments, 14 sports, intimacy, 5 more.
    expect(screen.getAllByTestId(/^stretch-tile-/)).toHaveLength(12 + 7 + 14 + 1 + 5);
    expect(screen.getByTestId("stretch-tile-neck")).toHaveTextContent(/Neck/);
    expect(screen.getByTestId("stretch-tile-neck")).toHaveTextContent(/3 · 5 · 10 min/);
    expect(screen.getByTestId("stretch-tile-running_after")).toHaveTextContent(
      /Running.*Before · After/,
    );
    expect(screen.queryByTestId("stretch-tile-running_before")).toBeNull();
    expect(screen.getByTestId("stretch-tile-splits")).toHaveTextContent(/Splits/);
    expect(screen.getByText("Stop if it hurts.")).toBeOnTheScreen();
  });

  it("opens a category's page from its tile, and «Today»'s from the line under «Start»", async () => {
    await show(at(7));
    expect(screen.queryByTestId("stretch-category")).toBeNull();
    await press("stretch-tile-hips");
    expect(screen.getByTestId("stretch-category")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Hips & pelvis" })).toBeOnTheScreen();
    await press("stretch-category-close");
    expect(screen.queryByTestId("stretch-category")).toBeNull();
    await press("stretch-today-see");
    expect(screen.getByTestId("stretch-minutes-5")).toBeOnTheScreen();
  });

  it("opens a sport on its «After», with «Before» one touch away", async () => {
    await show(at(7));
    await press("stretch-tile-cycling_after");
    expect(screen.getByRole("header", { name: "Cycling" })).toBeOnTheScreen();
    expect(
      screen.getByTestId("stretch-when-after").props.accessibilityState.checked,
    ).toBe(true);
  });

  it("uses the last choice of the category «Today» proposes", async () => {
    await show(at(7));
    await press("stretch-today-see");
    await press("stretch-minutes-10");
    await press("stretch-category-start");
    startCategorySession.mockClear();
    // Back on the home, «Today» is now ten minutes.
    expect(
      within(screen.getByTestId("stretch-today")).getByText("10 min"),
    ).toBeOnTheScreen();
    await press("stretch-today-start");
    expect(startCategorySession.mock.calls[0].slice(0, 2)).toEqual(["morning", 10]);
  });

  it("is there at once with «Reduce Motion» on", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await render(<StretchHome now={at(7)} />);
    await act(() => jest.advanceTimersByTimeAsync(0));
    expect(screen.getByTestId("stretch-home")).toBeOnTheScreen();
    expect(screen.getByTestId("stretch-tile-toes")).toBeOnTheScreen();
  });
});
