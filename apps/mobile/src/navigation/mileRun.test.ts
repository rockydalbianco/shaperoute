/**
 * A run and a ride with «Miles» chosen in «Settings» (TASK-182, part C):
 * positions simulated through the hooks the run's screens use. The voice
 * says each mile and, on a bike, every 5; the turns in feet, said at the
 * same metres as before; a change of units during the run is heard from
 * the next mile on, with nothing said twice.
 */
import type { Activity, Direction, LatLon, Stretch } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Vibration } from "react-native";

import { appUnits, saveUnitsChoice } from "../units/units";
import { runControl, skipCountdown } from "./runControl";
import { clearRun } from "./trackStore";
import { useFreeRun } from "./useFreeRun";
import { useNavigation } from "./useNavigation";

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

const START: LatLon = [46.0122, 11.2986];
/** A metre north in degrees, a little over (the app's Earth is 6,371 km):
 * a fix at 1,610 m has run a mile. */
const METRE = 1 / 111_194;
/** When each test begins, on the clock the tests move by hand. */
const BEGAN = Date.UTC(2026, 9, 5, 7, 0, 0);

/** North in a line, a point every 100 m to `metres`. */
function line(metres: number): LatLon[] {
  return Array.from({ length: metres / 100 + 1 }, (_, i) => [
    START[0] + i * 100 * METRE,
    START[1],
  ]);
}

function direction(turn: Direction["turn"], distance_m: number, street: string) {
  return {
    node: distance_m,
    point: [START[0] + distance_m * METRE, START[1]] as LatLon,
    distance_m,
    turn,
    angle_deg: 0,
    street,
    road_type: "residential",
    branches: 3,
    joined: false,
  };
}

const DIRECTIONS: Direction[] = [
  direction("depart", 0, "Via Roma"),
  direction("left", 400, "Via Verdi"),
];

let onPosition: (position: Location.LocationObject) => void = () => {};

/** Moves along at `metresPerSecond`, a fix every `everyM`, from `fromM` to
 * `toM`. */
function go(fromM: number, toM: number, metresPerSecond: number, everyM = 10) {
  for (let m = fromM; m <= toM; m += everyM) {
    onPosition({
      coords: {
        latitude: START[0] + m * METRE,
        longitude: START[1],
        accuracy: 5,
        altitude: null,
      },
      timestamp: BEGAN + Math.round((m / metresPerSecond) * 1000),
    } as Location.LocationObject);
  }
}

function said(): string[] {
  return jest.mocked(Speech.speak).mock.calls.map(([text]) => text);
}

// The cues vibrate (useNavigation.play): not in a test.
jest.spyOn(Vibration, "vibrate").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers({ now: BEGAN });
  clearRun();
  saveUnitsChoice("mi");
  jest.mocked(Speech.speak).mockClear();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest
    .mocked(Location.watchPositionAsync)
    .mockImplementation(async (_options, callback) => {
      onPosition = callback;
      return { remove: jest.fn() };
    });
});

afterEach(() => {
  saveUnitsChoice("phone");
  jest.useRealTimers();
});

/** Navigation along `route`, past its countdown. */
async function follow(
  route: LatLon[],
  options: { activity?: Activity; onFoot?: Stretch[] },
) {
  const hook = await renderHook(() =>
    useNavigation(route, DIRECTIONS, true, 0.9, options),
  );
  // The permission and the GPS are asked for first.
  await act(async () => {});
  expect(runControl().phase).toBe("countdown");
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

/** A run without a route, past its countdown. */
async function free() {
  const hook = await renderHook(() => useFreeRun(true));
  await act(async () => {});
  await act(async () => {
    skipCountdown();
  });
  return hook;
}

/** 25 km/h, in metres a second: 15.5 mph. */
const RIDING = 25 / 3.6;
/** 6:00 a km: 9:39 a mile. */
const RUNNING = 1000 / 360;

test("with miles a run without a route says each mile, and no kilometre", async () => {
  expect(appUnits()).toBe("mi");
  const { unmount } = await free();
  await act(async () => {
    go(0, 1600, RUNNING);
  });
  // A kilometre has gone by: nothing.
  expect(said()).toEqual([]);
  await act(async () => {
    go(1610, 3300, RUNNING);
  });
  expect(said()).toEqual([
    "1 mile. Time: 9 minutes 40 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "2 miles. Time: 19 minutes 19 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "Same pace as the last mile.",
  ]);
  await unmount();
});

test("with miles a turn along a route is said in feet, where it was said in metres", async () => {
  const { unmount } = await follow(line(3400), {});
  await act(async () => {
    go(0, 340, RUNNING);
  });
  // 60 m before the turn: not yet, as in kilometres.
  expect(said()).toEqual(["Head out on Via Roma"]);
  await act(async () => {
    go(350, 3400, RUNNING);
  });
  expect(said()).toEqual([
    "Head out on Via Roma",
    "In 150 feet, turn left onto Via Verdi",
    "1 mile. Time: 9 minutes 40 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "2 miles. Time: 19 minutes 19 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "Same pace as the last mile.",
    "You have arrived.",
  ]);
  await unmount();
});

test("with miles a ride says its turn in feet and the miles every 5, in miles per hour", async () => {
  const { unmount } = await follow(line(25_000), { activity: "cycling" });
  await act(async () => {
    go(0, 290, RIDING);
  });
  expect(said()).toEqual(["Head out on Via Roma"]);
  await act(async () => {
    go(300, 500, RIDING);
  });
  // 100 m ahead, as in kilometres (TASK-216): 328 feet.
  expect(said()).toEqual([
    "Head out on Via Roma",
    "In 350 feet, turn left onto Via Verdi",
  ]);
  await act(async () => {
    go(550, 25_000, RIDING, 50);
  });
  expect(said().slice(2)).toEqual([
    "5 miles. Time: 19 minutes 19 seconds. Average speed: 16 miles per hour.",
    "10 miles. Time: 38 minutes 38 seconds. Average speed: 16 miles per hour.",
    // The last 5 against the first 5: nothing at 5 miles.
    "The last 5 miles were at the same speed as the 5 before.",
    "15 miles. Time: 57 minutes 58 seconds. Average speed: 16 miles per hour.",
    "The last 5 miles were at the same speed as the 5 before.",
    "You have arrived.",
  ]);
  expect(said().join(" ")).not.toMatch(/kilometre|metres/);
  await unmount();
});

test("with miles a ride's faster and slower 5 miles are said from the 10th", async () => {
  const { unmount } = await follow(line(25_000), { activity: "cycling" });
  // 5 miles at 20 km/h, 5 at 26, the rest at 23: a fix every 50 m.
  const mile = 1609.344;
  let seconds = 0;
  await act(async () => {
    for (let m = 0; m <= 24_500; m += 50) {
      onPosition({
        coords: {
          latitude: START[0] + m * METRE,
          longitude: START[1],
          accuracy: 5,
          altitude: null,
        },
        timestamp: BEGAN + Math.round(seconds * 1000),
      } as Location.LocationObject);
      seconds += 50 / ((m < 5 * mile ? 20 : m < 10 * mile ? 26 : 23) / 3.6);
    }
  });
  expect(said().filter((words) => /mile/.test(words))).toEqual([
    expect.stringMatching(/^5 miles\. Time: .* Average speed: 12 miles per hour\.$/),
    expect.stringMatching(/^10 miles\. Time: /),
    "The last 5 miles were faster than the 5 before.",
    expect.stringMatching(/^15 miles\. Time: /),
    "The last 5 miles were slower than the 5 before.",
  ]);
  await unmount();
});

test("with miles the bike on foot is said in feet", async () => {
  // The bike on foot from 600 m to 800 m.
  const { unmount } = await follow(line(1000), {
    activity: "cycling",
    onFoot: [[6, 8]],
  });
  await act(async () => {
    go(0, 1000, RIDING);
  });
  // Said at the fix 90 m before it: 295 feet, to the nearest fifty.
  expect(said()).toContain("In 300 feet, get off and walk the bike for 650 feet.");
  expect(said()).toContain("Back on the bike.");
  expect(said().join(" ")).not.toContain("metres");
  await unmount();
});

test("in Italian, the mile and the feet", async () => {
  const { saveVoiceChoice, DEFAULT_VOICE_CHOICE } =
    jest.requireActual<typeof import("../voice/voiceChoice")>("../voice/voiceChoice");
  saveVoiceChoice({ ...DEFAULT_VOICE_CHOICE, language: "it" });
  try {
    const { unmount } = await follow(line(1700), {});
    await act(async () => {
      go(0, 1700, RUNNING);
    });
    expect(said()).toEqual([
      "Parti lungo Via Roma",
      "Tra 150 piedi, svolta a sinistra su Via Verdi",
      "Un miglio. Tempo: 9 minuti e 40 secondi. Passo medio: 9 minuti e 39 secondi al miglio.",
      "Hai raggiunto l'arrivo.",
    ]);
    await unmount();
  } finally {
    saveVoiceChoice(DEFAULT_VOICE_CHOICE);
  }
});

test("«Miles» chosen during a run: the next mile is said, and nothing twice", async () => {
  saveUnitsChoice("km");
  const { unmount } = await free();
  await act(async () => {
    go(0, 1300, RUNNING);
  });
  expect(said()).toEqual([
    "1 kilometre. Time: 6 minutes. Average pace: 6 minutes per kilometre.",
  ]);
  // «Settings», «Units», «Miles», 1.3 km into the run.
  saveUnitsChoice("mi");
  await act(async () => {
    go(1310, 3300, RUNNING);
  });
  expect(said().slice(1)).toEqual([
    "1 mile. Time: 9 minutes 40 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "2 miles. Time: 19 minutes 19 seconds. Average pace: 9 minutes 39 seconds per mile.",
    "Same pace as the last mile.",
  ]);
  // And back, 3.3 km in: the kilometres behind are not said again.
  saveUnitsChoice("km");
  await act(async () => {
    go(3310, 4100, RUNNING);
  });
  expect(said().slice(4)).toEqual([
    "4 kilometres. Time: 24 minutes. Average pace: 6 minutes per kilometre.",
    "Same pace as the last kilometre.",
  ]);
  await unmount();
});

test("with «Kilometres» chosen, the run and the ride say what they said before", async () => {
  saveUnitsChoice("km");
  const run = await follow(line(2100), {});
  await act(async () => {
    go(0, 2100, RUNNING);
  });
  expect(said()).toEqual([
    "Head out on Via Roma",
    "In 50 metres, turn left onto Via Verdi",
    "1 kilometre. Time: 6 minutes. Average pace: 6 minutes per kilometre.",
    "2 kilometres. Time: 12 minutes. Average pace: 6 minutes per kilometre.",
    "Same pace as the last kilometre.",
    "You have arrived.",
  ]);
  await run.unmount();
  clearRun();
  jest.mocked(Speech.speak).mockClear();
  const ride = await follow(line(10_500), { activity: "cycling", onFoot: [[6, 8]] });
  await act(async () => {
    go(0, 10_500, RIDING, 50);
  });
  expect(said()).toEqual([
    "Head out on Via Roma",
    "In 100 metres, turn left onto Via Verdi",
    // A fix every 50 m: the first within 100 m of the stretch is 50 m away.
    "In 50 metres, get off and walk the bike for 200 metres.",
    "Back on the bike.",
    "10 kilometres. Time: 24 minutes. Average speed: 25 kilometres per hour.",
    "You have arrived.",
  ]);
  await ride.unmount();
});
