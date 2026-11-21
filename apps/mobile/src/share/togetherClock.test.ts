import type { LatLon, TogetherPage } from "@shaperoute/shared-types";
import together from "@shaperoute/shared-types/fixtures/together.json";

import {
  MARK_EVERY_S,
  MEET_M,
  meetings,
  metresApart,
  positionAt,
  realSecondAt,
  spanOf,
  togetherTracks,
  type TogetherTrack,
  videoSecondAt,
} from "./togetherClock";

const PAGE = together as TogetherPage;
// About 100 m east every 30 s, in Trento.
const STEP_LON = 0.0013;

function runner(
  name: string,
  startS: number,
  n: number,
  pauses: { from_s: number; to_s: number }[] = [],
  lat = 46.0671,
): TogetherPage["people"][number] {
  return {
    public_id: `id-${name}`,
    username: name,
    points: Array.from({ length: n }, (_, k): LatLon => [lat, 11.1214 + k * STEP_LON]),
    seconds: Array.from({ length: n }, (_, k) => startS + k * 30),
    pauses,
  };
}

/** Whether `p` lies on the segment from `a` to `b`, within a hair. */
function onSegment(p: LatLon, a: LatLon, b: LatLon): boolean {
  const ab = metresApart(a, b);
  return Math.abs(metresApart(a, p) + metresApart(p, b) - ab) < 0.01;
}

test("the author keeps its colour, the others take the next ones, never twice", () => {
  const page: TogetherPage = {
    people: [
      runner("me", 0, 5),
      runner("a", 0, 5),
      runner("b", 0, 5),
      runner("c", 0, 5),
    ],
  };
  const tracks = togetherTracks(page, "pink");
  expect(tracks.map((t) => t.colour)).toEqual([
    "pink",
    "yellow",
    "light_blue",
    "green",
  ]);
  expect(new Set(tracks.map((t) => t.colour)).size).toBe(4);
  expect(togetherTracks(PAGE, "yellow")[0]?.colour).toBe("yellow");
});

test("the clock runs from the first start to the last finish, pressed into the route", () => {
  const tracks = togetherTracks(PAGE, "yellow");
  const span = spanOf(tracks);
  expect(span.startS).toBe(0);
  expect(span.endS).toBe(1200);
  expect(realSecondAt(0, 10, span)).toBe(0);
  expect(realSecondAt(5, 10, span)).toBe(600);
  expect(realSecondAt(10, 10, span)).toBe(1200);
  expect(realSecondAt(12, 10, span)).toBe(1200);
  expect(videoSecondAt(600, 10, span)).toBe(5);
});

test("every position lies on a segment between two stored points", () => {
  const tracks = togetherTracks(PAGE, "yellow");
  const span = spanOf(tracks);
  for (const track of tracks) {
    for (let realS = span.startS - 20; realS <= span.endS + 20; realS += 7) {
      const at = positionAt(track, realS);
      const [i, j] = at.between;
      const a = track.points[i] as LatLon;
      const b = track.points[j] as LatLon;
      expect(onSegment(at.point, a, b)).toBe(true);
      expect(j - i).toBeLessThanOrEqual(1);
    }
  }
});

test("a later start waits at its first point, a finish stays at its last", () => {
  const [, late] = togetherTracks(PAGE, "yellow") as [TogetherTrack, TogetherTrack];
  expect(positionAt(late, 10)).toMatchObject({
    point: late.points[0],
    state: "waiting",
  });
  expect(positionAt(late, 5000)).toMatchObject({
    point: late.points[late.points.length - 1],
    state: "arrived",
  });
});

test("in a pause the runner stands where the pause began", () => {
  const [me] = togetherTracks(PAGE, "yellow") as [TogetherTrack];
  // The example's pause, from 300 s to 360 s: at its second point.
  const begun = positionAt(me, 300);
  expect(positionAt(me, 330)).toEqual({ ...begun, state: "paused" });
  expect(positionAt(me, 359.9).point).toEqual(begun.point);
  expect(positionAt(me, 360).state).toBe("moving");
});

test("whoever goes faster gets further on the same clock", () => {
  const slow = runner("slow", 0, 11);
  const fast = { ...runner("fast", 0, 11), seconds: slow.seconds.map((s) => s / 2) };
  const [a, b] = togetherTracks({ people: [slow, fast] }, "yellow") as [
    TogetherTrack,
    TogetherTrack,
  ];
  const at = 120;
  expect(positionAt(b, at).point[1]).toBeGreaterThan(positionAt(a, at).point[1]);
});

test("side by side, a mark at most every three seconds of video", () => {
  const page: TogetherPage = {
    people: [runner("me", 0, 41), runner("friend", 0, 41, [], 46.06711)],
  };
  const tracks = togetherTracks(page, "yellow");
  expect(metresApart(tracks[0]!.points[0]!, tracks[1]!.points[0]!)).toBeLessThan(
    MEET_M,
  );
  const marks = meetings(tracks, 12);
  expect(marks.length).toBeGreaterThan(0);
  for (let i = 1; i < marks.length; i += 1) {
    expect(marks[i]!.videoS - marks[i - 1]!.videoS).toBeGreaterThanOrEqual(
      MARK_EVERY_S,
    );
  }
  expect(marks.length).toBeLessThanOrEqual(Math.floor(12 / MARK_EVERY_S) + 1);
});

test("runs apart, or one at the start while the other is gone, never meet", () => {
  const far: TogetherPage = {
    people: [runner("me", 0, 21), runner("far", 0, 21, [], 46.0771)],
  };
  expect(meetings(togetherTracks(far, "yellow"), 12)).toEqual([]);
  // The second starts where the first did, an hour later: no meeting.
  const later: TogetherPage = {
    people: [runner("me", 0, 21), runner("late", 3600, 21)],
  };
  expect(meetings(togetherTracks(later, "yellow"), 12)).toEqual([]);
  expect(
    meetings(togetherTracks({ people: [runner("me", 0, 5)] }, "yellow"), 12),
  ).toEqual([]);
});

test("crossing paths at the same moment marks the crossing", () => {
  const east = runner("east", 0, 21);
  // Goes north across the first runner's line, at its 10th point, at 300 s.
  const north: TogetherPage["people"][number] = {
    public_id: "id-north",
    username: "north",
    points: Array.from({ length: 21 }, (_, k): LatLon => [
      46.0671 + (k - 10) * 0.0009,
      11.1214 + 10 * STEP_LON,
    ]),
    seconds: Array.from({ length: 21 }, (_, k) => k * 30),
    pauses: [],
  };
  const tracks = togetherTracks({ people: [east, north] }, "yellow");
  const marks = meetings(tracks, 10);
  expect(marks).toHaveLength(1);
  const crossing: LatLon = [46.0671, 11.1214 + 10 * STEP_LON];
  expect(metresApart(marks[0]!.point, crossing)).toBeLessThan(MEET_M);
  expect(marks[0]!.videoS).toBeCloseTo(videoSecondAt(300, 10, spanOf(tracks)), 0);
});
