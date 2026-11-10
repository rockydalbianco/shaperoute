import type { LatLon } from "@shaperoute/shared-types";

import { fitLines, type Segment } from "../activities/fitLines";
import { appLanguage } from "../i18n/language";
import type { Language } from "../i18n/languages";
import { HEART_BOX, HEART_POINTS, heartHeight } from "../intro/heartLine";
import { PITCH_3D } from "../map/mapKindStyle";
import { bearingOf } from "../map/turnedMap";
import {
  color,
  font,
  type Palette,
  route,
  routeCasingOf,
  tracking,
} from "../theme/tokens";
import {
  POST_RESULTS,
  postLine,
  type PostResult,
  type PostRun,
  resultName,
  resultValue,
} from "./postRun";
import type { Sticker } from "./stickers";
import {
  CHASE_PITCH,
  type ChaseCamera,
  chaseCamera,
  chaseSamples,
  type Plane,
  planeOf,
} from "./videoChase";
import type { Actor } from "./videoActor";
import {
  ALONG_COUNT,
  FIRST_EDIT,
  type LineColour,
  lineColourOf,
  type VideoEdit,
} from "./videoEdit";
import {
  MAP_CREDIT,
  MAP_PIXEL_RATIO,
  STILL_ZOOM,
  TERRAIN_CREDIT,
  TURN_DEG,
  type VideoMap,
  videoMap,
} from "./videoMap";
import {
  type Cut,
  type Ending,
  type Opening,
  SCENES,
  type SceneName,
  type SceneWindow,
  sceneWindows,
} from "./videoScenes";
import { styleMap, styleRelief, stylePalette, type VideoStyle } from "./videoStyle";

/**
 * The video of a run (TASK-295, ADR-0254; TASK-351, ADR-0303), as what to
 * draw in each of its pictures. In the map looks («night», dark and warm;
 * «day», light, with the line on its dark edge and the words on a light
 * veil) the map of the run lies under everything, and the line draws itself
 * in the yellow of a route while distance and time count up, the words in
 * the type scale of the premium look (ADR-0293); then the whole drawing
 * stays, with the results and the emoji the runner chose for the post. The
 * «paper» look is the post on the yellow of MuW coming to life, as the
 * video was before: the page falls back on it when the map does not come.
 * On «3D» the map leans on its hills and the camera turns a little around
 * the run, or the one picture is zoomed slowly when a turning picture costs
 * the phone too much (part D, the user's choice 4): the page lays the line
 * on the hills itself then, from the points this scene gives it.
 *
 * Only numbers and words here: the hidden WebView (videoPage) draws them on
 * a canvas and encodes them, so what the video shows is decided, and
 * tested, in the app. Where the line lies on the map is decided here too,
 * with the same fit the Feed lays its maps under a drawing with (ADR-0131).
 */

/** A vertical video for Stories and Reels: 9 wide, 16 tall. */
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const VIDEO_FPS = 30;
/** About 12 seconds, the user's choice. */
export const VIDEO_SECONDS = 12;

/** The looks of the video: a style with the map under the line, or the
 * yellow post. */
export type VideoLook = "paper" | VideoStyle;

/** When each part starts and how long the line takes, in seconds. */
const INTRO_S = 1;
/** The scenes (TASK-408, part C2): the route's line starts this long into
 * the route when the route is not first; the opening fades this long into
 * what follows with «Fade»; its drawing starts this long into it and is
 * whole this long before its end; with the ending off, its things come in
 * this long before the video ends. */
const LEAD_S = 0.3;
const FADE_S = 0.5;
const HOLD_S = 0.5;
/** «Camera behind» (part C2b): how long the camera takes to come down to
 * the animal, and back up after the route. */
const SWOOP_S = 1;
const LAST_S = 1.5;
/** The opening's title: its size as a multiple of the title's, its top as
 * a share of the height. */
const BIG_TITLE = 1.5;
const BIG_TITLE_TOP = 0.36;
/** The ending's «Numbers»: their size as a multiple of the values', the
 * first one's top as a share of the height. */
const BIG_NUMBERS = 1.5;
const BIG_NUMBERS_TOP = 0.3;
/** The ending's heart: its square's side as a share of the width, its
 * middle as a share of the height, the name's size as a multiple of the
 * logo's; where in «All three» it comes in, as a share of the ending. */
const HEART_CARD = 0.34;
const HEART_CARD_MIDDLE = 0.44;
const BIG_NAME = 1.8;
const ALL_HEART_FROM = 0.45;
/** How much of the look's ground veils the picture under the ending's
 * numbers and heart. */
const VEIL = 0.7;
/** Between one emoji and the next coming in, and how long each takes. */
const EMOJI_STEP_S = 0.15;
const EMOJI_POP_S = 0.35;
/** The emoji of the way and of the end (TASK-408, part C1): their size as a
 * share of the width; where those of the end burst, as shares of the width
 * and of the height, at the corners of the drawing and halfway down its
 * sides, clear of the title, the logo and the numbers; the step between
 * them. */
const ALONG_EMOJI = 0.09;
const END_EMOJI = 0.12;
const END_SPOTS: readonly [number, number][] = [
  [0.14, 0.21],
  [0.86, 0.21],
  [0.07, 0.46],
  [0.93, 0.46],
  [0.1, 0.69],
  [0.9, 0.69],
];
const END_STEP_S = 0.12;

// The post's places (PostImage), as shares of the width and of the height.
const SIDE = 0.08;
const BADGE = 0.09;
const NAME = 0.05;
const EMOJI = 0.11;
const BRAND_GAP = 0.017;
const TITLE_TOP = 0.1;
const DRAWING_TOP = 0.2;
const DRAWING_BOTTOM = 0.7;
/** A line of text is this many times its letters' size, as in the app. */
const LINE_HEIGHT = 1.2;

// The logo's heart (HeartBadge), as shares of its square.
const HEART_SHARE = 0.68;
const HEART_LINE_SHARE = 1 / 16;
const HEART_DOT_SHARE = 1 / 6;
const HEART_RING_SHARE = 1 / 24;
/** The corner of the yellow square behind the heart (HeartBadge). */
const BADGE_CORNER_SHARE = 0.22;

/** Where the veil rises from, on the map looks, as a share of the height;
 * how opaque it is at the bottom edge: the dark of `Scrim` (ADR-0293), or
 * the light veil of «Day», almost whole so the dark words read on the map. */
const SCRIM_TOP = 0.6;
const SCRIM_PEAK = 0.82;
const DAY_SCRIM_PEAK = 0.94;
/** The credit's letters and its room from the bottom edge. */
const CREDIT = 0.02;
const CREDIT_BOTTOM = 0.012;
/** The animal's length, as a share of the width (TASK-408). */
const CHARACTER = 0.2;
/** How high the animal is seen from, in degrees above the ground, on the
 * flat looks; on «3D», from as high as the map is. */
const CHARACTER_TILT = 50;
/** The runner's own image hops as it runs (TASK-417, ADR-0345): this high
 * at most, as a share of the animal's length, this many times a second. */
const IMAGE_HOP = 0.07;
const IMAGE_HOPS_PER_S = 2.5;

/** The width of the phone the type scale (`font`) is drawn for, in points:
 * a size in points is that share of the video's width. */
const PHONE_WIDTH = 390;

/** A colour of the look an op is drawn in. */
export type ColorRole =
  "ink" | "muted" | "faint" | "accent" | "onAccent" | "dot" | "line" | "paper";

/** The colours of a look, from the tokens: what each role means. */
export type VideoColors = {
  /** Under everything: the yellow of the post, or the map's own ground. */
  paper: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  onAccent: string;
  /** The start of the logo's heart. */
  dot: string;
  /** The run's line and the pen's tip: the colour chosen in «Edit video»
   * on the map looks (TASK-408), the ink on paper. */
  line: string;
  /** The dark that rises under the words on the map looks. */
  scrim: string;
};

/** One thing to draw. Places and sizes in pixels of the video, y down;
 * `alpha` from 0 (not there) to 1. */
export type VideoOp =
  /** The map's picture, once the page has it. On «3D», `turn` is where the
   * camera has turned to, in degrees about the drawing's bearing, when it
   * turns, and `zoom` how far the one picture is zoomed about the drawing's
   * middle when the map stands still: the page knows which. With `flat`,
   * the map seen from straight above under the opening's drawing
   * (TASK-408, part C2), when the page has that picture. With «Camera
   * behind» (part C2b), `chase` is the camera behind the animal and `u`
   * how far the page's camera has gone from the whole drawing to it, 0 to
   * 1; the page moves the map there when it can, and keeps it still
   * otherwise. */
  | {
      k: "map";
      alpha: number;
      turn?: number;
      zoom?: number;
      flat?: boolean;
      chase?: ChaseCamera;
      u?: number;
    }
  /** The veil rising from `top` to the bottom edge, `peak` opaque there. */
  | { k: "scrim"; top: number; peak: number; alpha: number }
  /** A filled square with round corners. */
  | {
      k: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      r: number;
      color: ColorRole;
      alpha: number;
    }
  /** A path of the scene, from its start to `upTo` pixels along it. On
   * «3D» the run's path is the line as the map lays it on the hills, as far
   * as `share` of it (0 to 1): the page projects it itself. */
  | {
      k: "line";
      path: number;
      upTo: number;
      width: number;
      color: ColorRole;
      alpha: number;
      share?: number;
    }
  /** A round dot, `ring` pixels of `ringColor` inside its edge; on «3D»
   * at `share` of `path` as the map lays it, instead of at x, y. */
  | {
      k: "dot";
      x: number;
      y: number;
      r: number;
      fill: ColorRole;
      ring: number;
      ringColor: ColorRole;
      alpha: number;
      path?: number;
      share?: number;
    }
  /** Words, from the top of their first line; at most `lines` lines
   * `maxWidth` wide, the last one cut with «…». `tracking` in pixels
   * between letters, `weight` as CSS has it. */
  | {
      k: "text";
      text: string;
      x: number;
      y: number;
      size: number;
      weight: number;
      tracking: number;
      color: ColorRole;
      align: "left" | "center";
      maxWidth: number;
      lines: number;
      alpha: number;
    }
  /** An emoji, centred on x, y, grown by `scale`; on «3D» at `share` of
   * `path` as the map lays it, instead of at x, y (TASK-408). */
  | {
      k: "emoji";
      text: string;
      x: number;
      y: number;
      size: number;
      scale: number;
      alpha: number;
      path?: number;
      share?: number;
    }
  /** The animal (TASK-408): its feet `upTo` pixels along `path`, on «3D»
   * at `share` of it as the map lays it, turned along the line by the page;
   * `size` pixels long, seen from `tilt` degrees above the ground; in its
   * gallop or its rest, `time` seconds into it.
   * A page without the animal draws nothing for it: the pen's tip is under
   * it anyway. With the runner's own image (TASK-417), `hop` pixels up
   * while it runs, none at rest. */
  | {
      k: "character";
      path: number;
      upTo: number;
      size: number;
      tilt: number;
      clip: "run" | "rest";
      time: number;
      alpha: number;
      share?: number;
      hop?: number;
    };

export type VideoScene = {
  width: number;
  height: number;
  fps: number;
  look: VideoLook;
  colors: VideoColors;
  /** The map under the pictures; null on paper, or with nothing to frame.
   * With `flat`, the page also takes its picture from straight above, for
   * the opening on «3D» (TASK-408, part C2). */
  map:
    | (VideoMap & {
        flat?: boolean;
        /** «Camera behind» (part C2b): cameras along the run for the
         * page to try before the video. */
        chase?: { cameras: ChaseCamera[] };
      })
    | null;
  /** Lines, each as x0, y0, x1, y1, …: the logo's heart, then the run;
   * then the ending's large heart when it has one (TASK-408). */
  paths: number[][];
  /** The animal that runs the line (TASK-408), or the runner's own image
   * (TASK-417); null for the pen's tip only. */
  character: Actor | null;
  /** What each picture shows, in order. */
  frames: VideoOp[][];
};

const HEART_PATH = 0;
const RUN_PATH = 1;
const BIG_HEART_PATH = 2;

/** The most points of the run's line, and the closest two may be. */
export const MAX_POINTS = 2000;
const MIN_STEP_PX = 2;

/** A size of text: letters, weight, tracking, as shares of the width (the
 * tracking too), and the line as a multiple of the letters. */
type TextStyle = {
  size: number;
  weight: number;
  tracking: number;
  lineHeight: number;
};

/** How a look draws the video. */
type Look = {
  colors: VideoColors;
  title: TextStyle;
  label: TextStyle & { upper: boolean; color: ColorRole };
  value: TextStyle;
  line: { width: number; color: ColorRole };
  /** A wider line under the run's, in `onAccent`: the route's dark edge on
   * the light map (ADR-0231); `extra` is its width beyond the line's, as a
   * share of the width. */
  casing: { extra: number; alpha: number } | null;
  /** The map under the line: on every map look but «2D» (TASK-408). */
  map: boolean;
  /** The map leaning on its hills, the line laid on them by the page. */
  relief: boolean;
  /** The yellow square behind the logo's heart. */
  badge: boolean;
  scrim: boolean;
  scrimPeak: number;
  credit: string | null;
  /** The results' room from the bottom edge, as a share of the height; the
   * gap between their rows, of the width. */
  resultsBottom: number;
  rowGap: number;
};

/** A measure in points of the phone, as a share of the video's width. */
function ofPhone(points: number): number {
  return points / PHONE_WIDTH;
}

/** A style of `font`, as the video draws it. */
function textStyle(
  style: { fontSize: number; fontWeight: string; lineHeight: number },
  letterTracking: number,
): TextStyle {
  return {
    size: ofPhone(style.fontSize),
    weight: Number(style.fontWeight),
    tracking: ofPhone(letterTracking),
    lineHeight: style.lineHeight / style.fontSize,
  };
}

/** The post on the yellow of MuW, as the video was (ADR-0254): the ink is
 * the text on yellow, in the app's own tone. */
const PAPER: Look = {
  colors: {
    paper: color.accent,
    ink: color.onAccent,
    muted: color.onAccent,
    faint: color.onAccent,
    accent: color.accent,
    onAccent: color.onAccent,
    dot: color.text,
    line: color.onAccent,
    scrim: color.scrim,
  },
  title: { size: 0.065, weight: 700, tracking: 0, lineHeight: LINE_HEIGHT },
  label: {
    size: 0.035,
    weight: 500,
    tracking: 0,
    lineHeight: LINE_HEIGHT,
    upper: false,
    color: "ink",
  },
  value: { size: 0.075, weight: 700, tracking: 0, lineHeight: LINE_HEIGHT },
  line: { width: 0.02, color: "line" },
  casing: null,
  map: false,
  relief: false,
  badge: false,
  scrim: false,
  scrimPeak: SCRIM_PEAK,
  credit: null,
  resultsBottom: 0.04,
  rowGap: 0.023,
};

/** The map under the line, in the colours of `palette` and the type scale
 * of the premium look (ADR-0293): large light numbers, small spaced labels,
 * a regular title, the line in the yellow of a route. By `day` the veil is
 * the light map's own ground, almost whole, and the line runs on its dark
 * edge, as on the light map (ADR-0231). On «3D» (`relief`) the credit
 * names the hills' heights too. Without the map («2D», TASK-408) the same
 * look on the map's bare ground: no veil, no credit. */
function mapLook(
  palette: Palette,
  day: boolean,
  relief: boolean,
  line: LineColour,
  map: boolean,
): Look {
  const casing = routeCasingOf("light");
  return {
    colors: {
      paper: palette.map.background,
      ink: palette.text,
      muted: palette.textMuted,
      faint: palette.textFaint,
      accent: palette.accent,
      onAccent: palette.onAccent,
      dot: palette.text,
      line: lineColourOf(line, palette),
      scrim: day ? palette.map.background : palette.scrim,
    },
    title: textStyle(font.title, tracking.title),
    label: { ...textStyle(font.label, tracking.label), upper: true, color: "muted" },
    value: textStyle(font.display, tracking.display),
    line: { width: 0.016, color: "line" },
    casing:
      day && casing !== null
        ? { extra: ofPhone(casing.width - route.width), alpha: casing.opacity }
        : null,
    map,
    relief,
    badge: true,
    scrim: map,
    scrimPeak: day ? DAY_SCRIM_PEAK : SCRIM_PEAK,
    credit: !map ? null : relief ? `${MAP_CREDIT} · ${TERRAIN_CREDIT}` : MAP_CREDIT,
    resultsBottom: 0.06,
    rowGap: 0.036,
  };
}

/** One decimal: the scene goes to the WebView as text. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Where `t` is from `from` to `to`, from 0 to 1. */
function ramp(t: number, from: number, to: number): number {
  return Math.min(1, Math.max(0, (t - from) / (to - from)));
}

/** Slow at both ends. */
function easeInOut(u: number): number {
  return (1 - Math.cos(Math.PI * u)) / 2;
}

/** Past 1 a little, then back: an emoji that pops. */
function easeOutBack(u: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
}

/** The points of segments laid one after the other (fitLines draws each
 * from where the last one ended). */
export function pointsOf(segments: readonly Segment[]): [number, number][] {
  const ends = (s: Segment, sign: number): [number, number] => {
    const angle = (s.angle * Math.PI) / 180;
    return [
      s.left + s.length / 2 + (sign * Math.cos(angle) * s.length) / 2,
      s.top + (sign * Math.sin(angle) * s.length) / 2,
    ];
  };
  if (segments.length === 0) {
    return [];
  }
  return [ends(segments[0], -1), ...segments.map((s) => ends(s, 1))];
}

/**
 * The run's line with at most `most` points (and its two ends): the scene,
 * and the page's work for each picture, stay the same size however long
 * the run (a fix a second for hours). Points closer than `MIN_STEP_PX` are
 * under the line's own width anyway.
 */
export function thinned(
  points: readonly [number, number][],
  most: number = MAX_POINTS,
): [number, number][] {
  if (points.length <= 2) {
    return [...points];
  }
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1],
    );
  }
  // Each point kept is at least `step` from the one before, so at most
  // length / step of them.
  const step = Math.max(MIN_STEP_PX, length / most);
  const kept: [number, number][] = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = kept[kept.length - 1];
    if (Math.hypot(points[i][0] - x, points[i][1] - y) >= step) {
      kept.push(points[i]);
    }
  }
  kept.push(points[points.length - 1]);
  return kept;
}

/** The most points of the run's line on «3D», where the page lays each of
 * them on the hills for every picture of a turning camera: about 80 µs a
 * point on an iPhone (measured 2026-10-30), so 150 cost 12 ms. */
export const MAX_POINTS_3D = 150;
/** Points of a track closer than this, in metres, are GPS noise. */
const MIN_STEP_M = 2;

/**
 * `track` with at most `most` points (and its two ends), each at least a
 * step from the one kept before, in metres: the line the page lays on the
 * hills, as `thinned` does in pixels for the flat one.
 */
export function thinnedTrack(
  track: readonly LatLon[],
  most: number = MAX_POINTS_3D,
): LatLon[] {
  if (track.length <= 2) {
    return [...track];
  }
  const k = Math.cos((track[0][0] * Math.PI) / 180);
  const metres = (a: LatLon, b: LatLon): number =>
    Math.hypot((b[1] - a[1]) * k, b[0] - a[0]) * 111_195;
  let length = 0;
  for (let i = 1; i < track.length; i += 1) {
    length += metres(track[i - 1], track[i]);
  }
  const step = Math.max(MIN_STEP_M, length / Math.max(1, most - 2));
  const kept: LatLon[] = [track[0]];
  for (let i = 1; i < track.length - 1; i += 1) {
    if (metres(kept[kept.length - 1], track[i]) >= step) {
      kept.push(track[i]);
    }
  }
  kept.push(track[track.length - 1]);
  return kept;
}

/** How long a path is, in pixels. */
export function lengthOf(path: readonly number[]): number {
  let length = 0;
  for (let i = 2; i < path.length; i += 2) {
    length += Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
  }
  return length;
}

/** The point `upTo` pixels along `path`; its end past its length. */
export function pointAlong(path: readonly number[], upTo: number): [number, number] {
  let walked = 0;
  for (let i = 2; i < path.length; i += 2) {
    const step = Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
    if (walked + step >= upTo && step > 0) {
      const share = (upTo - walked) / step;
      return [
        path[i - 2] + (path[i] - path[i - 2]) * share,
        path[i - 1] + (path[i + 1] - path[i - 1]) * share,
      ];
    }
    walked += step;
  }
  return [path[path.length - 2], path[path.length - 1]];
}

/** The results the video shows, in the post's order: the ones on that the
 * run has. */
function resultsShown(run: PostRun, shown: readonly PostResult[]): PostResult[] {
  return POST_RESULTS.filter(
    (result) => shown.includes(result) && resultValue(run, result) !== null,
  );
}

/** The run as far as `share` of it: distance and time count up, the pace
 * is the whole run's. */
function valueAt(run: PostRun, result: PostResult, share: number): string | null {
  if (result === "pace") {
    return resultValue(run, result);
  }
  return resultValue(
    { ...run, distanceM: run.distanceM * share, durationMs: run.durationMs * share },
    result,
  );
}

/** The parts that do not move: the logo, the drawing's path, the places,
 * and the map under them, in `palette` when there is one. */
function layoutOf(
  run: PostRun,
  shown: readonly PostResult[],
  look: Look,
  palette: Palette | null,
  language: Language,
) {
  const w = VIDEO_WIDTH;
  const h = VIDEO_HEIGHT;
  const badge = w * BADGE;
  const corner = w * SIDE * 0.6;
  const heartWidth = badge * HEART_SHARE;
  const heartScale = heartWidth / HEART_BOX.width;
  const heartLeft = corner + (badge - heartWidth) / 2;
  const heartTop = corner + (badge - heartHeight(heartWidth)) / 2;
  const heart = HEART_POINTS.flatMap(([x, y]) => [
    round(heartLeft + x * heartScale),
    round(heartTop + y * heartScale),
  ]);

  const boxWidth = w * (1 - 2 * SIDE);
  const boxHeight = h * (DRAWING_BOTTOM - DRAWING_TOP);
  const line = w * look.line.width;
  const whole = postLine(run.track);
  const bearing = bearingOf(run.rotationDeg);
  const [segments] = fitLines([whole], boxWidth, boxHeight, line, bearing);
  const track = thinned(pointsOf(segments)).flatMap(([x, y]) => [
    round(w * SIDE + x),
    round(h * DRAWING_TOP + y),
  ]);
  // The same fit, in points of the map, so the map lies under the line.
  const map =
    palette !== null && look.map
      ? videoMap(
          whole,
          {
            left: (w * SIDE) / MAP_PIXEL_RATIO,
            top: (h * DRAWING_TOP) / MAP_PIXEL_RATIO,
            width: boxWidth / MAP_PIXEL_RATIO,
            height: boxHeight / MAP_PIXEL_RATIO,
            pad: line / MAP_PIXEL_RATIO,
          },
          bearing,
          palette,
          language,
          look.relief ? { line: thinnedTrack(whole) } : null,
        )
      : null;

  const results = resultsShown(run, shown);
  const labelHeight = w * look.label.size * look.label.lineHeight;
  const valueHeight = w * look.value.size * look.value.lineHeight;
  const rows = Math.ceil(results.length / 2);
  const resultsHeight =
    rows * (labelHeight + valueHeight) + Math.max(0, rows - 1) * w * look.rowGap;
  const resultsTop = h * (1 - look.resultsBottom) - resultsHeight;
  const columnWidth = (w * (1 - 2 * SIDE)) / 2;
  const placed = results.map((result, i) => ({
    result,
    x: w * SIDE + (i % 2) * columnWidth,
    y: resultsTop + Math.floor(i / 2) * (labelHeight + valueHeight + w * look.rowGap),
  }));

  // The ending's large heart, on its square in the middle (TASK-408).
  const cardSide = w * HEART_CARD;
  const cardWidth = cardSide * HEART_SHARE;
  const cardScale = cardWidth / HEART_BOX.width;
  const cardLeft = w / 2 - cardWidth / 2;
  const cardTop = h * HEART_CARD_MIDDLE - heartHeight(cardWidth) / 2;
  const cardPath = HEART_POINTS.flatMap(([x, y]) => [
    round(cardLeft + x * cardScale),
    round(cardTop + y * cardScale),
  ]);

  return {
    badge,
    corner,
    heart,
    heartCard: {
      x: w / 2,
      y: h * HEART_CARD_MIDDLE,
      side: cardSide,
      path: cardPath,
      length: lengthOf(cardPath),
      dot: {
        x: cardPath[0],
        y: cardPath[1],
        r: (cardSide * HEART_DOT_SHARE) / 2,
        ring: cardSide * HEART_RING_SHARE,
      },
    },
    heartLength: lengthOf(heart),
    heartLine: badge * HEART_LINE_SHARE,
    heartDot: {
      x: heart[0],
      y: heart[1],
      r: (badge * HEART_DOT_SHARE) / 2,
      ring: badge * HEART_RING_SHARE,
    },
    track,
    trackLength: lengthOf(track),
    line,
    map,
    placed,
    labelHeight,
    columnWidth,
  };
}

type Layout = ReturnType<typeof layoutOf>;

function text(
  words: string,
  x: number,
  y: number,
  style: TextStyle,
  colorRole: ColorRole,
  maxWidth: number,
  alpha: number,
  align: "left" | "center" = "left",
  lines = 1,
): VideoOp {
  const w = VIDEO_WIDTH;
  return {
    k: "text",
    text: words,
    x: round(x),
    y: round(y),
    size: round(w * style.size),
    weight: style.weight,
    tracking: round(w * style.tracking),
    color: colorRole,
    align,
    maxWidth: round(maxWidth),
    lines,
    alpha: round3(alpha),
  };
}

/** The brand's name next to the heart: bold in every look. */
const NAME_STYLE: TextStyle = {
  size: NAME,
  weight: 700,
  tracking: 0,
  lineHeight: LINE_HEIGHT,
};
/** The credit's line, small and faint. */
const CREDIT_STYLE: TextStyle = {
  size: CREDIT,
  weight: 400,
  tracking: 0,
  lineHeight: LINE_HEIGHT,
};

/** When the scenes play (TASK-408, part C2): the opening, the route with
 * the second its line starts drawing, and the ending, each null when off;
 * what the opening and the ending show. */
type Plan = {
  opening: SceneWindow | null;
  route: (SceneWindow & { drawFrom: number }) | null;
  ending: SceneWindow | null;
  kind: Opening;
  cut: Cut;
  endKind: Ending;
  /** On «3D», the map seen from straight above for the opening's drawing,
   * or for the whole video with «Line in 2D» (`flatAll`, part C2b). */
  flat: boolean;
  flatAll: boolean;
  /** «Camera behind» on «3D»: the run on its plane, and the zoom of the
   * whole drawing the camera comes closer from; null otherwise. */
  chase: Plane | null;
  fitZoom: number;
};

function planOf(scenes: SceneChoice, relief: boolean, map: VideoMap | null): Plan {
  let windows = sceneWindows(scenes.order, scenes.off, VIDEO_SECONDS);
  if (windows.length === 0) {
    windows = sceneWindows(SCENES, ["opening"], VIDEO_SECONDS);
  }
  const of = (name: SceneName) => windows.find((w) => w.scene === name) ?? null;
  const route = of("route");
  const opening = of("opening");
  const flatAll = relief && route !== null && scenes.camera === "line";
  return {
    opening,
    route:
      route === null
        ? null
        : { ...route, drawFrom: route.from + (route.from === 0 ? INTRO_S : LEAD_S) },
    ending: of("ending"),
    kind: scenes.opening,
    cut: scenes.cut,
    endKind: scenes.ending,
    flat: relief && ((opening !== null && scenes.opening === "drawing") || flatAll),
    flatAll,
    chase:
      relief &&
      route !== null &&
      scenes.camera === "behind" &&
      map !== null &&
      map.line.length >= 2
        ? planeOf(map.line.map(([lon, lat]): LatLon => [lat, lon]))
        : null,
    fitZoom: map?.camera.zoom ?? 0,
  };
}

/** How much of what follows the opening shows at `t`: all of it outside
 * the opening; inside, nothing, or coming in over its last half second
 * with «Fade» when a scene comes after it. */
function afterOpening(t: number, plan: Plan): number {
  const o = plan.opening;
  if (o === null || t < o.from || t >= o.to) {
    return 1;
  }
  return plan.cut === "fade" && o.to < VIDEO_SECONDS ? ramp(t, o.to - FADE_S, o.to) : 0;
}

/** How much of the opening shows at `t`. */
function openingShown(t: number, plan: Plan): number {
  const o = plan.opening;
  return o === null || t < o.from || t >= o.to ? 0 : 1 - afterOpening(t, plan);
}

/** How much of its line the run has drawn at `t`: drawing itself in the
 * route, whole in the ending and after the route. */
function drawnShare(t: number, plan: Plan): number {
  const { route, ending } = plan;
  if (ending !== null && t >= ending.from && t < ending.to) {
    return 1;
  }
  if (route === null) {
    return ending !== null && t >= ending.from ? 1 : 0;
  }
  return easeInOut(ramp(t, route.drawFrom, route.to));
}

/** When the line has drawn `share` of itself in `route`, in seconds: the
 * inverse of its slow-at-both-ends draw. */
function drawnAt(route: { drawFrom: number; to: number }, share: number): number {
  return (
    route.drawFrom + ((route.to - route.drawFrom) * Math.acos(1 - 2 * share)) / Math.PI
  );
}

/** «Camera behind» at `t`: the camera behind the animal, and how far the
 * page's camera has come down to it from the whole drawing, over the
 * route's first second; back up over the second after it. Nothing when
 * the camera is not behind the animal, or still on the whole drawing. */
function chaseAt(t: number, plan: Plan): { chase?: ChaseCamera; u?: number } {
  const { chase, route } = plan;
  if (chase === null || route === null) {
    return {};
  }
  const u =
    easeInOut(ramp(t, route.from, route.from + SWOOP_S)) *
    (1 - easeInOut(ramp(t, route.to, route.to + SWOOP_S)));
  if (u <= 0) {
    return {};
  }
  const camera = chaseCamera(
    chase,
    t < route.to ? drawnShare(t, plan) : 1,
    plan.fitZoom,
  );
  return {
    chase: {
      center: [round6(camera.center[0]), round6(camera.center[1])],
      bearing: round3(camera.bearing),
      zoom: round3(camera.zoom),
      pitch: camera.pitch,
    },
    u: round3(u),
  };
}

/** How high the runner's image is, `seconds` into its run, for an animal
 * `length` pixels long: a hop up and back down, again and again, starting
 * on the ground (TASK-417). */
export function imageHop(seconds: number, length: number): number {
  return (
    length *
    IMAGE_HOP *
    Math.abs(Math.sin(Math.PI * IMAGE_HOPS_PER_S * Math.max(0, seconds)))
  );
}

/** What the picture at `t` seconds shows. */
function frameAt(
  t: number,
  run: PostRun,
  stickers: readonly Sticker[],
  layout: Layout,
  look: Look,
  language: string,
  options: SceneOptions,
  plan: Plan,
): VideoOp[] {
  const character = options.character ?? null;
  const w = VIDEO_WIDTH;
  const h = VIDEO_HEIGHT;
  const ops: VideoOp[] = [];
  const { route, ending } = plan;
  // What follows the opening, and the opening, at this picture.
  const main = afterOpening(t, plan);
  const opening = openingShown(t, plan);
  // The seconds the ending's things come in from: the ending's own, or the
  // video's last, with the ending off.
  const endFrom = ending !== null ? ending.from : VIDEO_SECONDS - LAST_S;
  // The ending's things go once it is over, when another scene follows.
  const endOut =
    ending !== null && ending.to < VIDEO_SECONDS
      ? 1 - ramp(t, ending.to, ending.to + 0.3)
      : 1;

  // The map comes in with the logo, and the dark under the words with it.
  const ground = round3(ramp(t, 0, 0.5));
  if (layout.map !== null) {
    if (plan.flatAll) {
      // «Line in 2D» on «3D»: the map from straight above all along.
      ops.push({ k: "map", alpha: ground, flat: true });
    } else if (look.relief) {
      // The camera's turn, or the picture's zoom, slow at both ends.
      const u = easeInOut(ramp(t, 0, VIDEO_SECONDS));
      ops.push({
        k: "map",
        alpha: ground,
        turn: round3(-TURN_DEG + 2 * TURN_DEG * u),
        zoom: round3(1 + (STILL_ZOOM - 1) * u),
        ...chaseAt(t, plan),
      });
      // The map from straight above under the opening's drawing.
      if (plan.flat && opening > 0) {
        ops.push({ k: "map", alpha: round3(ground * opening), flat: true });
      }
    } else {
      ops.push({ k: "map", alpha: ground });
    }
  }

  if (opening > 0 && plan.opening !== null) {
    ops.push(...openingOps(t, run, layout, look, plan.opening, plan.kind, opening));
  }

  const brand = round3(ramp(t, 0, 0.5));
  if (look.badge) {
    ops.push({
      k: "rect",
      x: round(layout.corner),
      y: round(layout.corner),
      w: round(layout.badge),
      h: round(layout.badge),
      r: round(layout.badge * BADGE_CORNER_SHARE),
      color: "accent",
      alpha: brand,
    });
  }
  ops.push(
    {
      k: "line",
      path: HEART_PATH,
      upTo: round(layout.heartLength),
      width: round(layout.heartLine),
      color: "onAccent",
      alpha: brand,
    },
    {
      k: "dot",
      ...layout.heartDot,
      r: round(layout.heartDot.r),
      ring: round(layout.heartDot.ring),
      fill: "dot",
      ringColor: "onAccent",
      alpha: brand,
    },
    text(
      "MuW",
      layout.corner + layout.badge + w * BRAND_GAP,
      layout.corner + (layout.badge - w * NAME * LINE_HEIGHT) / 2,
      NAME_STYLE,
      "ink",
      w / 2,
      brand,
    ),
  );
  if (run.title !== null) {
    // The title at the top, out of the way of the opening's own title.
    const titled = plan.opening !== null && plan.kind === "title" ? main : 1;
    ops.push(
      text(
        run.title,
        w / 2,
        h * TITLE_TOP,
        look.title,
        "ink",
        w * (1 - 2 * SIDE),
        ramp(t, 0.2, 0.8) * titled,
        "center",
        2,
      ),
    );
  }

  const share = drawnShare(t, plan);
  if (layout.trackLength > 0 && share > 0 && main > 0) {
    const upTo = layout.trackLength * share;
    if (look.casing !== null) {
      ops.push({
        k: "line",
        path: RUN_PATH,
        upTo: round(upTo),
        width: round(layout.line + w * look.casing.extra),
        color: "onAccent",
        alpha: round3(look.casing.alpha * main),
      });
    }
    ops.push({
      k: "line",
      path: RUN_PATH,
      upTo: round(upTo),
      width: round(layout.line),
      color: look.line.color,
      alpha: round3(main),
      ...(look.relief ? { share: round3(share) } : {}),
    });
    // The pen's tip while the route draws, gone once the drawing is whole.
    const tip =
      route !== null && t >= route.from ? 1 - ramp(t, route.to, route.to + 0.3) : 0;
    if (tip > 0) {
      const [x, y] = pointAlong(layout.track, upTo);
      ops.push({
        k: "dot",
        x: round(x),
        y: round(y),
        r: round(layout.line * 1.3),
        ring: round(layout.line * 0.5),
        fill: "line",
        ringColor: "onAccent",
        alpha: round3(tip * main),
        ...(look.relief ? { path: RUN_PATH, share: round3(share) } : {}),
      });
    }
    // The emoji of the way, popping as the line reaches each (TASK-408),
    // under the animal that passes over them; at the ending's start when
    // the route is off.
    if (options.along) {
      for (let i = 1; i <= ALONG_COUNT; i += 1) {
        const at = i / (ALONG_COUNT + 1);
        const from =
          route !== null ? drawnAt(route, at) : endFrom + 0.1 + (i - 1) * EMOJI_STEP_S;
        const pop = ramp(t, from, from + EMOJI_POP_S);
        if (pop > 0) {
          const [x, y] = pointAlong(layout.track, layout.trackLength * at);
          ops.push({
            k: "emoji",
            text: options.along,
            x: round(x),
            y: round(y),
            size: round(w * ALONG_EMOJI),
            scale: round3(easeOutBack(pop)),
            alpha: round3(Math.min(1, pop * 2) * main),
            ...(look.relief ? { path: RUN_PATH, share: round3(at) } : {}),
          });
        }
      }
    }
    // The animal over the tip, galloping while the route draws, then at
    // rest at the end of the line.
    if (character !== null) {
      const running = route !== null && t >= route.from && t < route.to;
      const restFrom = route !== null && t >= route.to ? route.to : endFrom;
      ops.push({
        k: "character",
        path: RUN_PATH,
        upTo: round(upTo),
        size: round(w * CHARACTER),
        tilt: look.relief
          ? 90 - (plan.chase !== null ? CHASE_PITCH : PITCH_3D)
          : CHARACTER_TILT,
        clip: running ? "run" : "rest",
        time: round3(running && route !== null ? t - route.drawFrom : t - restFrom),
        alpha: round3(main),
        ...(look.relief ? { share: round3(share) } : {}),
        ...(character === "my_image"
          ? {
              hop: round(
                running && route !== null
                  ? imageHop(t - route.drawFrom, w * CHARACTER)
                  : 0,
              ),
            }
          : {}),
      });
    }
  }

  if (look.scrim) {
    ops.push({
      k: "scrim",
      top: round(h * SCRIM_TOP),
      peak: look.scrimPeak,
      alpha: round3(ground * main),
    });
  }

  // The numbers come in with the route or the ending, whichever is first;
  // the big numbers of the ending take their place.
  const shownFrom = Math.min(route?.from ?? Infinity, ending?.from ?? Infinity);
  const big =
    ending !== null && plan.endKind === "numbers"
      ? ramp(t, ending.from, ending.from + 0.5) * endOut
      : 0;
  const numbers = ramp(t, shownFrom + 0.6, shownFrom + 1) * main * (1 - big);
  for (const { result, x, y } of layout.placed) {
    const value = valueAt(run, result, share);
    const name = resultName(result);
    ops.push(
      text(
        look.label.upper ? name.toLocaleUpperCase(language) : name,
        x,
        y,
        look.label,
        look.label.color,
        layout.columnWidth,
        numbers,
      ),
    );
    if (value !== null) {
      ops.push(
        text(
          value,
          x,
          y + layout.labelHeight,
          look.value,
          "ink",
          layout.columnWidth,
          numbers,
        ),
      );
    }
  }

  if (ending !== null && t >= ending.from) {
    if (big > 0) {
      ops.push(...bigNumbersOps(run, layout, look, language, big * main));
    }
    if (plan.endKind === "heart" || plan.endKind === "all") {
      const from =
        plan.endKind === "heart"
          ? ending.from + 0.2
          : ending.from + (ending.to - ending.from) * ALL_HEART_FROM;
      ops.push(...heartCardOps(t, layout, from, endOut * main));
    }
  }

  if (look.credit !== null) {
    ops.push(
      text(
        look.credit,
        w / 2,
        h * (1 - CREDIT_BOTTOM) - w * CREDIT * LINE_HEIGHT,
        CREDIT_STYLE,
        "faint",
        w * (1 - 2 * SIDE),
        ramp(t, 0.6, 1),
        "center",
      ),
    );
  }

  stickers.forEach((sticker, i) => {
    const pop = ramp(
      t,
      endFrom + 0.2 + i * EMOJI_STEP_S,
      endFrom + 0.2 + i * EMOJI_STEP_S + EMOJI_POP_S,
    );
    if (pop > 0 && main > 0) {
      ops.push({
        k: "emoji",
        text: sticker.emoji,
        x: round(sticker.x * w),
        y: round(sticker.y * h),
        size: round(w * EMOJI),
        scale: round3(easeOutBack(pop)),
        alpha: round3(Math.min(1, pop * 2) * main),
      });
    }
  });
  // The emoji of the end, bursting around the whole drawing (TASK-408).
  if (options.end) {
    END_SPOTS.forEach(([x, y], i) => {
      const from = endFrom + 0.1 + i * END_STEP_S;
      const pop = ramp(t, from, from + EMOJI_POP_S);
      const alpha = Math.min(1, pop * 2) * endOut * main;
      if (pop > 0 && alpha > 0) {
        ops.push({
          k: "emoji",
          text: options.end as string,
          x: round(x * w),
          y: round(y * h),
          size: round(w * END_EMOJI),
          scale: round3(easeOutBack(pop)),
          alpha: round3(alpha),
        });
      }
    });
  }
  return ops;
}

/** The opening at `t`, `shown` that much: the line drawing itself from
 * above, on the flat map, or the run's title large in the middle. */
function openingOps(
  t: number,
  run: PostRun,
  layout: Layout,
  look: Look,
  window: SceneWindow,
  kind: Opening,
  shown: number,
): VideoOp[] {
  const w = VIDEO_WIDTH;
  const h = VIDEO_HEIGHT;
  if (kind === "title") {
    return [
      text(
        run.title ?? "MuW",
        w / 2,
        h * BIG_TITLE_TOP,
        { ...look.title, size: look.title.size * BIG_TITLE },
        "ink",
        w * (1 - 2 * SIDE),
        ramp(t, window.from + 0.1, window.from + 0.6) * shown,
        "center",
        3,
      ),
    ];
  }
  const share = easeInOut(
    ramp(
      t,
      window.from + LEAD_S,
      Math.max(window.from + LEAD_S + 0.5, window.to - HOLD_S),
    ),
  );
  if (layout.trackLength <= 0 || share <= 0) {
    return [];
  }
  const upTo = layout.trackLength * share;
  const ops: VideoOp[] = [];
  if (look.casing !== null) {
    ops.push({
      k: "line",
      path: RUN_PATH,
      upTo: round(upTo),
      width: round(layout.line + w * look.casing.extra),
      color: "onAccent",
      alpha: round3(look.casing.alpha * shown),
    });
  }
  ops.push({
    k: "line",
    path: RUN_PATH,
    upTo: round(upTo),
    width: round(layout.line),
    color: look.line.color,
    alpha: round3(shown),
  });
  if (share < 1) {
    const [x, y] = pointAlong(layout.track, upTo);
    ops.push({
      k: "dot",
      x: round(x),
      y: round(y),
      r: round(layout.line * 1.3),
      ring: round(layout.line * 0.5),
      fill: "line",
      ringColor: "onAccent",
      alpha: round3(shown),
    });
  }
  return ops;
}

/** The ending's «Numbers»: the results large, one under the other in the
 * middle, over a veil of the look's ground. */
function bigNumbersOps(
  run: PostRun,
  layout: Layout,
  look: Look,
  language: string,
  alpha: number,
): VideoOp[] {
  const w = VIDEO_WIDTH;
  const h = VIDEO_HEIGHT;
  const value = { ...look.value, size: look.value.size * BIG_NUMBERS };
  const row = layout.labelHeight + w * value.size * value.lineHeight + w * look.rowGap;
  const ops: VideoOp[] = [veil(alpha)];
  layout.placed.forEach(({ result }, i) => {
    const y = h * BIG_NUMBERS_TOP + i * row;
    const name = resultName(result);
    ops.push(
      text(
        look.label.upper ? name.toLocaleUpperCase(language) : name,
        w / 2,
        y,
        look.label,
        look.label.color,
        w * (1 - 2 * SIDE),
        alpha,
        "center",
      ),
    );
    const shown = valueAt(run, result, 1);
    if (shown !== null) {
      ops.push(
        text(
          shown,
          w / 2,
          y + layout.labelHeight,
          value,
          "ink",
          w * (1 - 2 * SIDE),
          alpha,
          "center",
        ),
      );
    }
  });
  return ops;
}

/** The ending's heart: the yellow square of MuW popping in the middle over
 * a veil, the heart drawing itself on it, the name under it, from `from`
 * seconds. */
function heartCardOps(t: number, layout: Layout, from: number, out: number): VideoOp[] {
  const w = VIDEO_WIDTH;
  const shown = ramp(t, from, from + 0.4) * out;
  if (shown <= 0) {
    return [];
  }
  const card = layout.heartCard;
  const side = card.side * easeOutBack(ramp(t, from, from + 0.5));
  const drawn = easeInOut(ramp(t, from + 0.3, from + 1));
  const ops: VideoOp[] = [
    veil(shown),
    {
      k: "rect",
      x: round(card.x - side / 2),
      y: round(card.y - side / 2),
      w: round(side),
      h: round(side),
      r: round(side * BADGE_CORNER_SHARE),
      color: "accent",
      alpha: round3(shown),
    },
  ];
  if (drawn > 0) {
    ops.push(
      {
        k: "line",
        path: BIG_HEART_PATH,
        upTo: round(card.length * drawn),
        width: round(card.side * HEART_LINE_SHARE),
        color: "onAccent",
        alpha: round3(shown),
      },
      {
        k: "dot",
        ...card.dot,
        r: round(card.dot.r),
        ring: round(card.dot.ring),
        fill: "dot",
        ringColor: "onAccent",
        alpha: round3(shown),
      },
    );
  }
  ops.push(
    text(
      "MuW",
      card.x,
      card.y + card.side / 2 + w * BRAND_GAP * 2,
      { ...NAME_STYLE, size: NAME * BIG_NAME },
      "ink",
      w / 2,
      ramp(t, from + 0.6, from + 1) * out,
      "center",
    ),
  );
  return ops;
}

/** The look's own ground over the whole picture, `alpha` of `VEIL`. */
function veil(alpha: number): VideoOp {
  return {
    k: "rect",
    x: 0,
    y: 0,
    w: VIDEO_WIDTH,
    h: VIDEO_HEIGHT,
    r: 0,
    color: "paper",
    alpha: round3(VEIL * alpha),
  };
}

/** What «Edit video» chose for the scenes (TASK-408, part C2). */
export type SceneChoice = Pick<
  VideoEdit,
  "order" | "off" | "opening" | "cut" | "camera" | "ending"
>;

/** What «Edit video» adds to the post's video (TASK-408): the animal, the
 * line's colour on the map looks, the emoji of the way and of the end, and
 * the scenes, each as the post opens when not given. */
export type SceneOptions = Partial<SceneChoice> & {
  character?: Actor | null;
  line?: LineColour;
  along?: string | null;
  end?: string | null;
};

/** The scenes in `options`, as the post opens where not given. */
function scenesOf(options: SceneOptions): SceneChoice {
  return {
    order: options.order ?? FIRST_EDIT.order,
    off: options.off ?? FIRST_EDIT.off,
    opening: options.opening ?? FIRST_EDIT.opening,
    cut: options.cut ?? FIRST_EDIT.cut,
    camera: options.camera ?? FIRST_EDIT.camera,
    ending: options.ending ?? FIRST_EDIT.ending,
  };
}

/**
 * The video of `run`'s post as it is now, in `look`: the results on in
 * `shown`, the emoji where the runner put them, and what «Edit video» chose
 * in `options` (TASK-408): the animal running the line, the line's colour,
 * the emoji of the way and of the end, the scenes and their order.
 */
export function videoScene(
  run: PostRun,
  shown: readonly PostResult[],
  stickers: readonly Sticker[],
  look: VideoLook,
  options: SceneOptions = {},
): VideoScene {
  const palette = look === "paper" ? null : stylePalette(look);
  const spec =
    look === "paper" || palette === null
      ? PAPER
      : mapLook(
          palette,
          look === "day",
          styleRelief(look),
          options.line ?? "yellow",
          styleMap(look),
        );
  const language = appLanguage();
  const layout = layoutOf(run, shown, spec, palette, language);
  const plan = planOf(scenesOf(options), spec.relief, layout.map);
  // «Line in 2D» on «3D»: drawn as on a flat map, over its picture from
  // straight above.
  const drawn = plan.flatAll ? { ...spec, relief: false } : spec;
  const hearted =
    plan.ending !== null && (plan.endKind === "heart" || plan.endKind === "all");
  const count = VIDEO_SECONDS * VIDEO_FPS;
  return {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    fps: VIDEO_FPS,
    look,
    colors: spec.colors,
    map:
      layout.map === null
        ? null
        : {
            ...layout.map,
            ...(plan.flat ? { flat: true } : {}),
            ...(plan.chase !== null
              ? { chase: { cameras: chaseSamples(plan.chase, plan.fitZoom) } }
              : {}),
          },
    paths: hearted
      ? [layout.heart, layout.track, layout.heartCard.path]
      : [layout.heart, layout.track],
    character: options.character ?? null,
    frames: Array.from({ length: count }, (_, i) =>
      frameAt(i / VIDEO_FPS, run, stickers, layout, drawn, language, options, plan),
    ),
  };
}

/** The note's letters and its room from the bottom edge, as shares. */
const NOTE = 0.02;
const NOTE_BOTTOM = 0.008;

/**
 * The scene with `note` written small at the foot of every picture, in
 * the ink of the look: what the page said when the map did not come,
 * while the cause on the phone is looked for (TASK-351, 2026-11-04; to be
 * taken out once found).
 */
export function withNote(scene: VideoScene, note: string): VideoScene {
  const w = scene.width;
  const h = scene.height;
  const op: VideoOp = {
    k: "text",
    text: note,
    x: round(w / 2),
    y: round(h * (1 - NOTE_BOTTOM) - w * NOTE * LINE_HEIGHT),
    size: round(w * NOTE),
    weight: 400,
    tracking: 0,
    color: "ink",
    align: "center",
    maxWidth: round(w * (1 - 2 * SIDE)),
    lines: 1,
    alpha: 1,
  };
  return { ...scene, frames: scene.frames.map((frame) => [...frame, op]) };
}
