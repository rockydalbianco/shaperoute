import type { Direction, LatLon } from "@shaperoute/shared-types";
import type { AppStateStatus } from "react-native";

import {
  forgetLockQuestion,
  type LockNotice,
  lockNoticeOf,
  type LockNotifier,
  type LockPhone,
  startLockNotice,
} from "./lockNotice";
import { type Navigation, startNavigation } from "./navigator";

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

const TURN = [{ say: "In 50 m, turn right onto Via Verdi", vibrate: true }];

test("a turn: the voice's words after its arrow, then the drawing done and the way left", () => {
  expect(lockNoticeOf(TURN, at(370), "km")).toEqual({
    title: "→ In 50 m, turn right onto Via Verdi",
    body: "37% drawn · 630 m left",
  });
});

test("the way left in the units chosen", () => {
  expect(lockNoticeOf(TURN, at(0), "km")?.body).toBe("0% drawn · 1.0 km left");
  expect(lockNoticeOf(TURN, at(0), "mi")?.body).toBe("0% drawn · 0.6 mi left");
});

test("off the route, the warning sign before the voice's words", () => {
  const off = [{ say: "You are off the route.", vibrate: true }];
  expect(lockNoticeOf(off, at(500, { offRoute: true }), "km")?.title).toBe(
    "⚠ You are off the route.",
  );
});

test("at the end, the words alone", () => {
  const end = [{ say: "You have arrived.", vibrate: true }];
  expect(lockNoticeOf(end, at(1000, { next: 2, arrived: true }), "km")).toEqual({
    title: "You have arrived.",
    body: "100% drawn · 0 m left",
  });
});

test("words said together are one notice", () => {
  const cues = [
    { say: "Back on the route.", vibrate: false },
    { say: "In 50 m, turn right onto Via Verdi", vibrate: true },
  ];
  expect(lockNoticeOf(cues, at(370), "km")?.title).toBe(
    "→ Back on the route. In 50 m, turn right onto Via Verdi",
  );
});

test("nothing said, no notice", () => {
  expect(lockNoticeOf([], at(370), "km")).toBeNull();
});

/** A notifier that keeps what it was asked. */
function notifier(): LockNotifier & {
  asks: number;
  shown: LockNotice[];
  clears: number;
} {
  const seen = {
    asks: 0,
    shown: [] as LockNotice[],
    clears: 0,
    ask: async () => {
      seen.asks += 1;
    },
    show: async (notice: LockNotice) => {
      seen.shown.push(notice);
    },
    clear: async () => {
      seen.clears += 1;
    },
  };
  return seen;
}

/** A phone whose app is `state`, changed by `move`. */
function phone(
  os = "ios",
): LockPhone & {
  now: AppStateStatus;
  move: (s: AppStateStatus) => void;
  listening: number;
} {
  let listener: ((state: AppStateStatus) => void) | null = null;
  const fake = {
    os,
    now: "background" as AppStateStatus,
    listening: 0,
    state: () => fake.now,
    onChange: (next: (state: AppStateStatus) => void) => {
      listener = next;
      fake.listening += 1;
      return {
        remove: () => {
          listener = null;
          fake.listening -= 1;
        },
      };
    },
    move: (state: AppStateStatus) => {
      fake.now = state;
      listener?.(state);
    },
  };
  return fake;
}

beforeEach(() => forgetLockQuestion());

test("with the phone locked, each turn said is shown, in the place of the one before", () => {
  const notices = notifier();
  const run = startLockNotice(notices, phone());
  run.said(TURN, at(370));
  run.said([{ say: "Turn right onto Via Verdi", vibrate: true }], at(415));
  expect(notices.shown.map((n) => n.title)).toEqual([
    "→ In 50 m, turn right onto Via Verdi",
    "→ Turn right onto Via Verdi",
  ]);
});

test("with the app in front, nothing is shown: the screen has the turn", () => {
  const notices = notifier();
  const device = phone();
  device.now = "active";
  const run = startLockNotice(notices, device);
  run.said(TURN, at(370));
  expect(notices.shown).toEqual([]);
});

test("a fix with nothing said shows nothing", () => {
  const notices = notifier();
  const run = startLockNotice(notices, phone());
  run.said([], at(370));
  expect(notices.shown).toEqual([]);
});

test("the notice goes when the app comes back, and at the end of the run", () => {
  const notices = notifier();
  const device = phone();
  const run = startLockNotice(notices, device);
  run.said(TURN, at(370));
  device.move("active");
  expect(notices.clears).toBe(1);
  // Nothing more to take away: none was shown since.
  run.end();
  expect(notices.clears).toBe(1);
  expect(device.listening).toBe(0);

  const again = startLockNotice(notices, phone());
  again.said(TURN, at(370));
  again.end();
  expect(notices.clears).toBe(2);
});

test("the permission is asked once, at the first run", () => {
  const notices = notifier();
  startLockNotice(notices, phone()).end();
  startLockNotice(notices, phone()).end();
  expect(notices.asks).toBe(1);
});

test("on Android nothing: the run's service has its notification", () => {
  const notices = notifier();
  const device = phone("android");
  const run = startLockNotice(notices, device);
  run.said(TURN, at(370));
  run.end();
  expect(notices).toMatchObject({ asks: 0, shown: [], clears: 0 });
  expect(device.listening).toBe(0);
});
