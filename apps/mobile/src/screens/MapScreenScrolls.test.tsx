/**
 * The end of an activity (TASK-477): the card under the map, with «Save» and
 * «Discard» under a tall end card, stops under the banner and scrolls, so
 * that nothing falls under the bottom edge of a phone of 844 pt. Anywhere
 * else the card is as before.
 */
import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MIN_TAP_SIZE, space } from "../theme/tokens";
import { cardMaxHeight, MapScreen } from "./MapScreen";

jest.mock("../map/MapKindButton", () => ({ MapKindButton: () => null }));

const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

async function shown(scrolls?: boolean) {
  await render(
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <MapScreen
        map={null}
        active
        onBack={jest.fn()}
        mapError={null}
        banner={<Text>Your flight</Text>}
        scrolls={scrolls}
      >
        <Text>Save</Text>
      </MapScreen>
    </SafeAreaProvider>,
  );
}

test("at the end the card scrolls, no higher than the screen under the banner", async () => {
  await shown(true);
  const card = screen.getByTestId("map-card");
  const scroll = screen.getByTestId("map-card-scroll");
  expect(screen.getByText("Save")).toBeOnTheScreen();
  // «Save» is inside what scrolls.
  expect(scroll).toContainElement(screen.getByText("Save"));
  const style = StyleSheet.flatten(card.props.style);
  // The window's height under jest, less the top; the banner not measured
  // yet is a row of a tap's height.
  const window = Dimensions.get("window").height;
  expect(style.maxHeight).toBe(cardMaxHeight(window, INSETS.top, null));
  expect(style.maxHeight).toBeLessThan(window - INSETS.top);
});

test("anywhere else the card is as before, without scrolling", async () => {
  await shown(false);
  expect(screen.queryByTestId("map-card-scroll")).toBeNull();
  const style = StyleSheet.flatten(screen.getByTestId("map-card").props.style);
  expect(style.maxHeight).toBeUndefined();
  await shown(undefined);
  expect(screen.queryByTestId("map-card-scroll")).toBeNull();
});

test("the highest the card goes: the screen, less the top and the banner's row", () => {
  expect(cardMaxHeight(844, 47, 70)).toBe(844 - 47 - space.sm - 70 - space.sm);
  // Before the banner is measured, a row of a tap's height.
  expect(cardMaxHeight(844, 47, null)).toBe(
    844 - 47 - space.sm - MIN_TAP_SIZE - space.sm,
  );
  expect(cardMaxHeight(10, 47, 70)).toBe(0);
});
