import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const ROUTE: LatLon[] = [
  [44.0, 12.65],
  [44.004, 12.655],
  [44.0, 12.65],
];
const ASKED = '{"type":"setMove","on":true}';
const NOT_ASKED = '{"type":"setMove","on":false}';

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

function sent(): string[] {
  return injectJavaScript.mock.calls.map(([script]: [string]) => script);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("without `moving` the map is never told of moves", async () => {
  const onMoved = jest.fn();
  await render(
    <MapView start={null} route={ROUTE} onMoved={onMoved} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  expect(sent().some((script) => script.includes("setMove"))).toBe(false);
});

test("while moving the map is asked once, and told once when it ends", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView start={null} route={ROUTE} moving onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  expect(sent().filter((script) => script.includes(ASKED))).toHaveLength(1);

  await rerender(<MapView start={null} route={ROUTE} onError={onError} />);
  expect(sent().filter((script) => script.includes(NOT_ASKED))).toHaveLength(1);
  await rerender(<MapView start={null} route={ROUTE} onError={onError} />);
  expect(sent().filter((script) => script.includes(NOT_ASKED))).toHaveLength(1);
});

test("a route dragged and left is told to the app, with how far", async () => {
  const onMoved = jest.fn();
  await render(
    <MapView start={null} route={ROUTE} moving onMoved={onMoved} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await pagePosts('{"type":"moved","by":[0.002,-0.001]}');
  expect(onMoved).toHaveBeenCalledWith([0.002, -0.001]);
  // What is not a move is nobody's.
  await pagePosts('{"type":"moved","by":"far"}');
  expect(onMoved).toHaveBeenCalledTimes(1);
});

test("the same route kept while it is drawn again is not sent to the map again", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView start={null} route={ROUTE} walks={null} moving onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  const shown = () => sent().filter((script) => script.includes("showRoute")).length;
  expect(shown()).toBe(1);
  // The move ends, the route of before stays where the finger left it.
  await rerender(<MapView start={null} route={ROUTE} walks={null} onError={onError} />);
  expect(shown()).toBe(1);
});

test("a page loaded again while moving is asked again", async () => {
  await render(<MapView start={null} route={ROUTE} moving onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await pagePosts('{"type":"ready"}');
  expect(sent().filter((script) => script.includes(ASKED))).toHaveLength(2);
});
