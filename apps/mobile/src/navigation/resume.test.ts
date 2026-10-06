import type { Direction, LatLon, Walk } from "@shaperoute/shared-types";

import { onFix, startNavigation, upcoming } from "./navigator";
import { startOnFoot } from "./onFootVoice";
import { PEN_DOWN_M, startPen } from "./penUp";
import { resumeFollowing } from "./resume";
import type { TrackFix } from "./trackRecorder";

// A run that goes on after «Stop» and «Keep running», or after the app was
// closed, goes on with its navigation (TASK-253): the next turn said is the
// one ahead, the letters drawn stay drawn.

const START: LatLon = [46.0122, 11.2986];
const METRE = 1 / 111_195;
/** `m` metres north of the start. */
const north = (m: number): LatLon => [START[0] + m * METRE, START[1]];
// A straight route of 2 km, a point every 100 m.
const ROUTE: LatLon[] = Array.from({ length: 21 }, (_, i) => north(100 * i));

function direction(
  turn: Direction["turn"],
  distance_m: number,
  street: string,
): Direction {
  return {
    node: distance_m / 100,
    point: north(distance_m),
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
  direction("left", 600, "Via Verdi"),
  direction("right", 1400, "Via Bianchi"),
];
/** A word of three letters: walks between 500 and 700 m, 1200 and 1400 m. */
const WALKS: Walk[] = [
  [5, 7],
  [12, 14],
];

/** The fixes of a runner who went `toM` metres north, one every 20 m. */
function fixesTo(toM: number): TrackFix[] {
  const fixes: TrackFix[] = [];
  for (let m = 0; m <= toM; m += 20) {
    fixes.push({ point: north(m), timeMs: m * 360, accuracyM: 5 });
  }
  return fixes;
}

function started(walks: Walk[] = [], word: string | null = null) {
  const { navigation } = startNavigation(ROUTE, DIRECTIONS);
  return {
    navigation,
    pen: startPen(navigation.along, walks, word),
    onFoot: startOnFoot(navigation.along, []),
  };
}

test("a run that goes on at 1 km has the second turn ahead, and says it once there", () => {
  const resumed = resumeFollowing(started(), fixesTo(1000));
  expect(resumed.navigation.alongM).toBeCloseTo(1000, -1);
  expect(resumed.navigation.offRoute).toBe(false);
  expect(upcoming(resumed.navigation)?.direction.street).toBe("Via Bianchi");
  // The turn behind is not said again; the one ahead is, in its place.
  const next = onFix(resumed.navigation, north(1020));
  expect(next.cues).toEqual([]);
  const near = onFix(next.navigation, north(1360));
  expect(near.cues).toEqual([
    { say: "In 40 metres, turn right onto Via Bianchi", vibrate: true },
  ]);
});

test("a run that starts has everything ahead", () => {
  const fresh = resumeFollowing(started(), []);
  expect(fresh.navigation.alongM).toBe(0);
  expect(upcoming(fresh.navigation)?.direction.street).toBe("Via Verdi");
});

test("a word that goes on in its second letter has the pen down, the first walk behind", () => {
  const resumed = resumeFollowing(started(WALKS, "RUN"), fixesTo(900));
  expect(resumed.pen.next).toBe(1);
  expect(resumed.pen.up).toBe(false);
  // And one that goes on in the middle of a walk has the pen up.
  const walking = resumeFollowing(started(WALKS, "RUN"), fixesTo(600));
  expect(walking.pen.next).toBe(0);
  expect(walking.pen.up).toBe(true);
  // The pen comes down where it would have: PEN_DOWN_M before the letter.
  const down = resumeFollowing(started(WALKS, "RUN"), fixesTo(700 - PEN_DOWN_M));
  expect(down.pen.next).toBe(1);
  expect(down.pen.up).toBe(false);
});

test("a runner who stopped off the route goes on off it, and finds it again", () => {
  const aside: TrackFix[] = [
    ...fixesTo(400),
    ...[420, 440, 460, 480].map((m) => ({
      point: [START[0] + m * METRE, START[1] + 0.001] as LatLon,
      timeMs: m * 360,
      accuracyM: 5,
    })),
  ];
  const resumed = resumeFollowing(started(), aside);
  expect(resumed.navigation.offRoute).toBe(true);
  const back = onFix(onFix(resumed.navigation, north(500)).navigation, north(520));
  expect(back.navigation.offRoute).toBe(false);
  expect(back.navigation.alongM).toBeCloseTo(520, -1);
});
