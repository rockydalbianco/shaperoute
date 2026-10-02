import { fireEvent, render, screen } from "@testing-library/react-native";

import { loadSport, saveSport, SPORTS, type SportOption } from "./sport";
import { SportSetting } from "./SportSetting";

jest.mock("./sport", () => ({
  ...jest.requireActual<typeof import("./sport")>("./sport"),
  loadSport: jest.fn(),
  saveSport: jest.fn(),
}));

/** As after the tasks that bring the bike. */
const WITH_BIKE: SportOption[] = SPORTS.map((option) =>
  option.id === "bike" ? { ...option, ready: true } : option,
);

beforeEach(() => {
  jest.mocked(loadSport).mockReturnValue("run");
  jest.mocked(saveSport).mockClear();
});

test("«Run» is chosen; «Bike» and «Paddle» say «Soon» and take no tap", async () => {
  await render(<SportSetting />);
  expect(screen.getByText("SPORT")).toBeOnTheScreen();
  expect(screen.getByRole("radio", { name: "Run" })).toBeChecked();
  expect(screen.getAllByRole("radio")).toHaveLength(1);
  expect(screen.getByLabelText("Bike, coming soon")).toBeOnTheScreen();
  expect(screen.getByLabelText("Paddle, coming soon")).toBeOnTheScreen();
  expect(screen.getAllByText("Soon")).toHaveLength(2);
});

test("a sport that is ready is chosen with a tap, and kept", async () => {
  await render(<SportSetting sports={WITH_BIKE} />);
  expect(screen.getByRole("radio", { name: "Bike" })).not.toBeChecked();
  await fireEvent.press(screen.getByRole("radio", { name: "Bike" }));
  expect(screen.getByRole("radio", { name: "Bike" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Run" })).not.toBeChecked();
  expect(saveSport).toHaveBeenCalledWith("bike");
  expect(screen.getAllByText("Soon")).toHaveLength(1);
});

test("the sport kept on the phone is the one chosen at the next opening", async () => {
  jest.mocked(loadSport).mockReturnValue("bike");
  await render(<SportSetting sports={WITH_BIKE} />);
  expect(loadSport).toHaveBeenCalledWith(WITH_BIKE);
  expect(screen.getByRole("radio", { name: "Bike" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Run" })).not.toBeChecked();
});
