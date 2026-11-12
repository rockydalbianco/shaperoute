import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { loadSport, saveSport, SPORTS, type SportOption } from "./sport";
import { SportButton } from "./SportButton";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("expo-file-system");
// The sport kept on the phone, as each test says; saving, and telling the
// button, are the real ones.
jest.mock("./sport", () => {
  const actual = jest.requireActual<typeof import("./sport")>("./sport");
  return { ...actual, loadSport: jest.fn(), saveSport: jest.fn(actual.saveSport) };
});

/** As before TASK-190: only run ready. */
const RUN_ONLY: SportOption[] = SPORTS.map((option) =>
  option.id === "run" ? option : { ...option, ready: false },
);

/** Three sports, the last not ready: the menu whatever `SPORTS` turns on. */
const SOME: SportOption[] = [
  { id: "run", emoji: "🏃‍♂️", name: "Run", ready: true },
  { id: "bike", emoji: "🚴", name: "Bike", ready: true },
  { id: "paddle", emoji: "🛶", name: "Paddle", ready: false },
];

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
});

test("the button shows the sport chosen, and no menu until it is touched", async () => {
  await render(<SportButton sports={SOME} />);
  expect(screen.getByRole("button", { name: "Sport, Run" })).toBeOnTheScreen();
  expect(screen.getByText("🏃‍♂️")).toBeOnTheScreen();
  expect(screen.queryByRole("radio")).toBeNull();
});

test("touched, it shows the sports of «Settings»: the chosen one ticked, «Paddle» «Soon»", async () => {
  await render(<SportButton sports={SOME} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Bike" })).not.toBeChecked();
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  expect(screen.getByLabelText("Paddle, coming soon")).toBeOnTheScreen();
  expect(screen.getAllByText("Soon")).toHaveLength(1);
  expect(screen.getAllByText("✓")).toHaveLength(1);
});

test("a sport chosen is saved as in «Settings», closes the menu and shows on the button", async () => {
  await render(<SportButton sports={SOME} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  await fireEvent.press(screen.getByRole("radio", { name: "Bike" }));
  expect(saveSport).toHaveBeenCalledWith("bike");
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.getByRole("button", { name: "Sport, Bike" })).toBeOnTheScreen();
  expect(screen.getByText("🚴")).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole("button", { name: "Sport, Bike" }));
  expect(screen.getByRole("radio", { name: "Bike" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Run" })).not.toBeChecked();
});

test("«Paddle» takes no tap; a tap outside closes the menu and changes nothing", async () => {
  await render(<SportButton sports={SOME} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  await fireEvent.press(screen.getByLabelText("Paddle, coming soon"));
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  await fireEvent.press(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("radio")).toBeNull();
  expect(saveSport).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Sport, Run" })).toBeOnTheScreen();
});

test("a sport not ready is not a choice in the menu", async () => {
  await render(<SportButton sports={RUN_ONLY} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  expect(screen.getByLabelText("Bike, coming soon")).toBeOnTheScreen();
  // Bike, Paddle, Swim (TASK-323), Walk (TASK-371), Hike
  // (TASK-377), Gravel and MTB (TASK-378), Roller (TASK-380), Ski and
  // Cross-country ski (TASK-375), Ski touring (TASK-415 B), Gym (TASK-385 B)
  // Paragliding (TASK-305 R2) and Wheelchair & stroller (TASK-414 B).
  expect(screen.getAllByText("Soon")).toHaveLength(14);
});

test("in the menu «Swim» is a choice like the others (TASK-323)", async () => {
  await render(<SportButton />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  expect(screen.queryByLabelText("Swim, coming soon")).toBeNull();
  await fireEvent.press(screen.getByRole("radio", { name: "Swim" }));
  expect(saveSport).toHaveBeenCalledWith("swim");
  expect(screen.getByRole("button", { name: "Sport, Swim" })).toBeOnTheScreen();
  expect(screen.getByText("🏊")).toBeOnTheScreen();
});

test("the app's menu ends with «Paragliding», as «Settings» (TASK-305 R2)", async () => {
  await render(<SportButton />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  // Walk (TASK-371), run, the hike (TASK-377), bike, gravel and MTB
  // (TASK-378), the skate (TASK-380), paddle, the swim in Expo Go, the alpine
  // and the cross-country ski (TASK-375), ski touring (TASK-415 B), the gym
  // in Expo Go (TASK-385 B), the flight (TASK-305 R2) and the wheelchair
  // (TASK-414 B).
  expect(screen.getAllByRole("radio")).toHaveLength(15);
  expect(screen.queryByLabelText("Paragliding, coming soon")).toBeNull();
  await fireEvent.press(screen.getByRole("radio", { name: "Paragliding" }));
  expect(saveSport).toHaveBeenCalledWith("paragliding");
});

test("the sport on the phone, and one chosen in «Settings» later, show at once", async () => {
  jest.mocked(loadSport).mockReturnValue("bike");
  await render(<SportButton sports={SOME} />);
  expect(screen.getByRole("button", { name: "Sport, Bike" })).toBeOnTheScreen();
  await act(async () => saveSport("run"));
  expect(screen.getByRole("button", { name: "Sport, Run" })).toBeOnTheScreen();
});

// The ski mode (TASK-429 part A): the row of «Ski» says it changes the app,
// and in the mode the menu says how to leave it.

/** «Run» and «Ski», both ready. */
const WITH_SKI: SportOption[] = [
  { id: "run", emoji: "🏃‍♂️", name: "Run", ready: true },
  { id: "ski", emoji: "⛷️", name: "Ski", ready: true, recordOnly: true },
];

test("the row of «Ski» says it turns MuW into a ski app", async () => {
  await render(<SportButton sports={WITH_SKI} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Run" }));
  expect(screen.getByText("Turns MuW into your ski app")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Ski" })).toHaveProp(
    "accessibilityHint",
    "Turns MuW into your ski app",
  );
  // Out of the mode, nothing says how to leave it.
  expect(screen.queryByTestId("sport-ski-mode")).toBeNull();
});

test("in the ski mode the menu says how to go back, and another sport leaves it", async () => {
  jest.mocked(loadSport).mockReturnValue("ski");
  await render(<SportButton sports={WITH_SKI} />);
  await fireEvent.press(screen.getByRole("button", { name: "Sport, Ski" }));
  expect(screen.getByText("Ski mode")).toBeOnTheScreen();
  expect(
    screen.getByText("Choose another sport to go back to MuW as always."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Ski" })).toBeChecked();
  await fireEvent.press(screen.getByRole("radio", { name: "Run" }));
  expect(saveSport).toHaveBeenCalledWith("run");
  expect(screen.getByRole("button", { name: "Sport, Run" })).toBeOnTheScreen();
});
