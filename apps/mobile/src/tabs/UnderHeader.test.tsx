import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react-native";
import { ScrollView, StyleSheet, Text, type ViewStyle } from "react-native";

import { SkiTodayPage } from "../skimode/SkiTodayPage";

import { HeaderFloatsContext, useUnderHeader } from "./headerScroll";

// Where the header floats in the phone's real glass (TASK-469 B3,
// ADR-0383), the main scroller of a page lets what scrolls up show behind
// it. Until then, and outside the tab shell, a scroller is as it was.

function Scroller() {
  return <ScrollView testID="scroller" style={[{ flex: 1 }, useUnderHeader()]} />;
}

function overflowOf(): unknown {
  return StyleSheet.flatten(screen.getByTestId("scroller").props.style).overflow;
}

test("outside the tab shell a scroller cuts at its edge, as before", async () => {
  await render(<Scroller />);
  expect(overflowOf()).toBeUndefined();
});

test("under a header that does not float, as before too", async () => {
  await render(
    <HeaderFloatsContext.Provider value={false}>
      <Scroller />
    </HeaderFloatsContext.Provider>,
  );
  expect(overflowOf()).toBeUndefined();
});

test("under a floating header, what scrolls past the top goes on showing", async () => {
  await render(
    <HeaderFloatsContext.Provider value>
      <Scroller />
    </HeaderFloatsContext.Provider>,
  );
  expect(overflowOf()).toBe("visible");
});

/** What the page's scroller does with what passes its edge. */
function pageOverflow(): unknown {
  let view = screen.getByTestId("ski-record").parent;
  while (view !== null) {
    if (view.props.contentContainerStyle !== undefined) {
      return (StyleSheet.flatten(view.props.style) as ViewStyle).overflow;
    }
    view = view.parent;
  }
  throw new Error("No scroller around the page");
}

test("a page of the tab bar cuts at its edge until the header floats", async () => {
  await render(<SkiTodayPage onRecord={() => {}} resort={<Text>Resort</Text>} />);
  expect(pageOverflow()).toBeUndefined();
});

test("under a floating header its content goes on showing behind it", async () => {
  await render(
    <HeaderFloatsContext.Provider value>
      <SkiTodayPage onRecord={() => {}} resort={<Text>Resort</Text>} />
    </HeaderFloatsContext.Provider>,
  );
  expect(pageOverflow()).toBe("visible");
});

// The pages whose main scroller starts right under the header: a new one
// joins this list. Not «Feed», «Explore», «Paddle» or «Resorts», which keep
// something of their own over the scroller.
const PAGES = [
  "screens/ChooseScreen.tsx",
  "skimode/SkiDaysPage.tsx",
  "skimode/SkiTodayPage.tsx",
  "tabs/MessagesPage.tsx",
];

test.each(PAGES)("%s lets its content show under a floating header", (file) => {
  const source = readFileSync(join(__dirname, "..", file), "utf8");
  expect(source).toMatch(/const underHeader = useUnderHeader\(\);/);
  // Asked for, and given to the scroller that tells the header.
  expect(source).toMatch(
    /\{\.\.\.headerScroll\}\s+style=\{(?:underHeader|\[styles\.page, underHeader\])\}/,
  );
});
