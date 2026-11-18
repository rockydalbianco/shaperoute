import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

// A track without a route (TASK-478): at the end of a run the map is told
// to frame on it; while the runner is followed, or a route is drawn, never.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const LINE: LatLon[] = Array.from({ length: 7 }, (_, i) => [46.4 + i / 1000, 11.8]);
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

test("a run without a route that ended: its track is shown framed", async () => {
  await render(<MapView start={null} route={null} track={LINE} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(messages("showTrack")).toEqual([
    { type: "showTrack", coordinates: lngLat(LINE), frame: true },
  ]);
});

test("while recording, following the runner: never framed, as before", async () => {
  const { rerender } = await render(
    <MapView
      start={null}
      route={null}
      track={LINE.slice(0, 3)}
      following={LINE[2]}
      onError={jest.fn()}
    />,
  );
  await pagePosts('{"type":"ready"}');
  await rerender(
    <MapView
      start={null}
      route={null}
      track={LINE.slice(0, 5)}
      following={LINE[4]}
      onError={jest.fn()}
    />,
  );
  const shown = messages("showTrack");
  expect(shown.length).toBeGreaterThan(0);
  expect(shown.every((message) => message.frame === undefined)).toBe(true);
  expect(messages("follow").length).toBeGreaterThan(0);
});

test("over a route, the route frames the map, not the track", async () => {
  await render(<MapView start={null} route={LINE} track={LINE} onError={jest.fn()} />);
  await pagePosts('{"type":"ready"}');
  expect(messages("showTrack").every((message) => message.frame === undefined)).toBe(
    true,
  );
});
