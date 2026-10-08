import { render, screen, within } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MapScreen } from "./MapScreen";

// The map's kind (TASK-264): its button is over the map while the map is
// the screen, opposite the way back, or under the banner of a run.

const INSETS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function show(props: { active: boolean; banner?: boolean }) {
  return render(
    <SafeAreaProvider initialMetrics={INSETS}>
      <MapScreen
        map={<Text>map</Text>}
        active={props.active}
        onBack={jest.fn()}
        mapError={null}
        banner={props.banner ? <Text testID="banner">Turn left</Text> : undefined}
      >
        <Text>card</Text>
      </MapScreen>
    </SafeAreaProvider>,
  );
}

test("on the map, the button is in the row of the way back", async () => {
  await show({ active: true });
  const row = screen.getByTestId("map-top-row");
  expect(within(row).getByRole("button", { name: "Back" })).toBeTruthy();
  expect(within(row).getByRole("button", { name: "Map type" })).toBeTruthy();
});

test("while running, the banner takes the row and the button is under it", async () => {
  await show({ active: true, banner: true });
  const row = screen.getByTestId("map-top-row");
  expect(within(row).getByTestId("banner")).toBeTruthy();
  expect(within(row).queryByRole("button", { name: "Map type" })).toBeNull();
  expect(screen.getByRole("button", { name: "Map type" })).toBeTruthy();
});

test("with the map behind another page, there is no button", async () => {
  await show({ active: false });
  expect(screen.queryByRole("button", { name: "Map type" })).toBeNull();
});
