import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { loadSport, saveSport, SPORTS, type SportOption } from "./sport";
import { SportSetting } from "./SportSetting";

jest.mock("./sport", () => ({
  ...jest.requireActual<typeof import("./sport")>("./sport"),
  loadSport: jest.fn(),
  saveSport: jest.fn(),
}));

/** As before TASK-190: only run ready. */
const RUN_ONLY: SportOption[] = SPORTS.map((option) =>
  option.id === "run" ? option : { ...option, ready: false },
);

const row = (sport: string) => screen.getByRole("button", { name: `Sport, ${sport}` });

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
});

// TASK-512 (ADR-0420): one row, not a row per sport.

test("«Sport» is one row with the sport chosen, and no list until it is touched", async () => {
  await render(<SportSetting />);
  expect(screen.getByText("SPORT")).toBeOnTheScreen();
  expect(row("Run")).toBeOnTheScreen();
  expect(row("Run")).toHaveProp("accessibilityHint", "Changes the sport");
  expect(screen.getByText("Run")).toBeOnTheScreen();
  expect(screen.getByText("›")).toBeOnTheScreen();
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.queryByTestId("sport-panel")).toBeNull();
});

test("touched, it opens the sport panel: every sport by family, «Run» chosen", async () => {
  await render(<SportSetting />);
  await fireEvent.press(row("Run"));
  expect(screen.getByTestId("sport-panel")).toBeOnTheScreen();
  // Walk (TASK-371), run, the hike (TASK-377), bike, gravel and MTB
  // (TASK-378), the skate (TASK-380), paddle, the swim (TASK-323), the
  // alpine and the cross-country ski (TASK-375), ski touring (TASK-415 B),
  // the gym (TASK-385 B), the flight (TASK-305 R2), the wheelchair
  // (TASK-414 B), the snowshoes (TASK-413), mountaineering (TASK-463 C) and
  // stretching (TASK-475 C): none says «Soon».
  expect(screen.getAllByRole("radio")).toHaveLength(18);
  expect(screen.queryByText("Soon")).toBeNull();
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Bike" })).not.toBeChecked();
  expect(
    within(screen.getByTestId("sport-family-other")).getByRole("radio", {
      name: "Paragliding",
    }),
  ).not.toBeChecked();
});

test("a sport chosen in the panel is saved, closes it, and shows on the row", async () => {
  await render(<SportSetting />);
  await fireEvent.press(row("Run"));
  await fireEvent.press(screen.getByRole("radio", { name: "Swim" }));
  expect(saveSport).toHaveBeenCalledWith("swim");
  expect(screen.queryByTestId("sport-panel")).toBeNull();
  expect(row("Swim")).toBeOnTheScreen();
  expect(screen.getByText("🏊")).toBeOnTheScreen();

  await fireEvent.press(row("Swim"));
  expect(screen.getByRole("radio", { name: "Swim" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Run" })).not.toBeChecked();
});

test("«Close» and the dark around the panel change nothing", async () => {
  await render(<SportSetting />);
  await fireEvent.press(row("Run"));
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByTestId("sport-panel")).toBeNull();
  await fireEvent.press(row("Run"));
  await fireEvent.press(screen.getByTestId("sport-backdrop"));
  expect(screen.queryByTestId("sport-panel")).toBeNull();
  expect(saveSport).not.toHaveBeenCalled();
  expect(row("Run")).toBeOnTheScreen();
});

test("a sport not ready says «Soon» in the panel and takes no tap", async () => {
  await render(<SportSetting sports={RUN_ONLY} />);
  await fireEvent.press(row("Run"));
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  expect(screen.getByLabelText("Bike, coming soon")).toBeOnTheScreen();
  expect(screen.getAllByText("Soon")).toHaveLength(17);
  await fireEvent.press(screen.getByLabelText("Bike, coming soon"));
  expect(saveSport).not.toHaveBeenCalled();
  expect(screen.getByTestId("sport-panel")).toBeOnTheScreen();
});

test("the sport kept on the phone is the one on the row at the next opening", async () => {
  jest.mocked(loadSport).mockReturnValue("bike");
  await render(<SportSetting />);
  expect(loadSport).toHaveBeenCalledWith(SPORTS);
  expect(row("Bike")).toBeOnTheScreen();
  await fireEvent.press(row("Bike"));
  expect(screen.getByRole("radio", { name: "Bike" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Run" })).not.toBeChecked();
});
