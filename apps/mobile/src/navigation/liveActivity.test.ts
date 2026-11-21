import type { Direction, LatLon } from "@shaperoute/shared-types";

import type { NativeLiveActivity } from "../../modules/live-activity";
import { paletteOf } from "../theme/tokens";
import {
  ARRIVED_STAYS_S,
  liveColorsOf,
  type LiveState,
  liveStateOf,
  startLiveActivity,
  UPDATE_EVERY_MS,
} from "./liveActivity";
import { type Navigation, startNavigation } from "./navigator";
import { wayShownOf } from "./wayBackShown";

// A street due east, 1 km long: 0.001° of longitude here is about 77 m.
const LAT = 46.0;
const M_PER_DEG_LON = 77_214;
function east(m: number): LatLon {
  return [LAT, 11.0 + m / M_PER_DEG_LON];
}
const POINTS: LatLon[] = [0, 250, 500, 750, 1000].map(east);

function direction(
  turn: Direction["turn"],
  distance_m: number,
  street: string,
): Direction {
  return {
    node: distance_m,
    point: east(distance_m),
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
  direction("right", 420, "Via Verdi"),
];

/** The route, run as far as `alongM`. */
function at(alongM: number, more: Partial<Navigation> = {}): Navigation {
  const { navigation } = startNavigation(POINTS, DIRECTIONS);
  return { ...navigation, alongM, ...more };
}

test("on the route: the arrow, the way to the turn, the banner's words, the bar", () => {
  expect(liveStateOf(at(370), "en", "km")).toEqual({
    sign: "→",
    distance: "50 m",
    instruction: "Turn right onto Via Verdi",
    done: 0.37,
    drawn: "37% drawn",
    left: "630 m left",
    arrived: false,
    off: false,
  });
});

test("in the language and the units chosen", () => {
  const state = liveStateOf(at(0), "it", "mi");
  expect(state.distance).toBe("0.3 mi");
  expect(state.left).toBe("0.6 mi left");
  expect(state.instruction).toMatch(/Via Verdi/);
});

test("off the route: the warning, and the way back when it is known", () => {
  const off = liveStateOf(at(500, { offRoute: true }), "en", "km");
  expect(off).toMatchObject({
    sign: "⚠",
    off: true,
    instruction: "Off the route",
    distance: "",
  });
  const back = liveStateOf(
    at(500, {
      offRoute: true,
      rejoin: {
        from: east(500),
        to: east(520),
        alongM: 520,
        distanceM: 120,
        bearingDeg: 180,
      },
    }),
    "en",
    "km",
  );
  expect(back.distance).toBe("120 m S");
});

test("off the route with a way back on the streets: its next turn, as the banner shows it", () => {
  // A way north from the runner, turning left 80 m on, back to the route.
  const north = (m: number): LatLon => [LAT + m / 111_195, 11.0 + 500 / M_PER_DEG_LON];
  const way = wayShownOf(
    {
      points: [north(120), north(40), north(0)],
      distance_m: 120,
      rejoin: east(500),
      rejoin_m: 0,
      directions: [
        direction("depart", 0, "Via Garibaldi"),
        direction("left", 80, "Via Roma"),
      ],
    },
    500,
  );
  const state = liveStateOf(
    at(500, { offRoute: true, wayBack: { ...way, alongM: 20 } }),
    "en",
    "km",
  );
  expect(state).toMatchObject({
    sign: "←",
    distance: "60 m",
    instruction: "Turn left onto Via Roma",
    off: true,
  });
  // Past the way's last turn: how far the route is, as without a way.
  const done = liveStateOf(
    at(500, {
      offRoute: true,
      wayBack: { ...way, next: way.directions.length },
      rejoin: {
        from: east(500),
        to: east(520),
        alongM: 520,
        distanceM: 40,
        bearingDeg: 90,
      },
    }),
    "en",
    "km",
  );
  expect(done).toMatchObject({ sign: "⚠", distance: "40 m E", off: true });
});

test("past the last turn: on to the end", () => {
  expect(liveStateOf(at(600, { next: 2 }), "en", "km")).toMatchObject({
    sign: "↑",
    distance: "",
    instruction: "Follow the route to the end.",
  });
});

test("arrived: the tick, the whole bar, nothing left", () => {
  expect(liveStateOf(at(990, { next: 2, arrived: true }), "en", "km")).toMatchObject({
    sign: "✓",
    distance: "",
    instruction: "You have arrived.",
    done: 1,
    drawn: "100% drawn",
    left: "0 m left",
    arrived: true,
  });
});

test("the widget's colours are the app's tokens", () => {
  const palette = paletteOf({ tone: "dark", dark: 0, light: 0 });
  expect(liveColorsOf(palette)).toEqual({
    accent: palette.accent,
    onAccent: palette.onAccent,
    surface: palette.surface,
    text: palette.text,
    textMuted: palette.textMuted,
    warning: palette.warning,
  });
});

/** A native module that keeps what it was asked. */
function native(available = true) {
  const calls: { kind: string; state: LiveState; extra?: unknown }[] = [];
  const module: NativeLiveActivity = {
    isAvailable: () => available,
    start: async (colors, state) => {
      calls.push({
        kind: "start",
        state: JSON.parse(state) as LiveState,
        extra: JSON.parse(colors),
      });
      return true;
    },
    update: async (state) => {
      calls.push({ kind: "update", state: JSON.parse(state) as LiveState });
    },
    end: async (state, seconds) => {
      calls.push({
        kind: "end",
        state: JSON.parse(state) as LiveState,
        extra: seconds,
      });
    },
  };
  return { module, calls };
}

test("no module, or Live Activities turned off: none, the notification writes instead", () => {
  expect(startLiveActivity(at(0), null)).toBeNull();
  expect(startLiveActivity(at(0), native(false).module)).toBeNull();
});

test("it starts with the route's first turn and the app's colours", () => {
  const { module, calls } = native();
  startLiveActivity(at(0), module, () => 0);
  expect(calls).toHaveLength(1);
  expect(calls[0].kind).toBe("start");
  expect(calls[0].state.instruction).toMatch(/Via Verdi/);
  expect(calls[0].extra).toEqual(liveColorsOf());
});

test("an update only when what shows changes, at most one a second", () => {
  const { module, calls } = native();
  let ms = 0;
  const run = startLiveActivity(at(10), module, () => ms)!;
  // The same metres to the turn: nothing to send.
  ms = 2000;
  run.update(at(11));
  expect(calls.filter((c) => c.kind === "update")).toHaveLength(0);
  // New metres within the second: they wait for the next fix.
  ms = 2000 + UPDATE_EVERY_MS;
  run.update(at(100));
  ms += 300;
  run.update(at(110));
  ms += UPDATE_EVERY_MS;
  run.update(at(120));
  expect(calls.filter((c) => c.kind === "update").map((c) => c.state.distance)).toEqual(
    ["320 m", "300 m"],
  );
});

test("leaving the route shows at once", () => {
  const { module, calls } = native();
  let ms = 0;
  const run = startLiveActivity(at(0), module, () => ms)!;
  ms = 5000;
  run.update(at(100));
  ms += 10;
  run.update(at(100, { offRoute: true }));
  expect(calls.filter((c) => c.kind === "update").map((c) => c.state.off)).toEqual([
    false,
    true,
  ]);
});

test("arrived, the end stays five minutes; stopped before, it goes at once", () => {
  const arrived = native();
  startLiveActivity(at(0), arrived.module)!.end(at(990, { next: 2, arrived: true }));
  expect(arrived.calls.at(-1)).toMatchObject({ kind: "end", extra: ARRIVED_STAYS_S });
  expect(ARRIVED_STAYS_S).toBe(300);

  const stopped = native();
  const run = startLiveActivity(at(0), stopped.module)!;
  run.end(at(400));
  run.end(at(400));
  run.update(at(450));
  expect(stopped.calls.map((c) => [c.kind, c.extra ?? null])).toEqual([
    ["start", liveColorsOf()],
    ["end", 0],
  ]);
});
