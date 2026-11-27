import { render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { StretchWeek } from "./StretchWeek";

const week = (days: boolean[], sessions: number, minutes: number) => ({
  days,
  sessions,
  minutes,
  last: null,
});

describe("«This week» on the stretching home", () => {
  it("ticks the days done and says how many sessions and minutes", async () => {
    await render(
      <StretchWeek
        week={week([true, false, true, false, false, false, false], 3, 24)}
        today={4}
        tint={color.stretch.more}
      />,
    );
    expect(screen.getByText("This week")).toBeOnTheScreen();
    expect(screen.getByText("3 sessions · 24 min")).toBeOnTheScreen();
    expect(screen.getAllByText("✓")).toHaveLength(2);
    expect(screen.getByTestId("stretch-week-day-0-done")).toBeOnTheScreen();
    expect(screen.getByTestId("stretch-week-day-2-done")).toBeOnTheScreen();
    expect(screen.getByTestId("stretch-week-day-4")).toBeOnTheScreen();
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(day)).toBeOnTheScreen();
    }
    // One line for a screen reader.
    expect(screen.getByTestId("stretch-week").props.accessibilityLabel).toBe(
      "This week: 3 sessions · 24 min",
    );
  });

  it("says one session as one, and none as none", async () => {
    await render(
      <StretchWeek
        week={week([false, false, false, false, true, false, false], 1, 5)}
        today={4}
        tint={color.stretch.more}
      />,
    );
    expect(screen.getByText("1 session · 5 min")).toBeOnTheScreen();
    await screen.unmount();
    await render(
      <StretchWeek
        week={week([false, false, false, false, false, false, false], 0, 0)}
        today={0}
        tint={color.stretch.more}
      />,
    );
    expect(screen.getByText("0 sessions · 0 min")).toBeOnTheScreen();
    expect(screen.queryByText("✓")).toBeNull();
  });
});
