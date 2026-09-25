import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { MapView } from "./MapView";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const TRENTO: LatLon = [46.0671, 11.1214];
const LEVICO: LatLon = [46.0122, 11.2986];

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("sends the start only once the page is ready", async () => {
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  expect(injectJavaScript).not.toHaveBeenCalled();

  await pagePosts('{"type":"ready"}');
  expect(injectJavaScript).toHaveBeenCalledTimes(1);
  expect(injectJavaScript.mock.calls[0][0]).toContain("[11.1214,46.0671]");
});

test("sends every new start", async () => {
  const { rerender } = await render(
    <MapView start={TRENTO} route={null} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={LEVICO} route={null} onError={jest.fn()} />);
  expect(injectJavaScript).toHaveBeenCalledTimes(2);
  expect(injectJavaScript.mock.calls[1][0]).toContain("[11.2986,46.0122]");
});

test("sends nothing without a start", async () => {
  await render(<MapView start={null} route={null} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(injectJavaScript).not.toHaveBeenCalled();
});

test("draws a route in MapLibre order, then clears it", async () => {
  const route: LatLon[] = [TRENTO, LEVICO, TRENTO];
  const { rerender } = await render(
    <MapView start={TRENTO} route={null} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={TRENTO} route={route} onError={jest.fn()} />);
  expect(injectJavaScript.mock.calls.at(-1)?.[0]).toContain(
    '{"type":"showRoute","coordinates":[[11.1214,46.0671],[11.2986,46.0122],[11.1214,46.0671]],"startHere":null}',
  );

  await rerender(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  expect(injectJavaScript.mock.calls.at(-1)?.[0]).toContain('{"type":"clearRoute"}');
  expect(injectJavaScript).toHaveBeenCalledTimes(3);
});

test("marks where a route begins when it is away from the start", async () => {
  const route: LatLon[] = [LEVICO, TRENTO, LEVICO];
  const { rerender } = await render(
    <MapView start={TRENTO} route={null} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={TRENTO} route={route} onError={jest.fn()} />);
  expect(injectJavaScript.mock.calls.at(-1)?.[0]).toContain(
    '"startHere":[11.2986,46.0122]',
  );
});

test("clears nothing that was never drawn", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={null} route={null} onError={jest.fn()} />);
  expect(injectJavaScript).not.toHaveBeenCalled();
});

test("passes on the errors of the page", async () => {
  const onError = jest.fn();
  await render(<MapView start={null} route={null} onError={onError} />);
  await pagePosts('{"type":"error","message":"MapLibre GL JS did not load"}');
  expect(onError).toHaveBeenCalledWith("MapLibre GL JS did not load");
});

test("opens links in the phone's browser, not in the map", async () => {
  const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  await render(<MapView start={null} route={null} onError={jest.fn()} />);
  const shouldLoad = screen.getByTestId("map").props.onShouldStartLoadWithRequest;

  expect(shouldLoad({ url: "about:blank" })).toBe(true);
  expect(openURL).not.toHaveBeenCalled();

  expect(shouldLoad({ url: "https://www.openstreetmap.org/copyright" })).toBe(false);
  expect(openURL).toHaveBeenCalledWith("https://www.openstreetmap.org/copyright");
  openURL.mockRestore();
});

test("shows a bar over the map until the first tiles are drawn", async () => {
  await render(<MapView start={TRENTO} route={null} onError={jest.fn()} />);
  expect(screen.getByTestId("map-loading")).toBeTruthy();
  await pagePosts('{"type":"ready"}');
  expect(screen.getByTestId("map-loading")).toBeTruthy();

  await pagePosts('{"type":"loaded"}');
  expect(screen.queryByTestId("map-loading")).toBeNull();
});

test("a map that cannot load shows no bar, the error instead", async () => {
  const onError = jest.fn();
  await render(<MapView start={TRENTO} route={null} onError={onError} />);
  await pagePosts('{"type":"error","message":"style not found"}');
  expect(onError).toHaveBeenCalledWith("style not found");
  expect(screen.queryByTestId("map-loading")).toBeNull();
});
