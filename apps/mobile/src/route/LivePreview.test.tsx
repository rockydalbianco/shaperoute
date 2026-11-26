import type { Activity, LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { useFeedMap } from "../feed/FeedMaps";
import { creditLine } from "../feed/RouteMap";
import { route as routeLine, shapeGhost } from "../theme/tokens";
import { toDistanceM } from "./distance";
import { LIVE_PREVIEW_HEIGHT, LivePreview } from "./LivePreview";
import { RouteChoice } from "./RoutePanel";
import { checkWord } from "./wordInput";

jest.mock("../feed/FeedMaps", () => ({ useFeedMap: jest.fn(() => null) }));

const asked = useFeedMap as jest.MockedFunction<typeof useFeedMap>;

// Piazza del Duomo, Trento.
const START: LatLon = [46.0679, 11.1211];
const WIDTH = 340;

beforeEach(() => {
  asked.mockClear();
  asked.mockImplementation(() => null);
});

/** The piece of map laid out `WIDTH` points wide. */
async function layOut() {
  await fireEvent(screen.getByTestId("live-preview-room"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: WIDTH, height: LIVE_PREVIEW_HEIGHT } },
  });
}

/** How wide the dashes reach, in points. */
function reach(): number {
  const lefts = screen
    .getAllByTestId("live-preview-dash")
    .map((dash) => StyleSheet.flatten(dash.props.style).left as number);
  return Math.max(...lefts) - Math.min(...lefts);
}

test("before it knows its room it asks for no picture and draws nothing", async () => {
  await render(<LivePreview shape="heart" distanceM={5000} start={START} />);
  expect(screen.getByTestId("live-preview")).toBeOnTheScreen();
  expect(asked).not.toHaveBeenCalled();
  expect(screen.queryByTestId("live-preview-dash")).toBeNull();
});

test("the outline dashed in the ghost's colour, the start a dot of the route's", async () => {
  await render(<LivePreview shape="heart" distanceM={5000} start={START} />);
  await layOut();
  const dashes = screen.getAllByTestId("live-preview-dash");
  expect(dashes.length).toBeGreaterThan(20);
  const dash = StyleSheet.flatten(dashes[0].props.style);
  expect(dash.backgroundColor).toBe(shapeGhost.color);
  expect(dash.height).toBe(shapeGhost.waitWidth);
  const dot = StyleSheet.flatten(screen.getByTestId("live-preview-start").props.style);
  expect(dot.backgroundColor).toBe(routeLine.color);
  // The size on the ground and a scale bar, as the preview before it.
  expect(screen.getByText(/^≈ \d\.\d × \d\.\d km$/)).toBeOnTheScreen();
  expect(screen.getByText(/^(\d+ m|\d+ km)$/)).toBeOnTheScreen();
  expect(
    screen.getByLabelText(/^heart, about \d\.\d × \d\.\d km on the map$/),
  ).toBeOnTheScreen();
});

test("it asks for one picture of the map, the box's size, with no margin", async () => {
  await render(<LivePreview shape="heart" distanceM={5000} start={START} />);
  await layOut();
  const [id, line, width, height, pad] = asked.mock.calls[asked.mock.calls.length - 1];
  expect(id).toMatch(/^preview:46\.\d{5},11\.\d{5}:\d+$/);
  expect(line).toHaveLength(2);
  expect([width, height, pad]).toEqual([WIDTH, LIVE_PREVIEW_HEIGHT, 0]);
  // No picture yet: the outline on the dark, and nobody to credit.
  expect(screen.queryByTestId("live-preview-map")).toBeNull();
  expect(screen.queryByText(creditLine())).toBeNull();
});

test("with the picture, the map under the outline and its credit", async () => {
  asked.mockImplementation(() => "data:image/png;base64,AAAA");
  await render(<LivePreview shape="heart" distanceM={5000} start={START} />);
  await layOut();
  expect(screen.getByTestId("live-preview-map").props.source).toEqual({
    uri: "data:image/png;base64,AAAA",
  });
  expect(screen.getByText(creditLine())).toBeOnTheScreen();
  expect(screen.getAllByTestId("live-preview-dash").length).toBeGreaterThan(20);
});

test("a step of the distance: the outline grows, the picture is the same", async () => {
  const { rerender } = await render(
    <LivePreview shape="heart" distanceM={5000} start={START} />,
  );
  await layOut();
  const before = reach();
  const first = asked.mock.calls[asked.mock.calls.length - 1];
  await rerender(<LivePreview shape="heart" distanceM={5500} start={START} />);
  const after = reach();
  const second = asked.mock.calls[asked.mock.calls.length - 1];
  expect(after / before).toBeCloseTo(1.1, 1);
  expect(second[0]).toBe(first[0]);
  // The very same line: the hook has nothing new to fit.
  expect(second[1]).toBe(first[1]);
});

test("far past it the map steps back: another picture", async () => {
  const { rerender } = await render(
    <LivePreview shape="heart" distanceM={5000} start={START} />,
  );
  await layOut();
  const first = asked.mock.calls[asked.mock.calls.length - 1][0];
  await rerender(<LivePreview shape="heart" distanceM={20_000} start={START} />);
  const second = asked.mock.calls[asked.mock.calls.length - 1][0];
  expect(second).not.toBe(first);
  // Four times the distance, two steps: the frame is four times as wide.
  const wide = (id: string) => Number(id.split(":")[2]);
  expect(wide(second) / wide(first)).toBe(4);
});

test("another shape, another start: another outline and another picture", async () => {
  const { rerender } = await render(
    <LivePreview shape="heart" distanceM={5000} start={START} />,
  );
  await layOut();
  const heart = screen.getAllByTestId("live-preview-dash").length;
  const first = asked.mock.calls[asked.mock.calls.length - 1][0];
  await rerender(<LivePreview shape="horse" distanceM={5000} start={START} />);
  expect(screen.getAllByTestId("live-preview-dash").length).not.toBe(heart);
  expect(screen.getByLabelText(/^horse, about /)).toBeOnTheScreen();
  await rerender(
    <LivePreview shape="horse" distanceM={5000} start={[45.4642, 9.19]} />,
  );
  const moved = asked.mock.calls[asked.mock.calls.length - 1][0];
  expect(moved).toMatch(/^preview:45\./);
  expect(moved).not.toBe(first);
});

/** «Draw» with a heart of 5 km chosen, from `start`, for `activity`. */
function choice(start: LatLon | null | undefined, activity: Activity = "running") {
  const distanceM = toDistanceM("5", activity);
  return (
    <RouteChoice
      kind="shape"
      onKind={jest.fn()}
      shapeText="heart"
      shape="heart"
      onShapeText={jest.fn()}
      reading={null}
      onShapeDone={jest.fn()}
      wordText=""
      onWordText={jest.fn()}
      wordCheck={checkWord("", distanceM, activity)}
      letterStyle="round"
      onLetterStyle={jest.fn()}
      distanceText="5"
      distanceM={distanceM}
      image={{ status: "none" }}
      onChooseImage={jest.fn()}
      onDistanceText={jest.fn()}
      activity={activity}
      start={start}
    />
  );
}

test("«Draw» with a start shows the shape on the map round it", async () => {
  await render(choice(START));
  expect(screen.getByTestId("live-preview")).toBeOnTheScreen();
  expect(screen.queryByTestId("shape-preview")).toBeNull();
});

test("with no start yet, the shape to scale as before", async () => {
  await render(choice(null));
  expect(screen.getByTestId("shape-preview")).toBeOnTheScreen();
  expect(screen.queryByTestId("live-preview")).toBeNull();
  await render(choice(undefined));
  expect(screen.getAllByTestId("shape-preview").length).toBeGreaterThan(0);
});

test("on the water the shape is placed freely, not at the start: no map", async () => {
  await render(choice(START, "paddling"));
  expect(screen.getByTestId("shape-preview")).toBeOnTheScreen();
  expect(screen.queryByTestId("live-preview")).toBeNull();
  expect(asked).not.toHaveBeenCalled();
});
