/**
 * A drawing of «Feed» whose figure the engine turned (TASK-232, ADR-0195):
 * its line and the map under it are turned back, so the figure reads
 * upright. The rest of the card is in FeedPost.test.tsx.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { lineCamera } from "./feedMapPage";
import { FeedMapShooter, forgetFeedMaps } from "./FeedMaps";
import { drawingHeight, FeedPost } from "./FeedPost";
import type { SamplePost } from "./sampleFeed";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const RAD = Math.PI / 180;
// The «up» of a figure turned 30° counterclockwise: a stroke from Trento
// that points 30° west of north.
const NORTH = 0.01 * Math.cos(30 * RAD);
const UP: LatLon[] = [
  [46.06, 11.12],
  [
    46.06 + NORTH,
    11.12 - (0.01 * Math.sin(30 * RAD)) / Math.cos((46.06 + NORTH / 2) * RAD),
  ],
];
const WIDTH = 358;
const HEIGHT = drawingHeight(WIDTH);
// Clear around the line, as the card has it (DRAWING_PAD = space.xl).
const PAD = 24;

const POST: SamplePost = {
  id: "trento-star-5000-0",
  user: "dade.runs",
  title: "A star over Trento",
  city: "trento",
  shape: "star",
  route_m: 5120,
  minutes: 30,
  score: 93,
  line: UP,
  rotation_deg: 30,
};

/** How the card's only stretch is turned on the screen, in degrees. */
function strokeAngle(): number {
  const drawing = screen.getByTestId("feed-drawing");
  const stroke = drawing.children.find(
    (child) => typeof child !== "string" && child.props.testID !== "feed-map",
  );
  const style = StyleSheet.flatten(
    typeof stroke === "string" || stroke === undefined ? undefined : stroke.props.style,
  );
  const [{ rotate }] = style.transform as { rotate: string }[];
  return parseFloat(rotate);
}

/** What the page that takes the pictures was asked last. */
function asked(): Record<string, unknown> {
  const script = injectJavaScript.mock.calls.at(-1)?.[0] ?? "{}";
  return JSON.parse(script.slice(script.indexOf("{"), script.lastIndexOf("}") + 1));
}

beforeEach(() => {
  forgetFeedMaps();
  injectJavaScript.mockClear();
});

test("a figure turned 30° is drawn turned back: its up is up", async () => {
  await render(<FeedPost post={POST} width={WIDTH} />);
  expect(strokeAngle()).toBeCloseTo(-90, 4);
});

test("a figure that does not say how it is turned is drawn north up", async () => {
  const { rotation_deg: _turn, ...northUp } = POST;
  const { rerender } = await render(<FeedPost post={northUp} width={WIDTH} />);
  expect(strokeAngle()).toBeCloseTo(-120, 4);
  await rerender(<FeedPost post={{ ...northUp, rotation_deg: 0 }} width={WIDTH} />);
  expect(strokeAngle()).toBeCloseTo(-120, 4);
});

test("the map under a turned figure is taken turned the same way", async () => {
  await render(
    <>
      <FeedMapShooter width={WIDTH} height={HEIGHT} />
      <FeedPost post={POST} width={WIDTH} />
    </>,
  );
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  const camera = lineCamera(UP, WIDTH, HEIGHT, PAD, -30);
  const key = `${POST.id}:${WIDTH}x${HEIGHT}@-30`;
  expect(asked()).toMatchObject({ type: "shoot", key, bearing: -30 });
  expect(asked().zoom).toBeCloseTo(camera?.zoom ?? 0, 9);

  const picture = "data:image/jpeg;base64,AAAA";
  await fireEvent(page, "message", {
    nativeEvent: { data: JSON.stringify({ type: "shot", key, image: picture }) },
  });
  const map = screen.getByTestId("feed-map", { includeHiddenElements: true });
  expect(map).toHaveProp("source", { uri: picture });
});
