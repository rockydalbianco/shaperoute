import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const ROUTE: LatLon[] = [
  [46.0, 11.0],
  [46.004, 11.005],
  [46.0, 11.0],
];
const HERE: LatLon = [46.001, 11.001];

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

function sent(): string[] {
  return injectJavaScript.mock.calls.map(([script]: [string]) => script);
}

/** The messages of a type handed to the page, in order. */
function messages(type: string): Record<string, unknown>[] {
  return sent()
    .map((script) => /receive\((.*)\); true;$/.exec(script)?.[1])
    .filter((json): json is string => json !== undefined)
    .map((json) => JSON.parse(json) as Record<string, unknown>)
    .filter((message) => message.type === type);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

test("a turned route is shown with the bearing that makes it upright", async () => {
  await render(
    <MapView start={null} route={ROUTE} bearing={-30} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  expect(messages("showRoute")).toHaveLength(1);
  expect(messages("showRoute")[0].bearing).toBe(-30);
  expect(messages("turn")).toEqual([]);
});

test("a route that is not turned is shown as before: no bearing", async () => {
  await render(<MapView start={null} route={ROUTE} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(messages("showRoute")).toHaveLength(1);
  expect("bearing" in messages("showRoute")[0]).toBe(false);
});

test("another route of the choice turns the map as its own drawing", async () => {
  const onError = jest.fn();
  const other: LatLon[] = ROUTE.map(([lat, lon]) => [lat, lon + 0.001]);
  const { rerender } = await render(
    <MapView start={null} route={ROUTE} bearing={-30} onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(<MapView start={null} route={other} bearing={20} onError={onError} />);
  await rerender(<MapView start={null} route={ROUTE} onError={onError} />);
  expect(messages("showRoute").map((message) => message.bearing)).toEqual([
    -30,
    20,
    undefined,
  ]);
});

test("a tap on the north arrow is asked of the map once", async () => {
  const onError = jest.fn();
  const north = { bearing: 0 };
  const { rerender } = await render(
    <MapView start={null} route={ROUTE} bearing={-30} onError={onError} />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(
    <MapView start={null} route={ROUTE} bearing={-30} turn={north} onError={onError} />,
  );
  await rerender(
    <MapView start={null} route={ROUTE} bearing={-30} turn={north} onError={onError} />,
  );
  expect(messages("turn")).toEqual([{ type: "turn", bearing: 0 }]);
  // The route is not framed again: the page turns the map.
  expect(messages("showRoute")).toHaveLength(1);

  // A second tap, back as the drawing: a new turn.
  await rerender(
    <MapView
      start={null}
      route={ROUTE}
      bearing={-30}
      turn={{ bearing: -30 }}
      onError={onError}
    />,
  );
  expect(messages("turn").map((message) => message.bearing)).toEqual([0, -30]);
});

test("a page loaded again shows the route as its drawing, not an old tap", async () => {
  const onTurned = jest.fn();
  const north = { bearing: 0 };
  await render(
    <MapView
      start={null}
      route={ROUTE}
      bearing={-30}
      turn={north}
      onTurned={onTurned}
      onError={jest.fn()}
    />,
  );
  await pagePosts('{"type":"ready"}');
  // Asked before the page was ready: nobody waits for it.
  expect(messages("turn")).toEqual([]);
  await fireEvent(screen.getByTestId("map"), "loadStart");
  // A page that loads is north-up: the arrow is told.
  expect(onTurned).toHaveBeenLastCalledWith(0);
  await pagePosts('{"type":"ready"}');
  expect(messages("turn")).toEqual([]);
  expect(messages("showRoute").map((message) => message.bearing)).toEqual([-30, -30]);
});

test("the map says how it is turned, by the app or by two fingers", async () => {
  const onTurned = jest.fn();
  await render(
    <MapView start={null} route={ROUTE} onTurned={onTurned} onError={jest.fn()} />,
  );
  await pagePosts('{"type":"ready"}');
  await pagePosts('{"type":"turned","bearing":-30}');
  expect(onTurned).toHaveBeenLastCalledWith(-30);
  // What is not a bearing is nobody's.
  await pagePosts('{"type":"turned","bearing":"north"}');
  await pagePosts('{"type":"turned"}');
  expect(onTurned).toHaveBeenCalledTimes(1);
});

test("after the run the route is framed again, turned as its drawing", async () => {
  const onError = jest.fn();
  const { rerender } = await render(
    <MapView
      start={null}
      route={ROUTE}
      bearing={-30}
      following={HERE}
      heading={90}
      onError={onError}
    />,
  );
  await pagePosts('{"type":"ready"}');
  // The page keeps the map turned while it follows: nothing more to say.
  expect(messages("follow")).toEqual([
    { type: "follow", lngLat: [HERE[1], HERE[0]], heading: 90 },
  ]);
  await rerender(
    <MapView start={null} route={ROUTE} bearing={-30} onError={onError} />,
  );
  expect(messages("showRoute").map((message) => message.bearing)).toEqual([-30, -30]);
});
