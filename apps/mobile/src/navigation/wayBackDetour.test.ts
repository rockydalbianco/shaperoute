/**
 * A run round a closed street with the way back on the streets (TASK-314
 * part B, ADR-0274), through useNavigation as the app runs it: the voice
 * says the way's turns after «off the route», the banner shows the next
 * one, the locked phone writes them, and back on the route all of it goes.
 * With an old server, no way: the dots and the words of TASK-303 only.
 */
import type {
  Direction,
  LatLon,
  WayBack,
  WayBackRequest,
} from "@shaperoute/shared-types";
import { act, render, renderHook, screen } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { createElement } from "react";

import { wayBackOnPhoneFirst } from "../engine/wayBackOnPhone";
import { NavigationBanner } from "../screens/NavigateScreen";
import { type LockNoticeRun, startLockNotice } from "./lockNotice";
import { cumulative } from "./progress";
import { skipCountdown } from "./runControl";
import { clearRun } from "./trackStore";
import { type NavigationState, useNavigation } from "./useNavigation";

jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock("expo-location", () => ({
  Accuracy: { BestForNavigation: 6 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));
// The phone's documents folder, in memory.
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
jest.mock("../engine/wayBackOnPhone", () => ({ wayBackOnPhoneFirst: jest.fn() }));
jest.mock("./lockNotice", () => ({ startLockNotice: jest.fn() }));

// Metres east (x) and north (y) of a corner of Trento, on a plane.
const LAT = 46.0;
const LON = 11.0;
const M_PER_DEG_LAT = 111_195;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos((LAT * Math.PI) / 180);
function at(x: number, y: number): LatLon {
  return [LAT + y / M_PER_DEG_LAT, LON + x / M_PER_DEG_LON];
}
function xy([lat, lon]: LatLon): [number, number] {
  return [(lon - LON) * M_PER_DEG_LON, (lat - LAT) * M_PER_DEG_LAT];
}

function direction(
  turn: Direction["turn"],
  distanceM: number,
  street: string,
  point: LatLon,
): Direction {
  return {
    node: 0,
    point,
    distance_m: distanceM,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
    along: null,
  };
}

/** Via Roma, due east for 1.2 km. The same arrays at every render. */
const STREET: LatLon[] = [0, 300, 600, 900, 1200].map((x) => at(x, 0));
const DIRECTIONS = [direction("depart", 0, "Via Roma", STREET[0])];

/** The engine's way: up to Via Nord, east to Via Sud, down to the route. */
function wayFrom(request: WayBackRequest): WayBack {
  const points: LatLon[] = [request.here, at(300, 100), at(400, 100), at(400, 0)];
  const along = cumulative(points);
  return {
    points,
    distance_m: along[3],
    rejoin: points[3],
    rejoin_m: 400 - xy(request.ahead[0])[0],
    directions: [
      direction("depart", 0, "Via Nord", points[0]),
      direction("right", along[1], "Via Est", points[1]),
      direction("right", along[2], "Via Sud", points[2]),
      direction("left", along[3], "Via Roma", points[3]),
    ],
  };
}

/** Out to 300 m, round the block, on to 600 m: a fix 6 m on every 2 s. */
function roundTheBlock(): [number, number][] {
  const corners: [number, number][] = [
    [0, 0],
    [300, 0],
    [300, 100],
    [400, 100],
    [400, 0],
    [600, 0],
  ];
  const points: [number, number][] = [corners[0]];
  for (let i = 1; i < corners.length; i += 1) {
    const [x0, y0] = corners[i - 1];
    const [x1, y1] = corners[i];
    const steps = Math.round(Math.hypot(x1 - x0, y1 - y0) / 6);
    for (let s = 1; s <= steps; s += 1) {
      points.push([x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps]);
    }
  }
  return points;
}

const notice: jest.Mocked<LockNoticeRun> = { said: jest.fn(), end: jest.fn() };

beforeEach(() => {
  clearRun();
  jest.mocked(Speech.speak).mockClear();
  jest.mocked(wayBackOnPhoneFirst).mockReset();
  jest.mocked(startLockNotice).mockReturnValue(notice);
  notice.said.mockClear();
});

/**
 * The run, fix by fix, with the answers between two fixes; `seen` gets the
 * state after each fix, for the banner.
 */
async function runRoundTheBlock(
  seen: (state: NavigationState, x: number, y: number) => void,
) {
  let onPosition: (position: Location.LocationObject) => void = () => {};
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
  const { result, unmount } = await renderHook(() =>
    useNavigation(STREET, DIRECTIONS, true),
  );
  await act(async () => {
    skipCountdown();
  });
  for (const [i, [x, y]] of roundTheBlock().entries()) {
    const [latitude, longitude] = at(x, y);
    await act(async () => {
      onPosition({
        coords: { latitude, longitude, accuracy: 8 },
        timestamp: 1_000_000 + i * 2000,
      } as Location.LocationObject);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    seen(result.current, x, y);
  }
  await unmount();
}

const said = () => jest.mocked(Speech.speak).mock.calls.map(([words]) => words);

test("round the block, the way back's turns are said, shown and written", async () => {
  jest.mocked(wayBackOnPhoneFirst).mockImplementation(async (_url, request) => ({
    kind: "way",
    way: wayFrom(request),
    by: "phone",
  }));
  let banner: NavigationState | null = null;
  await runRoundTheBlock((state, x, y) => {
    // On Via Nord, 30 m before Via Sud.
    if (banner === null && x >= 370 && y === 100) {
      banner = state;
    }
  });

  const fromOff = said().slice(
    said().indexOf("You are off the route. Head back to it."),
  );
  expect(fromOff).toEqual([
    "You are off the route. Head back to it.",
    expect.stringMatching(/^The route is \d+ metres away, to the south\.$/),
    expect.stringMatching(/^In \d+ metres, turn right onto Via Est$/),
    "In 50 metres, turn right onto Via Sud",
    "In 50 metres, turn left onto Via Roma",
    "Back on the route.",
  ]);
  // Asked once, from where the runner was told they are off the route.
  expect(wayBackOnPhoneFirst).toHaveBeenCalledTimes(1);

  // The banner: still «Off the route», with the way's next turn.
  expect(banner).not.toBeNull();
  await render(createElement(NavigationBanner, { state: banner! }));
  expect(screen.getByText("Off the route")).toBeOnTheScreen();
  expect(screen.getByText("Turn right onto Via Sud")).toBeOnTheScreen();
  expect(screen.getByText("30 m")).toBeOnTheScreen();
  expect(screen.queryByText("Follow the dotted line back to the route.")).toBeNull();

  // With the phone locked, the notice writes what the voice says.
  const written = notice.said.mock.calls.flatMap(([cues]) =>
    cues.map((cue) => cue.say),
  );
  expect(written).toContain("In 50 metres, turn right onto Via Sud");
  expect(written).toEqual(expect.arrayContaining([expect.stringMatching(/Via Est$/)]));
});

test("with an old server (404) the dots and the words of before, and no error", async () => {
  jest
    .mocked(wayBackOnPhoneFirst)
    .mockResolvedValue({ kind: "none", why: "the server answered 404" });
  let banner: NavigationState | null = null;
  await runRoundTheBlock((state, x, y) => {
    if (banner === null && x >= 370 && y === 100) {
      banner = state;
    }
  });
  const fromOff = said().slice(
    said().indexOf("You are off the route. Head back to it."),
  );
  expect(fromOff).toEqual([
    "You are off the route. Head back to it.",
    expect.stringMatching(/^The route is/),
    "Back on the route.",
  ]);
  expect(wayBackOnPhoneFirst).toHaveBeenCalled();
  await render(createElement(NavigationBanner, { state: banner! }));
  expect(screen.getByText("Off the route")).toBeOnTheScreen();
  expect(
    screen.getByText("Follow the dotted line back to the route."),
  ).toBeOnTheScreen();
});
