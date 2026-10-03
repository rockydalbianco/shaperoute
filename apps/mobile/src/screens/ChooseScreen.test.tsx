/**
 * The first screen's run button is yellow (TASK-220, ADR-0183): the user's
 * choice, the one yellow control that is not the route's.
 */
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { color } from "../theme/tokens";
import { ChooseScreen } from "./ChooseScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

async function choose(runLabel?: string) {
  await render(
    <ChooseScreen
      status="From your position"
      denied={false}
      mode="gps"
      onMode={jest.fn()}
      searching={false}
      onPlace={jest.fn()}
      near={null}
      mapError={null}
      footer={<Text>Draw route</Text>}
      onRun={jest.fn()}
      runLabel={runLabel}
    >
      <Text>Shapes</Text>
    </ChooseScreen>,
  );
}

test("«Run without a route» is yellow, with dark text", async () => {
  await choose();
  expect(screen.getByRole("button", { name: "Run without a route" })).toHaveStyle({
    backgroundColor: color.accent,
  });
  expect(screen.getByText("Run without a route")).toHaveStyle({
    color: color.onAccent,
  });
});

test("«Ride without a route», with «Bike», is yellow too", async () => {
  await choose("Ride without a route");
  expect(screen.getByRole("button", { name: "Ride without a route" })).toHaveStyle({
    backgroundColor: color.accent,
  });
  expect(screen.getByText("Ride without a route")).toHaveStyle({
    color: color.onAccent,
  });
});
