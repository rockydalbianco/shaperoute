import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { LocationOff } from "./LocationOff";

// The position refused or the phone's location off (TASK-259): the run's
// screens say so and offer the Settings.

test("following a route: what is off, what for, and «Open Settings»", async () => {
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  await render(<LocationOff use="navigate" />);
  expect(screen.getByText("Location is off")).toBeOnTheScreen();
  expect(
    screen.getByText("Allow it for MuW in Settings to follow the route."),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  openSettings.mockRestore();
});

test("recording without a route: the track", async () => {
  await render(<LocationOff use="record" />);
  expect(screen.getByText("Location is off")).toBeOnTheScreen();
  expect(
    screen.getByText("Allow it for MuW in Settings to record your track."),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Open Settings" })).toBeOnTheScreen();
});
