/**
 * The «Map» widget (TASK-479 part A1): once the page is ready it is told the
 * view, the take-off, the pilot and the track; then the pilot at most once
 * a second and the track once every 5 s; the two buttons change the view
 * for every map and are kept; a small widget has no buttons.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import type { Track } from "../navigation/trackRecorder";
import { color } from "../theme/tokens";
import { FlightMap, flightMapFps } from "./FlightMap";
import { loadFlightMapPrefs, resetFlightMapPrefs } from "./flightMapPrefs";
import { flightOf, T0 } from "./syntheticFlight";

jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, Paths: { document: { uri: "file:///documents/" } } };
});

jest.mock("react-native-webview");
const { injectJavaScript } =
  jest.requireMock<typeof import("../../__mocks__/react-native-webview")>(
    "react-native-webview",
  );

const FULL = flightOf([
  { kind: "glide", seconds: 60, airspeedMps: 10, headingDeg: 90, varioMps: -1 },
]);
const upTo = (seconds: number): Track => ({
  fixes: FULL.fixes.slice(0, seconds + 1),
  distanceM: 0,
});

function calls(name: string): string[] {
  return injectJavaScript.mock.calls
    .map(([script]: [string]) => script)
    .filter((script: string) => script.includes(`window.flight.${name}(`));
}

function show(track: Track, height = 400) {
  return render(
    <FlightMap
      track={track}
      takeoffMs={T0}
      takeoff={FULL.fixes[0].point}
      headingDeg={90}
      circling={false}
      palette={color}
      height={height}
    />,
  );
}

beforeEach(() => {
  injectJavaScript.mockClear();
  resetFlightMapPrefs();
});

it("tells the page everything once it is ready, then the pilot at most once a second", async () => {
  const view = await show(upTo(20));
  expect(calls("setPilot")).toHaveLength(0);
  await fireEvent(screen.getByTestId("flight-map").children[0] as never, "message", {
    nativeEvent: { data: '{"type":"ready"}' },
  });
  expect(calls("setView")).toEqual([
    "if (window.flight) { window.flight.setView(true, true); } true;",
  ]);
  expect(calls("setTakeoff")).toHaveLength(1);
  expect(calls("setPilot")).toHaveLength(1);
  expect(calls("setTrack")).toHaveLength(1);
  // The airspaces go with the track (part E2): none without a file.
  expect(calls("setAirspace")).toEqual([
    'if (window.flight) { window.flight.setAirspace({"type":"FeatureCollection","features":[]}); } true;',
  ]);
  // The next fix, a second later: the pilot; the track waits 5 s.
  await view.rerender(
    <FlightMap
      track={upTo(21)}
      takeoffMs={T0}
      takeoff={FULL.fixes[0].point}
      headingDeg={90}
      circling={false}
      palette={color}
      height={400}
    />,
  );
  expect(calls("setPilot")).toHaveLength(2);
  expect(calls("setTrack")).toHaveLength(1);
  await view.rerender(
    <FlightMap
      track={upTo(25)}
      takeoffMs={T0}
      takeoff={FULL.fixes[0].point}
      headingDeg={90}
      circling={false}
      palette={color}
      height={400}
    />,
  );
  expect(calls("setTrack")).toHaveLength(2);
});

it("keeps the frames a second the page tells", async () => {
  await show(upTo(5));
  await fireEvent(screen.getByTestId("flight-map").children[0] as never, "message", {
    nativeEvent: { data: '{"type":"fps","fps":38}' },
  });
  expect(flightMapFps()).toBe(38);
});

it("turns 2D and north up with its buttons, and keeps it", async () => {
  await show(upTo(5));
  await fireEvent.press(screen.getByTestId("flight-map-kind"));
  await fireEvent.press(screen.getByTestId("flight-map-turn"));
  expect(loadFlightMapPrefs()).toEqual({ threeD: false, headingUp: false });
  expect(screen.getByText("2D")).toBeTruthy();
  expect(screen.getByText("N")).toBeTruthy();
  await act(async () => {});
});

it("has no buttons when small", async () => {
  await show(upTo(5), 120);
  expect(screen.queryByTestId("flight-map-kind")).toBeNull();
});
