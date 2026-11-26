import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

// A day of skiing or a race as it is recorded (TASK-496 part D): while the
// cut into pieces stays the same, a new point sends only itself, at the end
// of the last piece; a lift or a flight found, new numbers, or a page loaded
// again, and the day is told whole, as before.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const LINE: LatLon[] = Array.from({ length: 12 }, (_, i) => [46.4 + i / 1000, 11.8]);
const lngLat = (line: LatLon[]) => line.map(([lat, lon]) => [lon, lat]);

function pagePosts(data: string) {
  return fireEvent(screen.getByTestId("map"), "message", { nativeEvent: { data } });
}

/** The messages of a type handed to the page, in order. */
function messages(type: string): Record<string, unknown>[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => /receive\((.*)\); true;$/.exec(script)?.[1])
    .filter((json: string | undefined): json is string => json !== undefined)
    .map((json: string) => JSON.parse(json) as Record<string, unknown>)
    .filter((message: Record<string, unknown>) => message.type === type);
}

beforeEach(() => {
  injectJavaScript.mockClear();
});

/** A day of skiing being recorded: the runner followed, so never framed. */
function ski(points: number, lifts: { from: number; to: number }[]) {
  const track = LINE.slice(0, points);
  return (
    <MapView
      start={null}
      route={null}
      track={track}
      lifts={lifts}
      following={track[track.length - 1]}
      onError={jest.fn()}
    />
  );
}

test("a descent going on sends only its new points", async () => {
  const lift = [{ from: 2, to: 4 }];
  const { rerender } = await render(ski(7, lift));
  await pagePosts('{"type":"ready"}');
  expect(messages("showLifts")).toHaveLength(1);
  await rerender(ski(8, lift));
  await rerender(ski(10, lift));
  expect(messages("showLifts")).toHaveLength(1);
  expect(messages("extendPiece")).toEqual([
    { type: "extendPiece", layer: "track", coordinates: lngLat(LINE.slice(7, 8)) },
    { type: "extendPiece", layer: "track", coordinates: lngLat(LINE.slice(8, 10)) },
  ]);
});

test("a lift being ridden grows the lifts", async () => {
  const { rerender } = await render(ski(5, [{ from: 2, to: 4 }]));
  await pagePosts('{"type":"ready"}');
  await rerender(ski(7, [{ from: 2, to: 6 }]));
  expect(messages("showLifts")).toHaveLength(1);
  expect(messages("extendPiece")).toEqual([
    { type: "extendPiece", layer: "lifts", coordinates: lngLat(LINE.slice(5, 7)) },
  ]);
});

test("a lift found, and the day is told whole", async () => {
  const { rerender } = await render(ski(7, [{ from: 2, to: 4 }]));
  await pagePosts('{"type":"ready"}');
  await rerender(
    ski(10, [
      { from: 2, to: 4 },
      { from: 7, to: 9 },
    ]),
  );
  expect(messages("showLifts")).toHaveLength(2);
  expect(messages("extendPiece")).toEqual([]);
});

test("a page that loads again is told the whole day, then its new points", async () => {
  const lift = [{ from: 2, to: 4 }];
  const { rerender } = await render(ski(7, lift));
  await pagePosts('{"type":"ready"}');
  await rerender(ski(8, lift));
  injectJavaScript.mockClear();
  await fireEvent(screen.getByTestId("map"), "loadStart");
  await pagePosts('{"type":"ready"}');
  expect(messages("extendPiece")).toEqual([]);
  expect(messages("showLifts")).toHaveLength(1);
  await rerender(ski(9, lift));
  expect(messages("extendPiece")).toEqual([
    { type: "extendPiece", layer: "track", coordinates: lngLat(LINE.slice(8, 9)) },
  ]);
});

test("a flight going on grows the yellow, then the walk after it the white", async () => {
  const race = (points: number, air: { from: number; to: number }[]) => {
    const track = LINE.slice(0, points);
    return (
      <MapView
        start={null}
        route={null}
        track={track}
        flightAir={air}
        following={track[track.length - 1]}
        onError={jest.fn()}
      />
    );
  };
  const { rerender } = await render(race(5, [{ from: 2, to: 4 }]));
  await pagePosts('{"type":"ready"}');
  await rerender(race(6, [{ from: 2, to: 5 }]));
  // Landed at 5: a new piece on foot is told whole, then it grows.
  await rerender(race(8, [{ from: 2, to: 5 }]));
  await rerender(race(9, [{ from: 2, to: 5 }]));
  expect(messages("showFlight")).toHaveLength(2);
  expect(messages("extendPiece")).toEqual([
    { type: "extendPiece", layer: "air", coordinates: lngLat(LINE.slice(5, 6)) },
    { type: "extendPiece", layer: "track", coordinates: lngLat(LINE.slice(8, 9)) },
  ]);
});

test("a day framed at its end is told whole each time", async () => {
  const framed = (points: number) => (
    <MapView
      start={null}
      route={null}
      track={LINE.slice(0, points)}
      lifts={[{ from: 2, to: 4 }]}
      onError={jest.fn()}
    />
  );
  const { rerender } = await render(framed(7));
  await pagePosts('{"type":"ready"}');
  await rerender(framed(8));
  expect(messages("extendPiece")).toEqual([]);
  expect(messages("showLifts")).toHaveLength(2);
});
