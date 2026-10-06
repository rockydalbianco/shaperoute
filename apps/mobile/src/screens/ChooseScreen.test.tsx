/**
 * The first screen's run button is yellow (TASK-220, ADR-0183): the user's
 * choice, the one yellow control that is not the route's.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking, Text } from "react-native";

import { color } from "../theme/tokens";
import { ChooseScreen, MapError } from "./ChooseScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

async function choose(
  runLabel?: string,
  more: { denied?: boolean; mapError?: string; onMapRetry?: () => void } = {},
) {
  await render(
    <ChooseScreen
      status="From your position"
      denied={more.denied ?? false}
      mode="gps"
      onMode={jest.fn()}
      searching={false}
      onPlace={jest.fn()}
      near={null}
      mapError={more.mapError ?? null}
      onMapRetry={more.onMapRetry}
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

// A map that could not load (TASK-259): the map's own words, not the reason
// for the log nor «reopen the app»; «Retry» loads it again from «Draw».
test("the map that could not load: what to do, and «Retry»", async () => {
  const onMapRetry = jest.fn();
  await choose(undefined, { mapError: "MapLibre GL JS did not load", onMapRetry });
  expect(
    screen.getByText("The map could not be loaded. Check the network."),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/MapLibre/)).toBeNull();
  expect(screen.queryByText(/reopen the app/)).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(onMapRetry).toHaveBeenCalledTimes(1);
});

test("without a screen to retry it, the map's words only", async () => {
  await render(<MapError reason="style not found" />);
  expect(
    screen.getByText("The map could not be loaded. Check the network."),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
});

test("the position refused: «Open Settings» opens the app's settings", async () => {
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  await choose(undefined, { denied: true });
  await fireEvent.press(screen.getByRole("button", { name: "Open Settings" }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  openSettings.mockRestore();
});
