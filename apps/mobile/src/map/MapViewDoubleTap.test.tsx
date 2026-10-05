import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const TRENTO: LatLon = [46.0671, 11.1214];
const ASKED = '{"type":"setDoubleTap","on":true}';
const NOT_ASKED = '{"type":"setDoubleTap","on":false}';

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

function sent(): string[] {
  return injectJavaScript.mock.calls.map(([script]: [string]) => script);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("without `onDoubleTap` the map is never told of double taps", async () => {
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(sent().some((script) => script.includes("setDoubleTap"))).toBe(false);
  // And one the page would post is nobody's.
  await pagePosts('{"type":"doubleTap"}');
});

test("with it, the map is asked once ready, and each double tap calls it", async () => {
  const onDoubleTap = jest.fn();
  await render(
    <MapView start={null} route={null} onDoubleTap={onDoubleTap} onError={jest.fn()} />,
  );
  expect(injectJavaScript).not.toHaveBeenCalled();
  await pagePosts('{"type":"ready"}');
  expect(sent().filter((script) => script.includes(ASKED))).toHaveLength(1);

  await pagePosts('{"type":"doubleTap"}');
  await pagePosts('{"type":"doubleTap"}');
  expect(onDoubleTap).toHaveBeenCalledTimes(2);
});

test("taken away, the map gets its zoom back, once", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView start={null} route={null} onDoubleTap={jest.fn()} onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={null} route={null} onError={onError} />);
  expect(sent().filter((script) => script.includes(NOT_ASKED))).toHaveLength(1);
  await rerender(<MapView start={TRENTO} route={null} onError={onError} />);
  expect(sent().filter((script) => script.includes(NOT_ASKED))).toHaveLength(1);
});

test("another function for the same double tap does not ask again", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView start={null} route={null} onDoubleTap={jest.fn()} onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  const later = jest.fn();
  await rerender(
    <MapView start={null} route={null} onDoubleTap={later} onError={onError} />,
  );
  expect(sent().filter((script) => script.includes(ASKED))).toHaveLength(1);
  await pagePosts('{"type":"doubleTap"}');
  expect(later).toHaveBeenCalledTimes(1);
});

test("a page loaded again is asked again", async () => {
  await render(
    <MapView start={null} route={null} onDoubleTap={jest.fn()} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await pagePosts('{"type":"ready"}');
  expect(sent().filter((script) => script.includes(ASKED))).toHaveLength(2);
});
