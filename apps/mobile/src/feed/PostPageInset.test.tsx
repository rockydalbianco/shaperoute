import feed from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost as Post, Session } from "@shaperoute/shared-types";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import type { AccountState } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { space } from "../theme/tokens";
import { forgetFeedMaps } from "./FeedMaps";
import { shownPost } from "./feedPosts";
import { PostPage } from "./PostPage";

// The phone's real edges, as the native module gives them at start. The
// real provider stays: it is what the page reads them from inside its Modal.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 420, height: 912 },
    insets: { top: 62, right: 0, bottom: 34, left: 0 },
  },
}));
jest.mock("expo-file-system");

/** What the app's edges are inside a Modal on iOS: none. */
const IN_A_MODAL = { top: 0, right: 0, bottom: 0, left: 0 };

/** The first padding of `side` above the element, from its parents. */
function paddingAbove(testID: string, side: "paddingTop" | "paddingBottom") {
  let at = screen.getByTestId(testID).parent;
  while (at !== null) {
    const style = StyleSheet.flatten(at.props.style) as ViewStyle | undefined;
    if (typeof style?.[side] === "number") {
      return style[side];
    }
    at = at.parent;
  }
  return undefined;
}

beforeEach(() => {
  forgetFeedMaps();
  jest.spyOn(global, "fetch").mockImplementation(async () => Response.json({}));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("«‹» of the page of a post is below the status bar, and the bar of four above the phone's bottom edge (TASK-410)", async () => {
  const signedIn: AccountState = { status: "signedIn", session: session as Session };
  await render(
    <SafeAreaInsetsContext.Provider value={IN_A_MODAL}>
      <FollowsContext.Provider
        value={{
          apiUrl: "http://api",
          account: { state: signedIn, sessionEnded: jest.fn() },
          openProfile: jest.fn(),
        }}
      >
        <PostPage post={shownPost(feed.posts[0] as Post)} onClose={jest.fn()} />
      </FollowsContext.Provider>
    </SafeAreaInsetsContext.Provider>,
  );
  // Before, 0: «‹» under the clock, where a tap does not reach it.
  expect(paddingAbove("post-back", "paddingTop")).toBe(62);
  expect(
    StyleSheet.flatten(screen.getByTestId("post-sheet").props.style),
  ).toMatchObject({ paddingBottom: 34 + space.sm });
});
