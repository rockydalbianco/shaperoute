/**
 * The warning line (TASK-479 part E2): nothing without a warning; the
 * approved line with name, class, how far and the floor; the «≈» line when
 * a flight level is in the reckoning.
 */
import { render, screen } from "@testing-library/react-native";

import { color } from "../theme/tokens";
import { AirspaceAlertLine } from "./AirspaceAlertLine";
import { nearAirspaces } from "./airspaceNear";
import type { Airspace } from "./openair";

const BOX: Airspace = {
  class: "R",
  name: "TEST BOX",
  floor: { kind: "aboveSea", metres: 1000 },
  ceiling: { kind: "flightLevel", level: 95 },
  points: [
    [45.0, 10.0],
    [45.0, 10.03],
    [45.02, 10.03],
    [45.02, 10.0],
  ],
};

it("shows nothing without a warning", async () => {
  await render(
    <AirspaceAlertLine alert={null} units="km" altitudeUnit="m" palette={color} />,
  );
  expect(screen.queryByTestId("airspace-alert")).toBeNull();
});

it("shows the warning, and why its heights are ≈", async () => {
  const [inside] = nearAirspaces([BOX], [45.01, 10.015], 1500, null);
  await render(
    <AirspaceAlertLine alert={inside} units="km" altitudeUnit="m" palette={color} />,
  );
  expect(screen.getByText("TEST BOX (R) · inside · floor 1000 m")).toBeTruthy();
  expect(screen.getByText("FL limits from GPS altitude (≈).")).toBeTruthy();
});
