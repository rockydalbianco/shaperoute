/**
 * A card of a route whose shape is turned (TASK-232, ADR-0195): its line
 * and the map under it are turned back, so the drawing reads upright as on
 * the map once opened. The rest of the card is in RouteCard.test.tsx.
 */
import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { lineCamera } from "../feed/feedMapPage";
import { FeedMapShooter, forgetFeedMaps } from "../feed/FeedMaps";
import { framingName, RouteCard } from "./RouteCard";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const RAD = Math.PI / 180;
// The «up» of a shape turned 30° counterclockwise: a stroke from Trento
// that points 30° west of north, as long in metres as it looks.
const NORTH = 0.01 * Math.cos(30 * RAD);
const UP: LatLon[] = [
  [46.06, 11.12],
  [
    46.06 + NORTH,
    11.12 - (0.01 * Math.sin(30 * RAD)) / Math.cos((46.06 + NORTH / 2) * RAD),
  ],
];

/** How the card's only stretch is turned on the screen, in degrees. */
function strokeAngle(): number {
  const [stroke] = screen.getByTestId("route-card-drawing").children;
  const style = StyleSheet.flatten(
    typeof stroke === "string" ? undefined : stroke.props.style,
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

test("a route turned 30° is drawn turned back: its up is up", async () => {
  await render(
    <RouteCard width={173} line={UP} title="Heart · 5.1 km" rotationDeg={30} />,
  );
  expect(strokeAngle()).toBeCloseTo(-90, 4);
});

test("a route that does not say how it is turned is drawn north up", async () => {
  const { rerender } = await render(
    <RouteCard width={173} line={UP} title="Heart · 5.1 km" />,
  );
  expect(strokeAngle()).toBeCloseTo(-120, 4);
  await rerender(
    <RouteCard width={173} line={UP} title="Heart · 5.1 km" rotationDeg={null} />,
  );
  expect(strokeAngle()).toBeCloseTo(-120, 4);
  await rerender(
    <RouteCard width={173} line={UP} title="Heart · 5.1 km" rotationDeg={0} />,
  );
  expect(strokeAngle()).toBeCloseTo(-120, 4);
});

test("the map under a turned line is taken turned the same way", async () => {
  await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <RouteCard width={173} line={UP} title="Heart · 5.1 km" map rotationDeg={30} />
    </>,
  );
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  const camera = lineCamera(UP, 173, 114, 12, -30);
  const key = `${framingName(camera)}:173x114@-30`;
  expect(asked()).toMatchObject({ type: "shoot", key, bearing: -30 });
  expect(asked().zoom).toBeCloseTo(camera?.zoom ?? 0, 9);

  const picture = "data:image/jpeg;base64,AAAA";
  await fireEvent(page, "message", {
    nativeEvent: { data: JSON.stringify({ type: "shot", key, image: picture }) },
  });
  const map = screen.getByTestId("route-card-map", { includeHiddenElements: true });
  expect(map).toHaveProp("source", { uri: picture });
});

test("north up, the map is asked as it always was", async () => {
  await render(
    <>
      <FeedMapShooter width={358} height={222} />
      <RouteCard width={173} line={UP} title="Heart · 5.1 km" map />
    </>,
  );
  const page = screen.getByTestId("feed-map-page", { includeHiddenElements: true });
  await fireEvent(page, "message", { nativeEvent: { data: '{"type":"ready"}' } });
  expect(asked().key).toBe(`${framingName(lineCamera(UP, 173, 114, 12))}:173x114`);
  expect("bearing" in asked()).toBe(false);
});
