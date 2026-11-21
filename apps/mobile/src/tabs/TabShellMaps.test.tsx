/**
 * The maps under the drawings of the pages (TASK-480): the map page that
 * takes them is laid out whatever page is on screen. «Feed» has a shooter of
 * its own, and two tabs away it is under `display: none`, where a map page
 * draws nothing. The rest is in TabShell.test.tsx.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FeedMapShooter, forgetFeedMaps, useFeedMap } from "../feed/FeedMaps";
import { TabShell, type ShellPage } from "./TabShell";

jest.mock("react-native-webview");

// An «L» in Firenze.
const LINE: LatLon[] = [
  [43.78, 11.25],
  [43.77, 11.25],
  [43.77, 11.257],
];
const PICTURE = "data:image/jpeg;base64,AAAA";

function Drawing({ id }: { id: string }) {
  const map = useFeedMap(id, LINE, 358, 222, 24);
  return <Text>{`${id}: ${map ?? "no map"}`}</Text>;
}

// The pages in the order of the app's tabs: «Explore» is two away from
// «Feed», the profile is beside it going round.
const PAGES: ShellPage[] = [
  {
    title: "Feed",
    label: "Feed",
    icon: "house",
    // As FeedScreen: its own shooter under its list.
    render: () => (
      <>
        <FeedMapShooter width={358} height={222} />
        <Drawing id="feed" />
      </>
    ),
  },
  { title: "Draw", label: "Draw", icon: "pencil", render: () => <Drawing id="draw" /> },
  {
    title: "Messages",
    label: "Messages",
    icon: "send",
    lazy: true,
    render: () => <Text>Messages</Text>,
  },
  {
    title: "Explore",
    label: "Explore",
    icon: "search",
    lazy: true,
    render: () => <Drawing id="explore" />,
  },
  {
    title: "Profile",
    label: "Profile",
    icon: "house",
    lazy: true,
    render: () => <Drawing id="profile" />,
  },
];

function Shell({ page }: { page: number }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <TabShell pages={PAGES} page={page} onPage={() => {}} />
    </SafeAreaProvider>
  );
}

type Element = ReturnType<typeof screen.getByTestId>;

/** The map pages there are: one at a time. */
function mapPages(): Element[] {
  return screen.queryAllByTestId("feed-map-page", { includeHiddenElements: true });
}

/** Whether nothing around `element` is `display: none`: a map page draws
 * only where it is laid out. */
function laidOut(element: Element): boolean {
  for (let each: Element | null = element; each !== null; each = each.parent) {
    if (StyleSheet.flatten(each.props.style)?.display === "none") {
      return false;
    }
  }
  return true;
}

function pagePosts(message: object) {
  return fireEvent(mapPages()[0], "message", {
    nativeEvent: { data: JSON.stringify(message) },
  });
}

beforeEach(() => {
  forgetFeedMaps();
});

test("with «Explore» on screen «Feed» is not laid out, and the map page is", async () => {
  await render(<Shell page={3} />);
  expect(
    screen.getByTestId("tab-page-Feed", { includeHiddenElements: true }),
  ).toHaveStyle({ display: "none" });
  expect(mapPages()).toHaveLength(1);
  expect(laidOut(mapPages()[0])).toBe(true);
});

test("a drawing of «Explore» gets its map", async () => {
  await render(<Shell page={3} />);
  await pagePosts({ type: "ready" });
  // «Feed» was built first: its drawing is the first asked for.
  await pagePosts({ type: "shot", key: "feed:358x222", image: PICTURE });
  expect(laidOut(mapPages()[0])).toBe(true);
  await pagePosts({ type: "shot", key: "explore:358x222", image: PICTURE });
  expect(screen.getByText(`explore: ${PICTURE}`)).toBeOnTheScreen();
});

test("with «Feed» on screen there is one map page, laid out, under the cover", async () => {
  await render(<Shell page={0} />);
  expect(mapPages()).toHaveLength(1);
  expect(laidOut(mapPages()[0])).toBe(true);
  // Nobody sees it: the cover lies over it, and the pages over the cover.
  const shell = screen.getByTestId("tab-maps-cover").parent;
  const order = shell?.children.map((each) =>
    typeof each === "string" ? each : each.props.testID,
  );
  expect(order?.indexOf("tab-maps-cover")).toBe(1);
  expect(order?.indexOf("tab-pages")).toBeGreaterThan(1);
  expect(screen.getByTestId("tab-maps-cover")).toHaveStyle({
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  await pagePosts({ type: "ready" });
  await pagePosts({ type: "shot", key: "feed:358x222", image: PICTURE });
  expect(screen.getByText(`feed: ${PICTURE}`)).toBeOnTheScreen();
});

test("no drawing waiting, no map page", async () => {
  await render(<Shell page={2} />);
  await pagePosts({ type: "ready" });
  await pagePosts({ type: "shot", key: "feed:358x222", image: PICTURE });
  await pagePosts({ type: "shot", key: "draw:358x222", image: PICTURE });
  expect(mapPages()).toHaveLength(0);
});
