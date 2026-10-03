import { POOR_FIX_M } from "./navigator";
import {
  type BikeWords,
  moveOnFoot,
  ON_FOOT_AHEAD_M,
  ON_FOOT_JOIN_M,
  ON_FOOT_SAID_M,
  type OnFoot,
  startOnFoot,
} from "./onFootVoice";
import { RIDE_ANNOUNCE_M } from "./ride";

/** Words that show what was asked of them. */
const WORDS: BikeWords = {
  walkTheBike: (inM, metres) =>
    `walk ${Math.round(metres)}${inM === null ? "" : ` in ${Math.round(inM)}`}`,
  backOnTheBike: "back",
};

/** A route of 11 points, 100 m apart: along[i] = 100 i, 1000 m in all. */
const ALONG = Array.from({ length: 11 }, (_, i) => i * 100);

/** The rider at each of `metres`, one fix each: what was said, in order. */
function ride(onFoot: OnFoot, metres: number[]): string[] {
  const said: string[] = [];
  let state = onFoot;
  for (const alongM of metres) {
    const step = moveOnFoot(state, alongM, WORDS);
    state = step.onFoot;
    said.push(...step.cues.map((cue) => cue.say));
  }
  return said;
}

test("said 100 m before the stretch, with its length, and at its end", () => {
  const onFoot = startOnFoot(ALONG, [[3, 5]]);
  expect(onFoot.spans).toEqual([{ fromM: 300, toM: 500 }]);
  // As far as a turn on a bike (TASK-216).
  expect(ON_FOOT_AHEAD_M).toBe(RIDE_ANNOUNCE_M);
  expect(ON_FOOT_AHEAD_M).toBe(100);
  expect(ride(onFoot, [100, 190, 200, 210, 300, 400, 499, 500, 600])).toEqual([
    "walk 200 in 100",
    "back",
  ]);
});

test("each cue vibrates, and is said once", () => {
  const onFoot = startOnFoot(ALONG, [[3, 5]]);
  const ahead = moveOnFoot(onFoot, 260, WORDS);
  expect(ahead.cues).toEqual([{ say: "walk 200 in 40", vibrate: true }]);
  expect(moveOnFoot(ahead.onFoot, 270, WORDS).cues).toEqual([]);
  const end = moveOnFoot(ahead.onFoot, 510, WORDS);
  expect(end.cues).toEqual([{ say: "back", vibrate: true }]);
  expect(moveOnFoot(end.onFoot, 520, WORDS).cues).toEqual([]);
});

test("a stretch reached late is said from here, with what is left of it", () => {
  // The first fix is already on it: the route starts on foot, or the fix
  // came late.
  expect(ride(startOnFoot(ALONG, [[0, 2]]), [0, 100, 200])).toEqual([
    "walk 200",
    "back",
  ]);
  expect(ride(startOnFoot(ALONG, [[3, 5]]), [100, 350, 500])).toEqual([
    "walk 150",
    "back",
  ]);
});

test("a stretch passed whole by a jump of the fix is passed in silence", () => {
  const onFoot = startOnFoot(ALONG, [
    [3, 4],
    [7, 8],
  ]);
  expect(ride(onFoot, [100, 600, 660, 800])).toEqual(["walk 100 in 40", "back"]);
});

test("a fix worse than POOR_FIX_M says nothing", () => {
  const onFoot = startOnFoot(ALONG, [[3, 5]]);
  expect(moveOnFoot(onFoot, 260, WORDS, POOR_FIX_M + 1).cues).toEqual([]);
  expect(moveOnFoot(onFoot, 260, WORDS, POOR_FIX_M).cues).toHaveLength(1);
});

test("close stretches are said as one; short ones are not said", () => {
  // 20 m apart, closer than ON_FOOT_JOIN_M: one stretch of 300 m.
  const along = [0, 100, 300, 320, 400, 500, 1000];
  expect(ON_FOOT_JOIN_M).toBeGreaterThan(20);
  const joined = startOnFoot(along, [
    [1, 2],
    [3, 4],
  ]);
  expect(joined.spans).toEqual([{ fromM: 100, toM: 400 }]);
  // Farther apart: two.
  expect(
    startOnFoot(along, [
      [1, 2],
      [4, 5],
    ]).spans,
  ).toHaveLength(2);
  // Shorter than ON_FOOT_SAID_M: none, also when the route has only it.
  expect(ON_FOOT_SAID_M).toBe(25);
  expect(startOnFoot([0, 10, 30, 1000], [[1, 2]]).spans).toEqual([]);
  expect(startOnFoot([0, 10, 40, 1000], [[1, 2]]).spans).toEqual([
    { fromM: 10, toM: 40 },
  ]);
});

test("a stretch that ends where the route ends has no «back on the bike»", () => {
  // The arrival is said by the navigator.
  expect(ride(startOnFoot(ALONG, [[8, 10]]), [600, 720, 900, 1000])).toEqual([
    "walk 200 in 80",
  ]);
  expect(startOnFoot(ALONG, []).spans).toEqual([]);
  expect(ride(startOnFoot(ALONG, []), [0, 500, 1000])).toEqual([]);
});
