import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { type MapCover, mapCover, useMapCover } from "../map/mapCover";
import { space } from "../theme/tokens";
import { MapScreen } from "./MapScreen";

// What lies over the top of the map (TASK-443): the screen tells the map
// inside it of the status bar and of the buttons it draws there, and of
// nothing else: the card is under the map, never over its attribution.

const WIDTH = 402;
const INSETS = {
  frame: { x: 0, y: 0, width: WIDTH, height: 874 },
  insets: { top: 62, left: 0, right: 0, bottom: 34 },
};

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 402, height: 874, scale: 3, fontScale: 1 }),
}));

/** In place of the map: what it is told lies over it. */
let told: (MapCover | null)[] = [];
function Probe() {
  const cover = useMapCover();
  told.push(cover);
  return <Text testID="probe">{JSON.stringify(cover)}</Text>;
}

function show(props: { active?: boolean; banner?: boolean; compass?: boolean }) {
  return (
    <SafeAreaProvider initialMetrics={INSETS}>
      <MapScreen
        map={<Probe />}
        active={props.active ?? true}
        onBack={jest.fn()}
        mapError={null}
        banner={props.banner ? <Text testID="banner">Turn left</Text> : undefined}
        compass={props.compass ? <Text testID="compass">N</Text> : undefined}
      >
        <Text testID="card">card</Text>
      </MapScreen>
    </SafeAreaProvider>
  );
}

function cover(): MapCover | null {
  return JSON.parse(screen.getByTestId("probe").props.children as string);
}

beforeEach(() => {
  told = [];
});

test("the map is told of the status bar, the way back and the map's kind", async () => {
  await render(show({}));
  expect(cover()).toEqual(
    mapCover({ insetTop: 62, width: WIDTH, bannerHeight: null, compass: false }),
  );
});

test("with the north arrow shown, of that too", async () => {
  await render(show({ compass: true }));
  expect(cover()).toEqual(
    mapCover({ insetTop: 62, width: WIDTH, bannerHeight: null, compass: true }),
  );
});

test("a banner covers as much as it turns out high", async () => {
  await render(show({ banner: true }));
  await act(() => {
    fireEvent(screen.getByTestId("map-top-row"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 96 } },
    });
  });
  expect(cover()).toEqual(
    mapCover({ insetTop: 62, width: WIDTH, bannerHeight: 96, compass: false }),
  );
});

test("the menu of the map's kind opening does not change what covers the map", async () => {
  await render(show({}));
  const before = told[told.length - 1];
  await act(() => {
    fireEvent(screen.getByTestId("map-top-row"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 370, height: 180 } },
    });
  });
  // The very same cover: the map is not told, and does not frame again.
  expect(told[told.length - 1]).toBe(before);
});

test("behind another page nothing lies over the map", async () => {
  await render(show({ active: false }));
  expect(cover()).toBeNull();
});

test("the card is under the map, not over it: the attribution is never covered", async () => {
  await render(show({}));
  const area = screen.getByTestId("map-area");
  const card = screen.getByTestId("map-card");
  // Two children of the screen, the map first, and the card laid out in
  // the flow after it: the bottom of the map, where the attribution is,
  // has nothing over it.
  expect(card.parent).toBe(area.parent);
  expect(area.parent?.children).toEqual([area, card]);
  expect(StyleSheet.flatten(card.props.style).position).toBeUndefined();
  expect(StyleSheet.flatten(area.props.style)).toEqual({ flex: 1 });
  // The buttons hang from the top of the map, under the status bar.
  const top = screen.getByTestId("map-top-row").parent;
  expect(top?.parent).toBe(area);
  const hung = StyleSheet.flatten(top?.props.style);
  expect(hung).toMatchObject({ position: "absolute", top: 62 + space.sm });
  expect(hung.bottom).toBeUndefined();
});
