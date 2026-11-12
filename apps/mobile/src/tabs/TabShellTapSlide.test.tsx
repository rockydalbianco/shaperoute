import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { runAnimationsOnJs } from "../ui/animationsOnJs.testing";
import { useReduceMotion } from "../ui/useReduceMotion";
import { type ShellPage, TabShell } from "./TabShell";
import { STRIP_START } from "./tabStrip";

// A tab touched while the pages still slide after a swipe (TASK-470, bug 1):
// what is left of the slide, a fling the touch did not stop, once carried
// the strip on and the app came to rest on the page beside the touched one.

jest.mock("../haptics/haptics", () => ({ selectionFeel: jest.fn() }));
jest.mock("../ui/useReduceMotion");

const PAGES: ShellPage[] = ["Feed", "Draw", "Messages", "Explore"].map(
  (title, index) => ({
    title,
    label: title,
    icon: (["house", "pencil", "send", "search"] as const)[index],
    render: () => <Text>{`${title} page`}</Text>,
  }),
);
// The window of the tests (react-native's jest setup).
const WIDTH = 750;

function Shell() {
  const [page, setPage] = useState(1);
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <TabShell pages={PAGES} page={page} onPage={setPage} />
    </SafeAreaProvider>
  );
}

function at(places: number) {
  return { nativeEvent: { contentOffset: { x: places * WIDTH, y: 0 } } };
}

function onScreen(title: string): boolean {
  return (
    screen.getByTestId(`tab-page-${title}`).props.accessibilityElementsHidden === false
  );
}

let scrollTo: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  runAnimationsOnJs();
  jest.mocked(useReduceMotion).mockReturnValue(false);
  scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("a tab touched as the pages still slide stays: what is left of the slide does not move on", async () => {
  await render(<Shell />);
  const pages = screen.getByTestId("tab-pages");
  // «Draw» on screen; a swipe towards «Messages», the finger lifted half way.
  await fireEvent(pages, "scrollBeginDrag", at(STRIP_START));
  await fireEvent.scroll(pages, at(STRIP_START + 0.4));
  await fireEvent(pages, "scrollEndDrag", at(STRIP_START + 0.4));

  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  expect(screen.getByRole("tab", { name: "Explore" })).toBeSelected();

  // The fling goes on past half way and rests one place on.
  await fireEvent.scroll(pages, at(STRIP_START + 0.7));
  expect(onScreen("Explore")).toBe(true);
  await fireEvent.scroll(pages, at(STRIP_START + 1));
  scrollTo.mockClear();
  await fireEvent(pages, "momentumScrollEnd", at(STRIP_START + 1));

  expect(screen.getByRole("tab", { name: "Explore" })).toBeSelected();
  expect(onScreen("Explore")).toBe(true);
  // The strip goes back to the touched tab's page.
  expect(scrollTo).toHaveBeenCalledWith(
    expect.objectContaining({ x: STRIP_START * WIDTH, animated: true }),
  );
});

test("the next swipe after a touched tab is a swipe again", async () => {
  await render(<Shell />);
  const pages = screen.getByTestId("tab-pages");
  await fireEvent.press(screen.getByRole("tab", { name: "Explore" }));
  expect(screen.getByRole("tab", { name: "Explore" })).toBeSelected();

  await fireEvent(pages, "scrollBeginDrag", at(STRIP_START));
  await fireEvent.scroll(pages, at(STRIP_START + 0.6));
  await fireEvent.scroll(pages, at(STRIP_START + 1));
  await fireEvent(pages, "momentumScrollEnd", at(STRIP_START + 1));
  // After «Explore», round the bar, «Feed».
  expect(screen.getByRole("tab", { name: "Feed" })).toBeSelected();
  expect(onScreen("Feed")).toBe(true);
});
