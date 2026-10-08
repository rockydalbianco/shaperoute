/**
 * The pictures of a map that is turned (TASK-232, ADR-0195): asked for with
 * their bearing, and kept apart from those north up. The rest is in
 * FeedMaps.test.tsx.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { FeedMapShooter, forgetFeedMaps, useFeedMap } from "./FeedMaps";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

// An «L» in Firenze.
const LINE: LatLon[] = [
  [43.78, 11.25],
  [43.77, 11.25],
  [43.77, 11.257],
];
const PICTURE = "data:image/jpeg;base64,AAAA";
const TURNED = "data:image/jpeg;base64,BBBB";

function Drawing({ bearing }: { bearing?: number }) {
  const map = useFeedMap("a", LINE, 358, 222, 24, bearing);
  return <Text>{`${bearing ?? "north"}: ${map ?? "no map"}`}</Text>;
}

function pagePosts(message: object) {
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  return fireEvent(page, "message", {
    nativeEvent: { data: JSON.stringify(message) },
  });
}

/** What the page was asked last. */
function asked(): Record<string, unknown> {
  const script = injectJavaScript.mock.calls.at(-1)?.[0] ?? "{}";
  return JSON.parse(script.slice(script.indexOf("{"), script.lastIndexOf("}") + 1));
}

beforeEach(() => {
  forgetFeedMaps();
  injectJavaScript.mockClear();
});

test("a turned drawing asks for its map at its bearing", async () => {
  await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <Drawing bearing={-30} />
    </>,
  );
  await pagePosts({ type: "ready" });
  expect(asked()).toMatchObject({
    type: "shoot",
    key: "a:358x222@-30",
    bearing: -30,
    width: 358,
    height: 222,
  });
  await pagePosts({ type: "shot", key: "a:358x222@-30", image: TURNED });
  expect(screen.getByText(`-30: ${TURNED}`)).toBeOnTheScreen();
});

test("the same drawing north up is another picture, asked without a bearing", async () => {
  await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <Drawing bearing={-30} />
      <Drawing />
    </>,
  );
  await pagePosts({ type: "ready" });
  await pagePosts({ type: "shot", key: "a:358x222@-30", image: TURNED });
  // The turned one does not stand in for the one north up.
  expect(screen.getByText("north: no map")).toBeOnTheScreen();
  expect(asked()).toMatchObject({ type: "shoot", key: "a:358x222" });
  expect("bearing" in asked()).toBe(false);

  await pagePosts({ type: "shot", key: "a:358x222", image: PICTURE });
  expect(screen.getByText(`north: ${PICTURE}`)).toBeOnTheScreen();
  expect(screen.getByText(`-30: ${TURNED}`)).toBeOnTheScreen();
});
