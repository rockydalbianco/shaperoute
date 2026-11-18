import type { LatLon } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MapView } from "./MapView";

// A race on foot and in the air (TASK-305 part R6c): the map is told the
// parts on foot and the flights in place of the run's track; without
// flights the track as a run's, and the yellow goes with the race.

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const LINE: LatLon[] = Array.from({ length: 7 }, (_, i) => [46.4 + i / 1000, 11.8]);
const AIR = [{ from: 2, to: 4 }];
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

test("a race with flights is drawn cut at them, not as one line", async () => {
  await render(
    <MapView
      start={null}
      route={null}
      track={LINE}
      flightAir={AIR}
      onError={jest.fn()}
    />,
  );
  await pagePosts('{"type":"ready"}');
  expect(messages("showFlight")).toEqual([
    {
      type: "showFlight",
      // Nothing followed, no route: framed on the race (TASK-478).
      frame: true,
      foot: [lngLat(LINE.slice(0, 3)), lngLat(LINE.slice(4))],
      air: [lngLat(LINE.slice(2, 5))],
    },
  ]);
  expect(messages("showTrack")).toEqual([]);
});

test("without flights the track is a run's, and the yellow goes with the race", async () => {
  const { rerender } = await render(
    <MapView
      start={null}
      route={null}
      track={LINE}
      flightAir={AIR}
      onError={jest.fn()}
    />,
  );
  await pagePosts('{"type":"ready"}');
  injectJavaScript.mockClear();
  await rerender(
    <MapView
      start={null}
      route={null}
      track={LINE}
      flightAir={null}
      onError={jest.fn()}
    />,
  );
  expect(messages("showTrack")).toHaveLength(1);
  expect(messages("clearFlight")).toHaveLength(1);
  expect(messages("showFlight")).toEqual([]);
});
