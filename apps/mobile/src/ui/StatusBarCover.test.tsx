import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color } from "../theme/tokens";
import { StatusBarCover } from "./StatusBarCover";

async function show(top: number) {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top, left: 0, right: 0, bottom: 34 },
      }}
    >
      <StatusBarCover />
    </SafeAreaProvider>,
  );
}

test("as tall as the status bar, in the page's colour, at the top", async () => {
  await show(47);
  const cover = screen.getByTestId("status-bar-cover", { includeHiddenElements: true });
  const style = StyleSheet.flatten(cover.props.style) as ViewStyle;
  expect(style.height).toBe(47);
  expect(style.backgroundColor).toBe(color.background);
  expect(style.position).toBe("absolute");
  expect(style.top).toBe(0);
  expect(style.left).toBe(0);
  expect(style.right).toBe(0);
});

test("touches go through it and the screen reader skips it", async () => {
  await show(47);
  const cover = screen.getByTestId("status-bar-cover", { includeHiddenElements: true });
  expect(cover.props.pointerEvents).toBe("none");
  expect(cover.props.accessible).toBe(false);
});

test("nothing on a screen with no status bar inset", async () => {
  await show(0);
  expect(
    screen.queryByTestId("status-bar-cover", { includeHiddenElements: true }),
  ).toBeNull();
});
