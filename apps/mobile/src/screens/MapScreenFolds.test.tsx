/**
 * The card at the end of an activity folds (TASK-478 part b, the user's
 * choice «Scheda che si piega»): its handle touched, only the strip is left
 * over the map, and what was chosen in the card is kept for when it opens
 * again; touched again, it opens. Without a strip, or anywhere but the
 * end, there is no handle.
 */
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MapScreen } from "./MapScreen";

jest.mock("../map/MapKindButton", () => ({ MapKindButton: () => null }));

const FRAME = { x: 0, y: 0, width: 390, height: 844 };
const INSETS = { top: 47, left: 0, right: 0, bottom: 34 };

/** A choice of the card, kept only while the card stays mounted. */
function Choice() {
  const [chosen, setChosen] = useState(false);
  return (
    <Pressable onPress={() => setChosen(true)} accessibilityRole="button">
      <Text>{chosen ? "Chosen" : "Choose"}</Text>
    </Pressable>
  );
}

function Screen({
  scrolls = true,
  strip = true,
}: {
  scrolls?: boolean;
  strip?: boolean;
}) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: FRAME, insets: INSETS }}>
      <MapScreen
        map={null}
        active
        onBack={jest.fn()}
        mapError={null}
        banner={<Text>Your flight</Text>}
        scrolls={scrolls}
        endStrip={
          strip
            ? (open) => (
                <Pressable onPress={open} testID="strip">
                  <Text>3.02 km · 18:00</Text>
                </Pressable>
              )
            : undefined
        }
      >
        <Choice />
      </MapScreen>
    </SafeAreaProvider>
  );
}

/** Whether the card's content is hidden, still mounted. */
function hidden(): boolean {
  const style = StyleSheet.flatten(
    screen.getByTestId("map-card-scroll", { includeHiddenElements: true }).props.style,
  );
  return style.display === "none";
}

test("the handle folds the card to its strip and opens it again", async () => {
  await render(<Screen />);
  expect(screen.queryByTestId("strip")).toBeNull();
  expect(hidden()).toBe(false);
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  expect(screen.getByText("3.02 km · 18:00")).toBeOnTheScreen();
  expect(hidden()).toBe(true);
  await fireEvent.press(screen.getByLabelText("Show the numbers"));
  expect(screen.queryByTestId("strip")).toBeNull();
  expect(hidden()).toBe(false);
});

test("the strip touched opens the card", async () => {
  await render(<Screen />);
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  await fireEvent.press(screen.getByTestId("strip"));
  expect(screen.queryByTestId("strip")).toBeNull();
  expect(hidden()).toBe(false);
});

test("folded, what was chosen in the card is kept", async () => {
  await render(<Screen />);
  await fireEvent.press(screen.getByText("Choose"));
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  await fireEvent.press(screen.getByLabelText("Show the numbers"));
  expect(screen.getByText("Chosen")).toBeOnTheScreen();
});

test("the next end starts with the card open", async () => {
  const view = await render(<Screen />);
  await fireEvent.press(screen.getByLabelText("Hide the numbers"));
  await view.rerender(<Screen scrolls={false} />);
  await view.rerender(<Screen />);
  expect(screen.queryByTestId("strip")).toBeNull();
  expect(hidden()).toBe(false);
});

test("without a strip, or anywhere but the end, no handle", async () => {
  await render(<Screen strip={false} />);
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();
  await render(<Screen scrolls={false} />);
  expect(screen.queryByLabelText("Hide the numbers")).toBeNull();
});
