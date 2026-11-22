import type { LatLon, TogetherPage } from "@shaperoute/shared-types";

import { LINE_COLOURS, type LineColour } from "./videoEdit";

/**
 * The one clock of a «Together» video (TASK-417 part D, ADR-0345): from the
 * first start of the group to the last finish, pressed into the seconds of
 * the video's «The route». At each moment everybody is where its track was
 * at that second, between two points it recorded; in a pause it stands
 * still. Whoever went faster gets further. No coordinate is made up: every
 * position lies on a segment between two stored points (the user's rule,
 * ADR-0001), and the tests say so.
 *
 * Where two tracks meet at the same moment, a ⚡ springs up, as the emoji of
 * the video do: closer than MEET_M within MEET_WINDOW_S of real time, at
 * most one every MARK_EVERY_S of video, so running side by side does not
 * cover the map with them.
 */

/** Two runners meet closer than this... */
export const MEET_M = 25;
/** ...within this many real seconds of each other. */
export const MEET_WINDOW_S = 10;
/** At most one mark in this many seconds of video. */
export const MARK_EVERY_S = 3;
/** The real clock is looked at every this many seconds for meetings. */
const MEET_STEP_S = 2;
/** Metres in a degree of latitude, as everywhere a small distance is
 * worked out flat. */
const M_PER_DEG = 111_320;

/** Somebody in the video: its track, its clock, its colour. */
export type TogetherTrack = {
  publicId: string;
  username: string;
  points: LatLon[];
  seconds: number[];
  pauses: { fromS: number; toS: number }[];
  colour: LineColour;
};

/** Where somebody is at a moment of the real clock. */
export type Position = {
  point: LatLon;
  /** Before its first point: waiting at the start. After its last: arrived. */
  state: "waiting" | "moving" | "paused" | "arrived";
  /** The stored points it lies between: `point` is on that segment. */
  between: [number, number];
};

/** A ⚡ in the video: when, in seconds of «The route», and where; the real
 * second, and the two runners who met (`who[0]` the first in the page). */
export type Meeting = {
  videoS: number;
  point: LatLon;
  realS: number;
  who: [number, number];
};

/** The real clock, from the first start to the last finish. */
export type Span = { startS: number; endS: number };

/**
 * The people of the page as the video draws them: the author first, with
 * the colour of the line it chose; the others with the colours after it, in
 * the order of the tokens, never the same twice.
 */
export function togetherTracks(page: TogetherPage, mine: LineColour): TogetherTrack[] {
  const others = LINE_COLOURS.filter((colour) => colour !== mine);
  return page.people.map((person, i) => ({
    publicId: person.public_id,
    username: person.username,
    points: person.points,
    seconds: person.seconds,
    pauses: person.pauses.map((pause) => ({ fromS: pause.from_s, toS: pause.to_s })),
    colour: i === 0 ? mine : (others[(i - 1) % others.length] as LineColour),
  }));
}

export function spanOf(tracks: readonly TogetherTrack[]): Span {
  const starts = tracks.map((track) => track.seconds[0] ?? 0);
  const ends = tracks.map((track) => track.seconds[track.seconds.length - 1] ?? 0);
  return { startS: Math.min(...starts), endS: Math.max(...ends) };
}

/** The real second shown `videoS` seconds into «The route», `routeS` long. */
export function realSecondAt(videoS: number, routeS: number, span: Span): number {
  if (routeS <= 0) {
    return span.endS;
  }
  const share = Math.min(1, Math.max(0, videoS / routeS));
  return span.startS + share * (span.endS - span.startS);
}

/** The video second, in «The route», that shows the real second `realS`. */
export function videoSecondAt(realS: number, routeS: number, span: Span): number {
  const length = span.endS - span.startS;
  if (length <= 0) {
    return 0;
  }
  return ((realS - span.startS) / length) * routeS;
}

/** The point a fraction `f` of the way from `a` to `b`. */
function along(a: LatLon, b: LatLon, f: number): LatLon {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/** Where the track was at the real second `realS`, by its stored points. */
function onTrack(track: TogetherTrack, realS: number): Position {
  const { points, seconds } = track;
  const last = points.length - 1;
  const first = seconds[0] as number;
  if (realS <= first || last === 0) {
    return {
      point: points[0] as LatLon,
      state: realS < first ? "waiting" : last === 0 ? "arrived" : "moving",
      between: [0, 0],
    };
  }
  if (realS >= (seconds[last] as number)) {
    return { point: points[last] as LatLon, state: "arrived", between: [last, last] };
  }
  // The last point at or before realS: seconds never go back.
  let low = 0;
  let high = last;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if ((seconds[middle] as number) <= realS) {
      low = middle;
    } else {
      high = middle;
    }
  }
  const from = seconds[low] as number;
  const to = seconds[high] as number;
  const f = to > from ? (realS - from) / (to - from) : 0;
  return {
    point: along(points[low] as LatLon, points[high] as LatLon, f),
    state: "moving",
    between: [low, high],
  };
}

/**
 * Where `track` is at the real second `realS`: between two of its stored
 * points; in a pause, where the pause began, standing still.
 */
export function positionAt(track: TogetherTrack, realS: number): Position {
  const pause = track.pauses.find((p) => p.fromS <= realS && realS < p.toS);
  if (pause === undefined) {
    return onTrack(track, realS);
  }
  const still = onTrack(track, pause.fromS);
  return still.state === "moving" ? { ...still, state: "paused" } : still;
}

/** Metres between two points close to each other, on a flat plane. */
export function metresApart(a: LatLon, b: LatLon): number {
  const north = (b[0] - a[0]) * M_PER_DEG;
  const east =
    (b[1] - a[1]) * M_PER_DEG * Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180);
  return Math.hypot(north, east);
}

/**
 * The ⚡ of the video: where two of `tracks` were closer than MEET_M within
 * MEET_WINDOW_S of each other, both on their way (not waiting at the start
 * nor arrived), at most one every MARK_EVERY_S seconds of «The route».
 */
export function meetings(tracks: readonly TogetherTrack[], routeS: number): Meeting[] {
  if (tracks.length < 2) {
    return [];
  }
  const span = spanOf(tracks);
  const found: Meeting[] = [];
  let lastVideoS = -Infinity;
  const onTheWay = (p: Position) => p.state === "moving" || p.state === "paused";
  for (let realS = span.startS; realS <= span.endS; realS += MEET_STEP_S) {
    const videoS = videoSecondAt(realS, routeS, span);
    if (videoS - lastVideoS < MARK_EVERY_S) {
      continue;
    }
    let met: LatLon | null = null;
    let who: [number, number] = [0, 0];
    for (let a = 0; a < tracks.length && met === null; a += 1) {
      const here = positionAt(tracks[a] as TogetherTrack, realS);
      if (!onTheWay(here)) {
        continue;
      }
      for (let b = a + 1; b < tracks.length && met === null; b += 1) {
        for (let d = -MEET_WINDOW_S; d <= MEET_WINDOW_S; d += MEET_STEP_S) {
          const there = positionAt(tracks[b] as TogetherTrack, realS + d);
          if (onTheWay(there) && metresApart(here.point, there.point) < MEET_M) {
            met = along(here.point, there.point, 0.5);
            who = [a, b];
            break;
          }
        }
      }
    }
    if (met !== null) {
      found.push({ videoS, point: met, realS, who });
      lastVideoS = videoS;
    }
  }
  return found;
}
