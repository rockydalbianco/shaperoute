import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

// The shape asked for, under the route (TASK-442): the page is told of a
// result's `placed_outline`, of another's when the choice changes, and of
// none when the result is left.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const TRENTO: LatLon = [46.0671, 11.1214];
const LEVICO: LatLon = [46.0122, 11.2986];
const PERGINE: LatLon = [46.0636, 11.2379];

const A: LatLon[][] = [[TRENTO, LEVICO, TRENTO]];
const B: LatLon[][] = [[TRENTO, PERGINE, TRENTO]];

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The messages of one type sent to the page, in order. */
function sent(type: string): string[] {
  return injectJavaScript.mock.calls
    .map(([script]) => script as string)
    .filter((script) => script.includes(`"type":"${type}"`));
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("without a shape the page is told nothing", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(
    <MapView start={null} route={null} ghost={null} onError={jest.fn()} />,
  );
  await rerender(<MapView start={null} route={null} ghost={[]} onError={jest.fn()} />);
  expect(sent("showGhost")).toEqual([]);
});

test("a shape waits for the page to be ready", async () => {
  await render(<MapView start={null} route={null} ghost={A} onError={jest.fn()} />);
  expect(injectJavaScript).not.toHaveBeenCalled();
  await pagePosts('{"type":"ready"}');
  expect(sent("showGhost")).toHaveLength(1);
});

test("the placed outline is sent in MapLibre order, line by line", async () => {
  await render(<MapView start={null} route={null} ghost={A} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(sent("showGhost")[0]).toContain(
    '{"type":"showGhost","lines":[[[11.1214,46.0671],[11.2986,46.0122],[11.1214,46.0671]]]}',
  );
});

test("another route chosen sends its own shape", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} ghost={A} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={null} route={null} ghost={B} onError={jest.fn()} />);
  expect(sent("showGhost")).toHaveLength(2);
  expect(sent("showGhost")[1]).toContain("[11.2379,46.0636]");
});

test("the same shape is not sent again", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} ghost={A} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={TRENTO} route={null} ghost={A} onError={jest.fn()} />);
  expect(sent("showGhost")).toHaveLength(1);
});

test("the result left, the shape goes away, once", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} ghost={A} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(
    <MapView start={null} route={null} ghost={null} onError={jest.fn()} />,
  );
  expect(sent("showGhost").at(-1)).toContain('{"type":"showGhost","lines":[]}');
  await rerender(<MapView start={null} route={null} onError={jest.fn()} />);
  expect(sent("showGhost")).toHaveLength(2);
});

test("a result from an API without the shape leaves the last one cleared", async () => {
  const { rerender } = await render(
    <MapView start={null} route={null} ghost={A} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  // On the water the API sends an empty list.
  await rerender(<MapView start={null} route={null} ghost={[]} onError={jest.fn()} />);
  expect(sent("showGhost").at(-1)).toContain('"lines":[]');
});

test("the shape is sent before the route, which frames the map last", async () => {
  const route: LatLon[] = [TRENTO, LEVICO, TRENTO];
  await render(<MapView start={TRENTO} route={route} ghost={A} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  const scripts = injectJavaScript.mock.calls.map(([script]) => script as string);
  const ghostAt = scripts.findIndex((script) => script.includes('"type":"showGhost"'));
  const routeAt = scripts.findIndex((script) => script.includes('"type":"showRoute"'));
  expect(ghostAt).toBeGreaterThanOrEqual(0);
  expect(ghostAt).toBeLessThan(routeAt);
});
