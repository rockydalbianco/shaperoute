import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { type MapCover, mapCover, MapCoverContext } from "./mapCover";
import { MapView } from "./MapView";

// What lies over the top of the map (TASK-443): the screen around the map
// says it, and the page is told before its route, so the route is framed
// clear of the status bar and of the buttons at once.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const TRENTO: LatLon = [46.0671, 11.1214];
const LEVICO: LatLon = [46.0122, 11.2986];
const ROUTE: LatLon[] = [TRENTO, LEVICO, TRENTO];

const COVER = mapCover({
  insetTop: 62,
  width: 402,
  bannerHeight: null,
  compass: false,
});
const WITH_ARROW = mapCover({
  insetTop: 62,
  width: 402,
  bannerHeight: null,
  compass: true,
});

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The scripts sent to the page, in order. */
function scripts(): string[] {
  return injectJavaScript.mock.calls.map(([script]) => script as string);
}

/** The messages of one type sent to the page, in order. */
function sent(type: string): string[] {
  return scripts().filter((script) => script.includes(`"type":"${type}"`));
}

function map(cover: MapCover | null, route: LatLon[] | null = ROUTE) {
  return (
    <MapCoverContext.Provider value={cover}>
      <MapView start={TRENTO} route={route} onError={jest.fn()} />
    </MapCoverContext.Provider>
  );
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("a map with nothing over it tells the page nothing", async () => {
  await render(<MapView start={TRENTO} route={ROUTE} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(sent("setCover")).toEqual([]);
  expect(sent("showRoute")).toHaveLength(1);
});

test("the page is told what lies over the map once it is ready", async () => {
  await render(map(COVER));
  expect(injectJavaScript).not.toHaveBeenCalled();
  await pagePosts('{"type":"ready"}');
  expect(sent("setCover")).toHaveLength(1);
  expect(sent("setCover")[0]).toContain(`"cover":${JSON.stringify(COVER)}`);
});

test("it is told before the route, which is framed clear of it at once", async () => {
  await render(map(COVER));
  await pagePosts('{"type":"ready"}');
  const order = scripts();
  const cover = order.findIndex((script) => script.includes('"type":"setCover"'));
  const route = order.findIndex((script) => script.includes('"type":"showRoute"'));
  expect(cover).toBeGreaterThanOrEqual(0);
  expect(cover).toBeLessThan(route);
});

test("a button more over the map is told, the same cover is not told twice", async () => {
  const { rerender } = await render(map(COVER));
  await pagePosts('{"type":"ready"}');
  await rerender(map(COVER));
  expect(sent("setCover")).toHaveLength(1);
  await rerender(map(WITH_ARROW));
  expect(sent("setCover")).toHaveLength(2);
  expect(sent("setCover")[1]).toContain(`"cover":${JSON.stringify(WITH_ARROW)}`);
  // The route is not sent again for it: the page frames it again itself.
  expect(sent("showRoute")).toHaveLength(1);
});

test("with nothing over the map any more the page is told so, once", async () => {
  const { rerender } = await render(map(COVER));
  await pagePosts('{"type":"ready"}');
  await rerender(map(null));
  expect(sent("setCover")).toHaveLength(2);
  expect(sent("setCover")[1]).toContain('"cover":null');
  await rerender(map(null, null));
  expect(sent("setCover")).toHaveLength(2);
});

test("a page loaded again is told again", async () => {
  await render(map(COVER));
  await pagePosts('{"type":"ready"}');
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await pagePosts('{"type":"ready"}');
  expect(sent("setCover")).toHaveLength(2);
});
