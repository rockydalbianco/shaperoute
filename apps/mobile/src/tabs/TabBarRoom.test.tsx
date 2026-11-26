import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

import { SkiTodayPage } from "../skimode/SkiTodayPage";
import { space } from "../theme/tokens";
import { TabBarRoomContext, useTabBarRoom } from "./tabBarRoom";

// The pages of the tab bar go on under the bar (TASK-469 B2a, ADR-0383):
// each leaves the bar's room after the last thing it shows. The shell gives
// the room; until the bar floats it is zero, and the pages look as before.

function Room() {
  return <Text testID="room">{useTabBarRoom()}</Text>;
}

test("outside the tab shell there is no bar to leave room for", async () => {
  await render(<Room />);
  expect(screen.getByTestId("room")).toHaveTextContent("0");
});

test("inside it, the room the shell gives", async () => {
  await render(
    <TabBarRoomContext.Provider value={72}>
      <Room />
    </TabBarRoomContext.Provider>,
  );
  expect(screen.getByTestId("room")).toHaveTextContent("72");
});

/** The end of the page's scroller: the padding under its last thing. */
function endOfPage(): number {
  let view = screen.getByTestId("ski-record").parent;
  while (view !== null) {
    const content = view.props.contentContainerStyle as StyleProp<ViewStyle>;
    if (content !== undefined) {
      return StyleSheet.flatten(content)?.paddingBottom as number;
    }
    view = view.parent;
  }
  throw new Error("No scroller around the page");
}

test("a page ends as before while the room is zero", async () => {
  await render(<SkiTodayPage onRecord={() => {}} resort={<Text>Resort</Text>} />);
  expect(endOfPage()).toBe(space.xxl);
});

test("with the bar over it, a page ends that much later", async () => {
  await render(
    <TabBarRoomContext.Provider value={72}>
      <SkiTodayPage onRecord={() => {}} resort={<Text>Resort</Text>} />
    </TabBarRoomContext.Provider>,
  );
  expect(endOfPage()).toBe(space.xxl + 72);
});

// Every page of the tab bar asks for the room. Three more join when their
// own tasks have landed: the profile and the two of the training mode.
const PAGES = [
  "explore/ExploreScreen.tsx",
  "paddle/PaddleExplore.tsx",
  "screens/ChooseScreen.tsx",
  "screens/FeedScreen.tsx",
  "skimode/SkiDaysPage.tsx",
  "skimode/SkiResortsPage.tsx",
  "skimode/SkiTodayPage.tsx",
  "tabs/MessagesPage.tsx",
];

test.each(PAGES)("%s leaves the tab bar its room", (file) => {
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  expect(source).toMatch(/const barRoom = useTabBarRoom\(\);/);
  // Asked for, and used where the page ends.
  expect(source.match(/\bbarRoom\b/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
});

test("«Draw» lifts its button over the bar too, not only the end of its scroll", () => {
  const source = readFileSync(
    join(__dirname, "..", "screens/ChooseScreen.tsx"),
    "utf8",
  );
  expect(source).toMatch(/Math\.max\(footerHeight, insets\.bottom \+ barRoom\)/);
  expect(source).toMatch(/paddingBottom: insets\.bottom \+ space\.sm \+ barRoom/);
});
