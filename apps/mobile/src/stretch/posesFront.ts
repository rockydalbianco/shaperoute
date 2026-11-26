/**
 * The stretching figure seen from the front (TASK-520, ADR-0415), for what
 * the side view does not show: a tilt of the neck, a side bend, the knees
 * falling open. The same person as in `poses.ts`, made of straight
 * segments hanging one from the other, hip first; here both arms and both
 * legs show, a little apart, with the shoulders and the hips as two short
 * bars.
 *
 * A pose gives each segment the direction it points in, in degrees, as it
 * is drawn on the screen: 0 is down, 180 is up, 90 is toward the left of
 * the screen and -90 toward the right (the way a turned View turns). The
 * sides are the screen's, not the person's: `Left` is the limb drawn on
 * the left. Nothing here knows about React Native: `FigureFront.tsx` draws
 * a pose, and the tests check that each pose stands on its feet.
 */

export const FRONT_SEGMENTS = [
  "torso",
  "head",
  "upperArmLeft",
  "forearmLeft",
  "upperArmRight",
  "forearmRight",
  "thighLeft",
  "shinLeft",
  "thighRight",
  "shinRight",
] as const;

export type FrontSegment = (typeof FRONT_SEGMENTS)[number];

/** Where each segment points on the screen: 0 down, 180 up, 90 left. */
export type FrontPose = Readonly<Record<FrontSegment, number>> & {
  /**
   * Seen from above, lying on the floor (a lying twist): the figure is
   * drawn in the middle of its box instead of standing on its lowest point.
   */
  readonly above?: boolean;
};

/** How a front pose goes deeper on a breath, or how far a movement goes. */
export type FrontBreath = Readonly<Partial<Record<FrontSegment, number>>>;

/** Each segment's length, as a share of the figure's height: `poses.ts`'s. */
export const FRONT_LENGTH: Readonly<Record<FrontSegment, number>> = {
  torso: 0.3,
  head: 0.13,
  upperArmLeft: 0.16,
  forearmLeft: 0.15,
  upperArmRight: 0.16,
  forearmRight: 0.15,
  thighLeft: 0.24,
  shinLeft: 0.23,
  thighRight: 0.24,
  shinRight: 0.23,
};

/** The segment each one hangs from; `null` hangs from the hip. */
export const FRONT_PARENT: Readonly<Record<FrontSegment, FrontSegment | null>> = {
  torso: null,
  head: "torso",
  upperArmLeft: "torso",
  forearmLeft: "upperArmLeft",
  upperArmRight: "torso",
  forearmRight: "upperArmRight",
  thighLeft: null,
  shinLeft: "thighLeft",
  thighRight: null,
  shinRight: "thighRight",
};

/** Half the width of the shoulders and of the hips, in shares of the height. */
export const SHOULDER_HALF = 0.075;
export const HIP_HALF = 0.045;
/** The arms hang a little below the neck, as in the side view. */
export const FRONT_SHOULDER_SHARE = 0.9;

/** Which side of the screen a limb is drawn on: -1 left, 1 right, 0 middle. */
export function sideOf(segment: FrontSegment): -1 | 0 | 1 {
  if (segment.endsWith("Left")) {
    return -1;
  }
  return segment.endsWith("Right") ? 1 : 0;
}

/** A point on the screen: the hip's middle at (0, 0), x right, y down, in
 * shares of the figure's height. */
export type FrontPoint = { x: number; y: number };

/** Where a segment starts and ends. */
export type FrontBone = { from: FrontPoint; to: FrontPoint };

/** `(x, y)` of a turned frame, on the screen: a View turned by `degrees`. */
function turned(x: number, y: number, degrees: number): FrontPoint {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: x * Math.cos(radians) - y * Math.sin(radians),
    y: x * Math.sin(radians) + y * Math.cos(radians),
  };
}

function add(a: FrontPoint, b: FrontPoint): FrontPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Every segment's start and end in `pose`, the hip's middle at the origin. */
export function frontBones(pose: FrontPose): Readonly<Record<FrontSegment, FrontBone>> {
  const out: Partial<Record<FrontSegment, FrontBone>> = {};
  const hip = { x: 0, y: 0 };
  for (const segment of FRONT_SEGMENTS) {
    const parent = FRONT_PARENT[segment];
    const side = sideOf(segment);
    let from: FrontPoint;
    if (parent === null) {
      // The torso from the middle of the hips, a thigh from its own side.
      from = add(hip, { x: side * HIP_HALF, y: 0 });
    } else if (parent === "torso" && segment !== "head") {
      // A shoulder: along the torso, then out to its side, turning with it.
      // Upright (180) the torso's own right is the screen's left.
      from = add(
        hip,
        turned(
          -side * SHOULDER_HALF,
          FRONT_LENGTH.torso * FRONT_SHOULDER_SHARE,
          pose.torso,
        ),
      );
    } else {
      from = (out[parent] as FrontBone).to;
    }
    out[segment] = {
      from,
      to: add(from, turned(0, FRONT_LENGTH[segment], pose[segment])),
    };
  }
  return out as Readonly<Record<FrontSegment, FrontBone>>;
}

/** The box the figure fills in `pose`, in shares of the height. */
export function frontBox(pose: FrontPose): {
  left: number;
  right: number;
  top: number;
  bottom: number;
} {
  let left = 0;
  let right = 0;
  let top = 0;
  let bottom = 0;
  for (const bone of Object.values(frontBones(pose))) {
    left = Math.min(left, bone.from.x, bone.to.x);
    right = Math.max(right, bone.from.x, bone.to.x);
    top = Math.min(top, bone.from.y, bone.to.y);
    bottom = Math.max(bottom, bone.from.y, bone.to.y);
  }
  return { left, right, top, bottom };
}

/**
 * How far the hip is above the floor line of the figure's box, in shares
 * of the height. Standing or sitting, the lowest point is on the floor;
 * seen from above, the figure lies in the middle of the box.
 */
export function frontGrounding(pose: FrontPose): number {
  const { top, bottom } = frontBox(pose);
  if (pose.above !== true) {
    return bottom;
  }
  return bottom + Math.max(0, 1 - (bottom - top)) / 2;
}

/** How far a pose may reach to a side and still be whole on a narrow phone. */
export const FRONT_REACH = 0.46;

/** How far the figure slides to stay on the screen: positive, to the right. */
export function frontDrift(pose: FrontPose): number {
  const { left, right } = frontBox(pose);
  return Math.max(0, -left - FRONT_REACH) - Math.max(0, right - FRONT_REACH);
}

/** `pose` at the far end of a breath or of a movement. */
export function deepenFront(pose: FrontPose, breath: FrontBreath): FrontPose {
  const out: Record<FrontSegment, number> & { above?: boolean } = { ...pose };
  for (const segment of FRONT_SEGMENTS) {
    out[segment] = pose[segment] + (breath[segment] ?? 0);
  }
  return out;
}

const TWIN: Readonly<Record<FrontSegment, FrontSegment>> = {
  torso: "torso",
  head: "head",
  upperArmLeft: "upperArmRight",
  forearmLeft: "forearmRight",
  upperArmRight: "upperArmLeft",
  forearmRight: "forearmLeft",
  thighLeft: "thighRight",
  shinLeft: "shinRight",
  thighRight: "thighLeft",
  shinRight: "shinLeft",
};

/** A direction between -180 (left out) and 180: 190 is -170. */
function between(degrees: number): number {
  const turn = ((degrees % 360) + 360) % 360;
  return turn > 180 ? turn - 360 : turn;
}

/** The other side: each limb takes its twin's direction, mirrored. */
export function mirrorFront(pose: FrontPose): FrontPose {
  const out: Record<FrontSegment, number> & { above?: boolean } = { ...pose };
  for (const segment of FRONT_SEGMENTS) {
    out[segment] = between(-pose[TWIN[segment]]);
  }
  return out;
}

/** The other side of a breath: the same moves on the twin limbs, mirrored. */
export function mirrorFrontBreath(breath: FrontBreath): FrontBreath {
  const out: Partial<Record<FrontSegment, number>> = {};
  for (const segment of FRONT_SEGMENTS) {
    const twin = breath[TWIN[segment]];
    if (twin !== undefined) {
      out[segment] = -twin;
    }
  }
  return out;
}

/** Standing, seen from the front, arms by the sides. */
export const FRONT_STAND: FrontPose = {
  torso: 180,
  head: 180,
  upperArmLeft: 4,
  forearmLeft: 0,
  upperArmRight: -4,
  forearmRight: 0,
  thighLeft: 0,
  shinLeft: 0,
  thighRight: 0,
  shinRight: 0,
};
