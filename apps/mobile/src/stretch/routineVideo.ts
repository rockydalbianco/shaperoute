import { t } from "../i18n";
import { HEART_BOX, HEART_POINTS, heartHeight } from "../intro/heartLine";
import {
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type ColorRole,
  type VideoOp,
  type VideoScene,
} from "../share/videoScene";
import { color } from "../theme/tokens";
import { isMove } from "./allExercises";
import type { Exercise } from "./exercises";
import {
  type Breath,
  deepen,
  drift,
  grounding,
  LENGTH,
  type Pose,
  type Segment,
  STAND,
} from "./poses";
import {
  deepenFront,
  FRONT_LENGTH,
  FRONT_SEGMENTS,
  FRONT_STAND,
  type FrontBreath,
  frontBones,
  frontDrift,
  frontGrounding,
  type FrontPose,
  type FrontSegment,
  frontSway,
  HIP_HALF,
} from "./posesFront";

/**
 * The video of a stretching routine (TASK-520 part F, ADR-0415), as what to
 * draw in each of its pictures: the routine's name and its minutes, then
 * the figure doing each exercise for a few seconds with its name and its
 * time, then the logo. A vertical video to share from the phone's sheet,
 * never published in the Feed.
 *
 * It is a `VideoScene` as a run's video is (`share/videoScene.ts`), made
 * only of what the hidden page already draws (`share/videoPage.ts`): lines,
 * dots, squares and words. So the page is not touched, nothing native and
 * no library is added, and what the video shows is decided, and tested,
 * here.
 *
 * The figure is not the app's one of turned Views (`Figure.tsx`,
 * `FigureFront.tsx`): a page has no Views. It is drawn again from the same
 * numbers: where each segment points (`poses.ts`, `posesFront.ts`), how
 * long it is, how far the hip is above the floor, how far the pose slides
 * to stay whole. A limb is one line through its joints, round at its ends
 * and where it bends; the head is a dot.
 */

/** The file the video is written to, in the cache folder. */
export const ROUTINE_VIDEO_FILE = "MuW-stretching.mp4";

/** The title's time, and the logo's, in seconds. */
export const INTRO_S = 2;
export const OUTRO_S = 2.2;
/** The longest an exercise is shown, and the shortest, in seconds. */
export const LONGEST_S = 3;
export const SHORTEST_S = 1.5;
/** All the exercises together take no more than this, when they can. */
export const EXERCISES_S = 24;
/** One thing going and the next coming, in seconds. */
const FADE_S = 0.2;

/** A breath while a pose is held, in milliseconds: `Figure`'s. */
const BREATH_MS = 4000;

/** The figure's height and where its floor is, as shares of the height. */
const FIGURE = 0.42;
const FLOOR = 0.69;
/** The bar's width, the far limbs' fade, where the arms hang and how round
 * the head is: `Figure`'s own. */
const LINE_SHARE = 0.034;
const FAR_OPACITY = 0.4;
const SHOULDER_SHARE = 0.9;
const HEAD_SHARE = 1.05;
/** The soft circle behind the figure: its size, of the figure's height, and
 * how much of the group's colour it has. */
const HALO = 0.56;
const HALO_ALPHA = 0.1;

/** Shares of the width, as the run's video has them: the side margin, the
 * logo's square, the brand's name. */
const SIDE = 0.08;
const BADGE = 0.09;
const NAME = 0.05;
const BRAND_GAP = 0.017;
const HEART_SHARE = 0.68;
const HEART_LINE_SHARE = 1 / 16;
const HEART_DOT_SHARE = 1 / 6;
const HEART_RING_SHARE = 1 / 24;
const BADGE_CORNER_SHARE = 0.22;
/** The ending's large logo: its square, of the width, and its middle, of
 * the height. */
const HEART_CARD = 0.34;
const HEART_CARD_MIDDLE = 0.44;
const BIG_NAME = 1.8;
const LINE_HEIGHT = 1.2;

/** The row of bars under the logo, one per exercise: where, how thick, and
 * the gap between two, as shares of the width. */
const BARS_TOP = 0.2;
const BAR = 0.0075;
const BAR_GAP = 0.009;
/** Under the floor: the small line, then the large one, as shares of the
 * height; their letters, of the width. */
const SMALL_TOP = 0.738;
const LARGE_TOP = 0.774;
const SMALL = 0.046;
const LARGE = 0.075;
const TITLE = 0.1;
/** How far the title comes up as it appears, of the width. */
const RISE = 0.04;

/** A line drawn whole: further than any is long. */
const WHOLE = 100_000;

const HEART_PATH = 0;
const BIG_HEART_PATH = 1;

function round(value: number): number {
  return Math.round(value * 10) / 10;
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

/** Past 1 a little, then back: the logo's square pops. */
function easeOutBack(u: number): number {
  const c = 1.70158;
  return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2;
}

/** A routine to make a video of. */
export type RoutineVideo = {
  /** Its name, as its page writes it: «Neck», «Running · After». */
  title: string;
  minutes: number;
  /** In the order they are done, each with its time (`compose`). */
  exercises: readonly Exercise[];
  /** The colour of its group, from the tokens (`color.stretch`). */
  tint: string;
};

/**
 * The exercises the video shows: each one once, in the order it first
 * comes. A routine that goes round twice does the same ones again, and the
 * video is to show what the routine is made of.
 */
export function shownExercises(exercises: readonly Exercise[]): Exercise[] {
  const seen = new Set<string>();
  return exercises.filter((exercise) => {
    if (seen.has(exercise.key)) {
      return false;
    }
    seen.add(exercise.key);
    return true;
  });
}

/**
 * How many pictures each of `count` exercises gets: three seconds, or less
 * when they are many, so that all of them take about `EXERCISES_S`; never
 * less than `SHORTEST_S`.
 */
export function exerciseFrames(count: number): number {
  const seconds = Math.min(
    LONGEST_S,
    Math.max(SHORTEST_S, EXERCISES_S / Math.max(1, count)),
  );
  return Math.round(seconds * VIDEO_FPS);
}

/**
 * How deep the figure is `u` seconds into the `seconds` an exercise is
 * shown, from 0 (the pose) to 1 (the bottom of the breath, or the far end
 * of the movement): there and back a whole number of times, as near its
 * own pace as fits, so every exercise starts and ends in its pose.
 */
export function depthAt(exercise: Exercise, u: number, seconds: number): number {
  const own = isMove(exercise) ? (exercise.tempoMs ?? BREATH_MS) : BREATH_MS;
  const times = Math.max(1, Math.round((seconds * 1000) / own));
  return (1 - Math.cos((2 * Math.PI * times * u) / seconds)) / 2;
}

/** Where the figure stands in the picture, in pixels. */
export type Stage = {
  /** The middle of the picture, across. */
  x: number;
  /** The floor, down. */
  floor: number;
  /** The figure's height. */
  height: number;
};

/** Where the figure of the video stands. */
export const STAGE: Stage = {
  x: VIDEO_WIDTH / 2,
  floor: VIDEO_HEIGHT * FLOOR,
  height: VIDEO_HEIGHT * FIGURE,
};

/** The figure's room, down the picture: from under the bars to the words. */
export const FIGURE_ROOM = {
  top: VIDEO_HEIGHT * BARS_TOP + VIDEO_WIDTH * BAR,
  bottom: VIDEO_HEIGHT * SMALL_TOP,
} as const;

/** One line of the figure, as x0, y0, x1, y1, … in pixels. */
export type FigureLine = { points: number[]; far: boolean };

/** The figure in one picture: its lines, back to front, and its head. */
export type FigureDrawing = {
  lines: FigureLine[];
  head: { x: number; y: number; r: number };
  /** How thick a line is. */
  width: number;
};

type Point = { x: number; y: number };

/** `from`, then `length` along `degrees`: 0 down, 90 forward, y down. */
function step(from: Point, degrees: number, length: number): Point {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: from.x + Math.sin(radians) * length,
    y: from.y + Math.cos(radians) * length,
  };
}

function between(a: number, b: number, u: number): number {
  return a + (b - a) * u;
}

/** The figure seen from the side, `depth` of the way into its breath. */
function sideFigure(
  pose: Pose,
  breath: Breath,
  depth: number,
  stage: Stage,
): FigureDrawing {
  const angle = (segment: Segment) => pose[segment] + depth * (breath[segment] ?? 0);
  const deep = deepen(pose, breath);
  // The hip above the floor, and the slide that keeps a long pose whole:
  // between the two ends of the breath, as `Figure` goes.
  const hipY = -between(grounding(pose), grounding(deep), depth);
  const slide = drift(pose);
  // The figure looks to the left: forward is toward the left edge.
  const place = (point: Point): [number, number] => [
    round(stage.x + (slide - point.x) * stage.height),
    round(stage.floor + (hipY + point.y) * stage.height),
  ];
  const hip = { x: 0, y: 0 };
  const neck = step(hip, angle("torso"), LENGTH.torso);
  const shoulder = step(hip, angle("torso"), LENGTH.torso * SHOULDER_SHARE);
  const chain = (from: Point, segments: readonly Segment[]): number[] => {
    const points = [...place(from)];
    let at = from;
    for (const segment of segments) {
      at = step(at, angle(segment), LENGTH[segment]);
      points.push(...place(at));
    }
    return points;
  };
  const head = LENGTH.head * HEAD_SHARE;
  const [headX, headY] = place(step(neck, angle("head"), (head - LINE_SHARE) / 2));
  return {
    lines: [
      { points: chain(hip, ["thighFar", "shinFar", "footFar"]), far: true },
      { points: [...place(hip), ...place(neck)], far: false },
      { points: chain(shoulder, ["upperArmFar", "forearmFar"]), far: true },
      { points: chain(shoulder, ["upperArmNear", "forearmNear"]), far: false },
      { points: chain(hip, ["thighNear", "shinNear", "footNear"]), far: false },
    ],
    head: { x: headX, y: headY, r: round((head * stage.height) / 2) },
    width: round(LINE_SHARE * stage.height),
  };
}

/** The figure seen from the front, or from above, `depth` into its breath. */
function frontFigure(
  pose: FrontPose,
  breath: FrontBreath,
  depth: number,
  stage: Stage,
): FigureDrawing {
  const deep = deepenFront(pose, breath);
  const part: Partial<Record<FrontSegment, number>> = {};
  for (const segment of FRONT_SEGMENTS) {
    part[segment] = depth * (breath[segment] ?? 0);
  }
  const now = deepenFront(pose, part);
  const bones = frontBones(now);
  const hipY = -between(frontGrounding(pose), frontGrounding(deep), depth);
  const slide = frontDrift(pose) + depth * frontSway(pose, deep);
  const place = (point: Point): [number, number] => [
    round(stage.x + (slide + point.x) * stage.height),
    round(stage.floor + (hipY + point.y) * stage.height),
  ];
  const head = FRONT_LENGTH.head * HEAD_SHARE;
  const radians = (now.head * Math.PI) / 180;
  const along = (head - LINE_SHARE) / 2;
  const [headX, headY] = place({
    x: bones.torso.to.x - Math.sin(radians) * along,
    y: bones.torso.to.y + Math.cos(radians) * along,
  });
  return {
    lines: [
      // Foot, knee, hip, across the hips, hip, knee, foot.
      {
        points: [
          ...place(bones.shinLeft.to),
          ...place(bones.thighLeft.to),
          ...place({ x: -HIP_HALF, y: 0 }),
          ...place({ x: HIP_HALF, y: 0 }),
          ...place(bones.thighRight.to),
          ...place(bones.shinRight.to),
        ],
        far: false,
      },
      { points: [...place(bones.torso.from), ...place(bones.torso.to)], far: false },
      // Hand, elbow, shoulder, across the shoulders, and down the other arm.
      {
        points: [
          ...place(bones.forearmLeft.to),
          ...place(bones.upperArmLeft.to),
          ...place(bones.upperArmLeft.from),
          ...place(bones.upperArmRight.from),
          ...place(bones.upperArmRight.to),
          ...place(bones.forearmRight.to),
        ],
        far: false,
      },
    ],
    head: { x: headX, y: headY, r: round((head * stage.height) / 2) },
    width: round(LINE_SHARE * stage.height),
  };
}

/**
 * The figure doing `exercise`, `depth` of the way into its breath or its
 * movement (0 to 1), standing on `stage`: from the front when the exercise
 * is seen from the front, else from the side.
 */
export function figureAt(
  exercise: Pick<Exercise, "pose" | "breath" | "front" | "frontBreath">,
  depth: number,
  stage: Stage,
): FigureDrawing {
  return exercise.front !== undefined
    ? frontFigure(exercise.front, exercise.frontBreath ?? {}, depth, stage)
    : sideFigure(exercise.pose, exercise.breath ?? {}, depth, stage);
}

/** The figure of the title: standing, seen from the front, both arms and
 * both legs showing. */
export const STANDING = { pose: STAND, front: FRONT_STAND } as const;

/** The lines of a scene, each written once however many pictures use it. */
function book(first: number[][]) {
  const paths = [...first];
  const known = new Map<string, number>();
  return {
    paths,
    of(points: number[]): number {
      const key = points.join(",");
      let at = known.get(key);
      if (at === undefined) {
        at = paths.length;
        paths.push(points);
        known.set(key, at);
      }
      return at;
    },
  };
}

function words(
  text: string,
  y: number,
  size: number,
  weight: number,
  role: ColorRole,
  alpha: number,
  lines = 1,
): VideoOp {
  const w = VIDEO_WIDTH;
  return {
    k: "text",
    text,
    x: w / 2,
    y: round(y),
    size: round(w * size),
    weight,
    tracking: 0,
    color: role,
    align: "center",
    maxWidth: round(w * (1 - 2 * SIDE)),
    lines,
    alpha: round3(alpha),
  };
}

/** The logo's heart `width` wide with its top left corner at `left`, `top`. */
function heartPath(left: number, top: number, width: number): number[] {
  const scale = width / HEART_BOX.width;
  return HEART_POINTS.flatMap(([x, y]) => [
    round(left + x * scale),
    round(top + y * scale),
  ]);
}

function lengthOf(path: readonly number[]): number {
  let length = 0;
  for (let i = 2; i < path.length; i += 2) {
    length += Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
  }
  return length;
}

/** The video of `routine`, picture by picture. */
export function routineVideoScene(routine: RoutineVideo): VideoScene {
  const w = VIDEO_WIDTH;
  const h = VIDEO_HEIGHT;
  const shown = shownExercises(routine.exercises);
  const each = exerciseFrames(shown.length);
  const intro = Math.round(INTRO_S * VIDEO_FPS);
  const outro = Math.round(OUTRO_S * VIDEO_FPS);
  const count = intro + shown.length * each + outro;
  const seconds = each / VIDEO_FPS;
  const endsAt = (intro + shown.length * each) / VIDEO_FPS;
  const stage = STAGE;

  // The logo in the corner, and the large one of the ending.
  const badge = w * BADGE;
  const corner = w * SIDE * 0.6;
  const heartWidth = badge * HEART_SHARE;
  const heart = heartPath(
    corner + (badge - heartWidth) / 2,
    corner + (badge - heartHeight(heartWidth)) / 2,
    heartWidth,
  );
  const card = w * HEART_CARD;
  const cardWidth = card * HEART_SHARE;
  const cardY = h * HEART_CARD_MIDDLE;
  const bigHeart = heartPath(
    w / 2 - cardWidth / 2,
    cardY - heartHeight(cardWidth) / 2,
    cardWidth,
  );
  const bigLength = lengthOf(bigHeart);
  const lines = book([heart, bigHeart]);

  const left = w * SIDE;
  const wide = w * (1 - 2 * SIDE);
  const meta = `${t("Stretching")} · ${t("{minutes} min · {count} exercises", {
    minutes: routine.minutes,
    count: routine.exercises.length,
  })}`;

  const figure = (drawing: FigureDrawing, alpha: number): VideoOp[] => {
    const ops: VideoOp[] = [];
    const add = (line: FigureLine) =>
      ops.push({
        k: "line",
        path: lines.of(line.points),
        upTo: WHOLE,
        width: drawing.width,
        color: "ink",
        alpha: round3(alpha * (line.far ? FAR_OPACITY : 1)),
      });
    // Back to front as `Figure` lays them: the head over the far arm.
    drawing.lines.slice(0, 3).forEach(add);
    ops.push({
      k: "dot",
      x: drawing.head.x,
      y: drawing.head.y,
      r: drawing.head.r,
      fill: "ink",
      ring: 0,
      ringColor: "ink",
      alpha: round3(alpha),
    });
    drawing.lines.slice(3).forEach(add);
    return ops;
  };

  const frameAt = (i: number): VideoOp[] => {
    const time = i / VIDEO_FPS;
    const ops: VideoOp[] = [];
    // What stays from the title to the last exercise: the soft circle, the
    // logo in its corner, the row of bars.
    const kept = ramp(time, 0, 0.3) * (1 - ramp(time, endsAt, endsAt + 0.3));
    if (kept > 0) {
      ops.push(
        {
          k: "dot",
          x: stage.x,
          y: round(stage.floor - stage.height / 2),
          r: round(stage.height * HALO),
          fill: "line",
          ring: 0,
          ringColor: "line",
          alpha: round3(HALO_ALPHA * kept),
        },
        {
          k: "rect",
          x: round(corner),
          y: round(corner),
          w: round(badge),
          h: round(badge),
          r: round(badge * BADGE_CORNER_SHARE),
          color: "accent",
          alpha: round3(kept),
        },
        {
          k: "line",
          path: HEART_PATH,
          upTo: WHOLE,
          width: round(badge * HEART_LINE_SHARE),
          color: "onAccent",
          alpha: round3(kept),
        },
        {
          k: "dot",
          x: heart[0],
          y: heart[1],
          r: round((badge * HEART_DOT_SHARE) / 2),
          fill: "dot",
          ring: round(badge * HEART_RING_SHARE),
          ringColor: "onAccent",
          alpha: round3(kept),
        },
        {
          k: "text",
          text: "MuW",
          x: round(corner + badge + w * BRAND_GAP),
          y: round(corner + (badge - w * NAME * LINE_HEIGHT) / 2),
          size: round(w * NAME),
          weight: 700,
          tracking: 0,
          color: "ink",
          align: "left",
          maxWidth: w / 2,
          lines: 1,
          alpha: round3(kept),
        },
      );
      // The bars: one long one filled as far as the routine has gone, cut
      // where one exercise ends and the next begins.
      const gone = Math.min(1, Math.max(0, (i - intro) / (shown.length * each)));
      const bar = {
        y: round(h * BARS_TOP),
        h: round(w * BAR),
        r: round((w * BAR) / 2),
      };
      ops.push({
        k: "rect",
        x: round(left),
        ...bar,
        w: round(wide),
        color: "faint",
        alpha: round3(kept),
      });
      if (gone > 0) {
        ops.push({
          k: "rect",
          x: round(left),
          ...bar,
          w: round(Math.max(w * BAR, wide * gone)),
          color: "line",
          alpha: round3(kept),
        });
      }
      for (let cut = 1; cut < shown.length; cut += 1) {
        ops.push({
          k: "rect",
          x: round(left + (wide * cut) / shown.length - (w * BAR_GAP) / 2),
          y: bar.y,
          w: round(w * BAR_GAP),
          h: bar.h,
          r: 0,
          color: "paper",
          alpha: 1,
        });
      }
    }

    if (i < intro) {
      // The title: the figure standing, the routine's name and its minutes.
      const there = ramp(time, 0, 0.3) * (1 - ramp(time, INTRO_S - FADE_S, INTRO_S));
      const up = w * RISE * (1 - easeInOut(ramp(time, 0, 0.5)));
      ops.push(
        ...figure(figureAt(STANDING, 0, stage), there),
        words(meta, h * SMALL_TOP + up, SMALL, 600, "line", there),
        words(routine.title, h * LARGE_TOP + up, TITLE, 700, "ink", there, 2),
      );
    } else if (i < intro + shown.length * each) {
      const at = Math.floor((i - intro) / each);
      const exercise = shown[at];
      const u = (i - intro - at * each) / VIDEO_FPS;
      const there = ramp(u, 0, FADE_S) * (1 - ramp(u, seconds - FADE_S, seconds));
      ops.push(
        ...figure(figureAt(exercise, depthAt(exercise, u, seconds), stage), there),
        words(
          exercise.sides
            ? t("{seconds} s each side", { seconds: exercise.seconds })
            : t("{seconds} s", { seconds: exercise.seconds }),
          h * SMALL_TOP,
          SMALL,
          600,
          "line",
          there,
        ),
        words(t(exercise.name), h * LARGE_TOP, LARGE, 700, "ink", there, 2),
      );
    } else {
      // The logo: its square pops, the heart draws itself, the name comes.
      const from = endsAt + 0.2;
      const there = ramp(time, from, from + 0.4);
      const side = card * easeOutBack(ramp(time, from, from + 0.5));
      const drawn = easeInOut(ramp(time, from + 0.3, from + 1));
      if (there > 0) {
        ops.push({
          k: "rect",
          x: round(w / 2 - side / 2),
          y: round(cardY - side / 2),
          w: round(side),
          h: round(side),
          r: round(side * BADGE_CORNER_SHARE),
          color: "accent",
          alpha: round3(there),
        });
      }
      if (drawn > 0) {
        ops.push(
          {
            k: "line",
            path: BIG_HEART_PATH,
            upTo: round(bigLength * drawn),
            width: round(card * HEART_LINE_SHARE),
            color: "onAccent",
            alpha: round3(there),
          },
          {
            k: "dot",
            x: bigHeart[0],
            y: bigHeart[1],
            r: round((card * HEART_DOT_SHARE) / 2),
            fill: "dot",
            ring: round(card * HEART_RING_SHARE),
            ringColor: "onAccent",
            alpha: round3(there),
          },
        );
      }
      ops.push(
        words(
          "MuW",
          cardY + card / 2 + w * BRAND_GAP * 2,
          NAME * BIG_NAME,
          700,
          "ink",
          ramp(time, from + 0.6, from + 1),
        ),
      );
    }
    return ops;
  };

  const frames = Array.from({ length: count }, (_, i) => frameAt(i));
  return {
    width: w,
    height: h,
    fps: VIDEO_FPS,
    look: "paper",
    // The app's own tone, from the tokens: the page, its words, the yellow
    // of the logo; `line` is the colour of the routine's group.
    colors: {
      paper: color.background,
      ink: color.text,
      muted: color.textMuted,
      faint: color.surfaceRaised,
      accent: color.accent,
      onAccent: color.onAccent,
      dot: color.text,
      line: routine.tint,
      scrim: color.scrim,
    },
    map: null,
    paths: lines.paths,
    character: null,
    frames,
  };
}
