import type { GymExercise } from "./catalog";

/**
 * How each exercise moves, for the figure beside its name and in its guide
 * (TASK-411 part E, the user's «Omino nell'app» of 2026-11-07): a stick
 * figure drawn by the app, the load in yellow, no picture to download.
 *
 * A move is a few poses the figure goes through and back, in a box of 80 ×
 * 80 with the floor at y = 74; the figure faces right. The 95 exercises
 * share some fifty moves (`MOVE_OF`). The near arm and leg are `elbow`,
 * `hand`, `knee` and `foot`; the far ones end in 2 and are drawn fainter,
 * unless the move is seen from the front.
 */
export type Point = readonly [number, number];

export type Pose = {
  head: Point;
  neck: Point;
  hip: Point;
  elbow: Point;
  hand: Point;
  knee: Point;
  foot: Point;
  toe?: Point;
  elbow2?: Point;
  hand2?: Point;
  knee2?: Point;
  foot2?: Point;
};

export type Joint = keyof Pose;

/** What the hands (or the feet) hold, drawn in yellow. */
export type Load = {
  at: "hand" | "foot";
  kind: "plate" | "dumbbell" | "handle";
};

export type Move = {
  poses: readonly Pose[];
  /** A bench, a bar, a box: lines drawn still, [x1, y1, x2, y2]. */
  props?: readonly (readonly [number, number, number, number])[];
  load?: Load;
  /** Seen from the front: both arms and legs drawn alike. */
  front?: boolean;
  /** One pass through the poses and back to the first. */
  seconds?: number;
  /** Turning at an even pace (pedals, cranks), not easing at each pose. */
  steady?: boolean;
};

/** The box the poses are drawn in. */
export const MOVE_BOX = 80;

/** The length of each bone, in the box's units. */
export const BONES = {
  upperArm: 12,
  forearm: 11,
  thigh: 15,
  shin: 15,
} as const;

/**
 * The joint between `from` and `to` with bones `a` and `b`, on the side
 * `side` of the line from `from` to `to` (+1 left of it on the screen, -1
 * right). Too far apart, the joint sits on the line.
 */
export function bend(
  from: Point,
  to: Point,
  a: number,
  b: number,
  side: 1 | -1,
): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const d = Math.hypot(dx, dy);
  if (d === 0) {
    return [from[0], from[1] + a];
  }
  if (d >= a + b) {
    const k = a / (a + b);
    return [from[0] + dx * k, from[1] + dy * k];
  }
  const along = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(a * a - along * along, 0));
  const ux = dx / d;
  const uy = dy / d;
  return [from[0] + ux * along + side * h * uy, from[1] + uy * along - side * h * ux];
}

/** The knee between the hip and the foot, bent forward (to the right). */
function knee(hip: Point, foot: Point): Point {
  return bend(hip, foot, BONES.thigh, BONES.shin, foot[1] >= hip[1] ? 1 : -1);
}

/** The elbow between the shoulder and the hand, bent backwards or down. */
function elbow(neck: Point, hand: Point, side: 1 | -1 = -1): Point {
  return bend(neck, hand, BONES.upperArm, BONES.forearm, side);
}

/** `pose` moved by (dx, dy). */
function shift(pose: Pose, dx: number, dy: number): Pose {
  const moved: Partial<Record<Joint, Point>> = {};
  for (const joint of Object.keys(pose) as Joint[]) {
    const point = pose[joint];
    if (point !== undefined) {
      moved[joint] = [point[0] + dx, point[1] + dy];
    }
  }
  return moved as Pose;
}

/** Standing up, arms down, facing right. */
const STAND: Pose = {
  head: [40, 13],
  neck: [40, 21],
  hip: [40, 43],
  elbow: [41, 33],
  hand: [42, 44],
  knee: [41, 58],
  foot: [40, 73],
};

/** Standing up a little lower, for the arms to go overhead in the box. */
const LOW_STAND: Pose = {
  head: [40, 17],
  neck: [40, 25],
  hip: [40, 47],
  elbow: [41, 37],
  hand: [42, 48],
  knee: [41, 61],
  foot: [40, 74],
};

/** Lying on a bench, face up, feet on the floor. */
const ON_BENCH = {
  head: [11, 51],
  neck: [19, 52],
  hip: [41, 52],
  knee: [54, 58],
  foot: [58, 73],
} as const;

const BENCH = [
  [6, 57, 52, 57],
  [11, 57, 11, 74],
  [47, 57, 47, 74],
] as const;

/** Sitting on a seat with a back, facing right. */
const SEATED = {
  head: [33, 22],
  neck: [33, 30],
  hip: [34, 52],
  knee: [49, 52],
  foot: [49, 67],
} as const;

const SEAT = [
  [29, 56, 47, 56],
  [29, 56, 27, 26],
  [38, 56, 38, 74],
] as const;

const CROUCH: Pose = {
  head: [60, 40],
  neck: [54, 46],
  hip: [38, 58],
  elbow: [57, 58],
  hand: [58, 69],
  knee: [52, 60],
  foot: [40, 73],
};

/** On the way between a crouch and a plank: the feet going back. */
const FEET_BACK: Pose = {
  head: [67, 46],
  neck: [60, 50],
  hip: [44, 52],
  elbow: [60, 61],
  hand: [60, 71],
  knee: [36, 62],
  foot: [24, 70],
};

const PLANK_UP: Pose = {
  head: [69, 47],
  neck: [62, 51],
  hip: [42, 60],
  elbow: [62, 62],
  hand: [62, 72],
  knee: [28, 66],
  foot: [14, 72],
};

const DEADLIFT_LOW: Pose = {
  head: [63, 41],
  neck: [56, 45],
  hip: [36, 54],
  elbow: [56, 56],
  hand: [56, 67],
  knee: [50, 61],
  foot: [42, 73],
};

const BENT_OVER = {
  head: [61, 35],
  neck: [54, 38],
  hip: [34, 46],
  knee: [44, 59],
  foot: [40, 73],
} as const;

/** The pedals of a bike turn around (42, 66); the far foot is opposite. */
function bikePose(angle: number): Pose {
  const hip: Point = [34, 40];
  const at = (a: number): Point => [42 + 6 * Math.cos(a), 66 + 6 * Math.sin(a)];
  const foot = at(angle);
  const foot2 = at(angle + Math.PI);
  return {
    head: [58, 19],
    neck: [52, 24],
    hip,
    elbow: [56, 34],
    hand: [62, 42],
    knee: knee(hip, foot),
    foot,
    knee2: knee(hip, foot2),
    foot2,
  };
}

/** The hands of the arm ergometer turn around (56, 36). */
function cranePose(angle: number): Pose {
  const neck: Point = [34, 30];
  const at = (a: number): Point => [56 + 6 * Math.cos(a), 36 + 6 * Math.sin(a)];
  const hand = at(angle);
  const hand2 = at(angle + Math.PI);
  return {
    ...SEATED,
    neck,
    head: [35, 22],
    elbow: elbow(neck, hand),
    hand,
    elbow2: elbow(neck, hand2),
    hand2,
  };
}

/** A step of the elliptical, the stepper and the stairs. */
function climbPose(up: "near" | "far"): Pose {
  const hip: Point = [40, 42];
  const neck: Point = [42, 20];
  const high: Point = [44, 62];
  const low: Point = [40, 73];
  const foot = up === "near" ? high : low;
  const foot2 = up === "near" ? low : high;
  const hand: Point = [56, 34];
  return {
    head: [43, 12],
    neck,
    hip,
    elbow: elbow(neck, hand),
    hand,
    knee: knee(hip, foot),
    foot,
    knee2: knee(hip, foot2),
    foot2,
  };
}

/** A stride of the run: the near leg ahead or behind, arms opposite. */
function runPose(ahead: boolean): Pose {
  const front = { knee: [50, 56] as Point, foot: [53, 70] as Point };
  const back = { knee: [34, 57] as Point, foot: [22, 64] as Point };
  const armFront = { elbow: [49, 30] as Point, hand: [57, 24] as Point };
  const armBack = { elbow: [35, 31] as Point, hand: [38, 41] as Point };
  const leg = ahead ? front : back;
  const leg2 = ahead ? back : front;
  const arm = ahead ? armBack : armFront;
  const arm2 = ahead ? armFront : armBack;
  return {
    head: [46, 14],
    neck: [44, 22],
    hip: [40, 44],
    elbow: arm.elbow,
    hand: arm.hand,
    knee: leg.knee,
    foot: leg.foot,
    elbow2: arm2.elbow,
    hand2: arm2.hand,
    knee2: leg2.knee,
    foot2: leg2.foot,
  };
}

/** Walking with a weight in each hand. */
function walkPose(ahead: boolean): Pose {
  const front = { knee: [45, 58] as Point, foot: [48, 73] as Point };
  const back = { knee: [37, 58] as Point, foot: [32, 73] as Point };
  const leg = ahead ? front : back;
  const leg2 = ahead ? back : front;
  return {
    ...STAND,
    knee: leg.knee,
    foot: leg.foot,
    elbow2: [39, 33],
    hand2: [38, 44],
    knee2: leg2.knee,
    foot2: leg2.foot,
  };
}

/** The vertical climber from the front: one hand high, the other low. */
function climberPose(left: boolean): Pose {
  const neck: Point = [40, 22];
  const hip: Point = [40, 44];
  const handL: Point = left ? [30, 4] : [30, 22];
  const handR: Point = left ? [50, 22] : [50, 4];
  const footL: Point = left ? [34, 66] : [34, 73];
  const footR: Point = left ? [46, 73] : [46, 66];
  return {
    head: [40, 14],
    neck,
    hip,
    elbow: bend(neck, handL, 12, 11, 1),
    hand: handL,
    elbow2: bend(neck, handR, 12, 11, -1),
    hand2: handR,
    knee: bend(hip, footL, 15, 15, -1),
    foot: footL,
    knee2: bend(hip, footR, 15, 15, 1),
    foot2: footR,
  };
}

const FRONT_LEGS = {
  knee: [37, 58],
  foot: [36, 73],
  knee2: [43, 58],
  foot2: [44, 73],
} as const;

const CROSSOVER_HIGH = {
  elbow: [29, 15],
  hand: [19, 10],
  elbow2: [51, 15],
  hand2: [61, 10],
} as const;
const CROSSOVER_OUT = {
  elbow: [29, 25],
  hand: [17, 28],
  elbow2: [51, 25],
  hand2: [63, 28],
} as const;
const CROSSOVER_LOW = {
  elbow: [35, 32],
  hand: [38, 43],
  elbow2: [45, 32],
  hand2: [42, 43],
} as const;

const FRONT_SEATED = {
  head: [40, 14],
  neck: [40, 22],
  hip: [40, 44],
} as const;

const PULL_BAR = [[20, 3, 62, 3]] as const;

export const MOVES = {
  bench: {
    poses: [
      { ...ON_BENCH, elbow: [21, 40], hand: [22, 29] },
      { ...ON_BENCH, elbow: [28, 55], hand: [24, 44] },
    ],
    props: BENCH,
    load: { at: "hand", kind: "plate" },
  },
  incline: {
    poses: [
      {
        head: [23, 34],
        neck: [28, 40],
        hip: [44, 56],
        elbow: [30, 28],
        hand: [31, 17],
        knee: [57, 58],
        foot: [60, 73],
      },
      {
        head: [23, 34],
        neck: [28, 40],
        hip: [44, 56],
        elbow: [36, 47],
        hand: [33, 36],
        knee: [57, 58],
        foot: [60, 73],
      },
    ],
    props: [
      [46, 61, 22, 39],
      [46, 61, 58, 61],
      [46, 61, 46, 74],
    ],
    load: { at: "hand", kind: "plate" },
  },
  fly: {
    poses: [
      { ...ON_BENCH, elbow: [21, 40], hand: [22, 29] },
      { ...ON_BENCH, elbow: [22, 46], hand: [27, 50] },
    ],
    props: BENCH,
    load: { at: "hand", kind: "dumbbell" },
  },
  seated_press: {
    poses: [
      { ...SEATED, elbow: [28, 38], hand: [40, 36] },
      { ...SEATED, elbow: [44, 32], hand: [55, 32] },
    ],
    props: SEAT,
    load: { at: "hand", kind: "handle" },
  },
  fly_seated: {
    poses: [
      {
        ...FRONT_SEATED,
        elbow: [28, 24],
        hand: [18, 18],
        elbow2: [52, 24],
        hand2: [62, 18],
        knee: [34, 50],
        foot: [33, 66],
        knee2: [46, 50],
        foot2: [47, 66],
      },
      {
        ...FRONT_SEATED,
        elbow: [31, 30],
        hand: [38, 22],
        elbow2: [49, 30],
        hand2: [42, 22],
        knee: [34, 50],
        foot: [33, 66],
        knee2: [46, 50],
        foot2: [47, 66],
      },
    ],
    front: true,
    load: { at: "hand", kind: "handle" },
  },
  fly_standing: {
    // Up and out, out at the sides, together low, out again: the arms
    // sweep round the shoulders instead of folding through the elbows.
    poses: [
      { ...STAND, ...FRONT_LEGS, ...CROSSOVER_HIGH },
      { ...STAND, ...FRONT_LEGS, ...CROSSOVER_OUT },
      { ...STAND, ...FRONT_LEGS, ...CROSSOVER_LOW },
      { ...STAND, ...FRONT_LEGS, ...CROSSOVER_OUT },
    ],
    front: true,
    load: { at: "hand", kind: "handle" },
    seconds: 3.2,
  },
  push_up: {
    poses: [
      PLANK_UP,
      {
        head: [72, 59],
        neck: [64, 61],
        hip: [43, 66],
        elbow: [56, 64],
        hand: [62, 72],
        knee: [28, 69],
        foot: [14, 72],
      },
    ],
  },
  dips: {
    poses: [
      {
        head: [43, 12],
        neck: [42, 20],
        hip: [42, 42],
        elbow: [43, 30],
        hand: [44, 40],
        knee: [40, 57],
        foot: [30, 63],
      },
      {
        head: [46, 23],
        neck: [44, 31],
        hip: [40, 52],
        elbow: [35, 35],
        hand: [44, 40],
        knee: [38, 66],
        foot: [27, 70],
      },
    ],
    props: [
      [36, 42, 60, 42],
      [56, 42, 56, 74],
    ],
  },
  deadlift: {
    poses: [DEADLIFT_LOW, shift(STAND, 2, 0)],
    load: { at: "hand", kind: "plate" },
  },
  rdl: {
    poses: [
      shift(STAND, 2, 0),
      {
        head: [65, 36],
        neck: [57, 38],
        hip: [36, 44],
        elbow: [57, 50],
        hand: [57, 61],
        knee: [44, 58],
        foot: [42, 73],
      },
    ],
    load: { at: "hand", kind: "plate" },
  },
  pull_up: {
    poses: [
      {
        head: [39, 18],
        neck: [41, 26],
        hip: [41, 48],
        elbow: [44, 15],
        hand: [46, 4],
        knee: [42, 62],
        foot: [34, 72],
      },
      {
        head: [44, 6],
        neck: [42, 14],
        hip: [42, 36],
        elbow: [36, 11],
        hand: [46, 4],
        knee: [44, 50],
        foot: [36, 60],
      },
    ],
    props: PULL_BAR,
  },
  pulldown: {
    poses: [
      {
        ...SEATED,
        head: [38, 24],
        neck: [37, 32],
        hip: [36, 54],
        knee: [51, 55],
        foot: [52, 70],
        elbow: [39, 20],
        hand: [41, 9],
      },
      {
        ...SEATED,
        head: [38, 24],
        neck: [37, 32],
        hip: [36, 54],
        knee: [51, 55],
        foot: [52, 70],
        elbow: [33, 43],
        hand: [44, 35],
      },
    ],
    props: [
      [30, 58, 46, 58],
      [38, 58, 38, 74],
      [20, 9, 60, 9],
    ],
    load: { at: "hand", kind: "handle" },
  },
  straight_pulldown: {
    poses: [
      {
        head: [51, 17],
        neck: [48, 24],
        hip: [40, 44],
        elbow: [58, 17],
        hand: [68, 12],
        knee: [43, 58],
        foot: [44, 73],
      },
      {
        head: [51, 17],
        neck: [48, 24],
        hip: [40, 44],
        elbow: [52, 35],
        hand: [53, 46],
        knee: [43, 58],
        foot: [44, 73],
      },
    ],
    load: { at: "hand", kind: "handle" },
  },
  seated_row: {
    poses: [
      {
        head: [43, 28],
        neck: [40, 36],
        hip: [32, 56],
        elbow: [51, 38],
        hand: [62, 38],
        knee: [46, 50],
        foot: [60, 55],
      },
      {
        head: [32, 26],
        neck: [32, 34],
        hip: [32, 56],
        elbow: [21, 40],
        hand: [32, 44],
        knee: [46, 50],
        foot: [60, 55],
      },
    ],
    props: [
      [22, 60, 44, 60],
      [33, 60, 33, 74],
      [64, 50, 64, 74],
    ],
    load: { at: "hand", kind: "handle" },
  },
  bent_row: {
    poses: [
      { ...BENT_OVER, elbow: [54, 50], hand: [54, 61] },
      { ...BENT_OVER, elbow: [46, 31], hand: [48, 42] },
    ],
    load: { at: "hand", kind: "plate" },
  },
  back_extension: {
    poses: [
      {
        head: [22, 72],
        neck: [26, 65],
        hip: [38, 47],
        elbow: [31, 58],
        hand: [27, 55],
        knee: [50, 57],
        foot: [62, 67],
      },
      {
        head: [13, 31],
        neck: [20, 35],
        hip: [38, 47],
        elbow: [27, 42],
        hand: [21, 37],
        knee: [50, 57],
        foot: [62, 67],
      },
    ],
    props: [
      [32, 51, 44, 57],
      [38, 54, 38, 74],
      [60, 69, 66, 65],
    ],
  },
  squat: {
    poses: [
      {
        head: [40, 12],
        neck: [40, 20],
        hip: [40, 42],
        elbow: [31, 30],
        hand: [33, 25],
        knee: [41, 57],
        foot: [40, 73],
      },
      {
        head: [54, 33],
        neck: [50, 40],
        hip: [37, 58],
        elbow: [40, 49],
        hand: [44, 41],
        knee: [52, 62],
        foot: [40, 73],
      },
    ],
    load: { at: "hand", kind: "plate" },
  },
  leg_press: {
    poses: [
      {
        head: [15, 33],
        neck: [20, 40],
        hip: [34, 58],
        elbow: [28, 50],
        hand: [37, 56],
        knee: [40, 44],
        foot: [54, 47],
      },
      {
        head: [15, 33],
        neck: [20, 40],
        hip: [34, 58],
        elbow: [28, 50],
        hand: [37, 56],
        knee: [46, 47],
        foot: [58, 37],
      },
    ],
    props: [
      [16, 42, 30, 62],
      [30, 62, 44, 62],
      [36, 62, 36, 74],
    ],
    load: { at: "foot", kind: "plate" },
  },
  leg_extension: {
    poses: [
      {
        ...SEATED,
        head: [29, 20],
        neck: [29, 28],
        hip: [30, 50],
        elbow: [30, 40],
        hand: [36, 50],
        knee: [45, 50],
        foot: [46, 65],
      },
      {
        ...SEATED,
        head: [29, 20],
        neck: [29, 28],
        hip: [30, 50],
        elbow: [30, 40],
        hand: [36, 50],
        knee: [45, 50],
        foot: [59, 44],
      },
    ],
    props: [
      [26, 54, 44, 54],
      [26, 54, 24, 28],
      [35, 54, 35, 74],
    ],
    load: { at: "foot", kind: "dumbbell" },
  },
  leg_curl: {
    poses: [
      {
        head: [12, 49],
        neck: [20, 52],
        hip: [42, 52],
        elbow: [24, 58],
        hand: [16, 58],
        knee: [57, 52],
        foot: [71, 54],
      },
      {
        head: [12, 49],
        neck: [20, 52],
        hip: [42, 52],
        elbow: [24, 58],
        hand: [16, 58],
        knee: [57, 52],
        foot: [62, 39],
      },
    ],
    props: [
      [8, 57, 58, 57],
      [14, 57, 14, 74],
      [52, 57, 52, 74],
    ],
    load: { at: "foot", kind: "dumbbell" },
  },
  lunge: {
    poses: [
      {
        head: [42, 13],
        neck: [42, 21],
        hip: [42, 43],
        elbow: [43, 33],
        hand: [44, 44],
        knee: [46, 58],
        foot: [48, 73],
        knee2: [37, 58],
        foot2: [34, 73],
      },
      {
        head: [40, 28],
        neck: [40, 36],
        hip: [40, 58],
        elbow: [41, 48],
        hand: [42, 59],
        knee: [54, 59],
        foot: [52, 73],
        knee2: [34, 71],
        foot2: [20, 72],
      },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  step_up: {
    poses: [
      {
        head: [41, 16],
        neck: [41, 24],
        hip: [40, 46],
        elbow: [42, 35],
        hand: [43, 46],
        knee: [52, 52],
        foot: [56, 65],
        knee2: [39, 59],
        foot2: [38, 73],
      },
      {
        head: [55, 7],
        neck: [55, 15],
        hip: [55, 37],
        elbow: [56, 27],
        hand: [57, 38],
        knee: [57, 51],
        foot: [56, 65],
        knee2: [62, 50],
        foot2: [56, 62],
      },
    ],
    props: [
      [48, 66, 72, 66],
      [48, 66, 48, 74],
      [72, 66, 72, 74],
    ],
  },
  hip_thrust: {
    poses: [
      {
        head: [17, 46],
        neck: [24, 48],
        hip: [40, 62],
        elbow: [32, 58],
        hand: [40, 57],
        knee: [54, 57],
        foot: [56, 72],
      },
      {
        head: [17, 46],
        neck: [24, 48],
        hip: [44, 48],
        elbow: [34, 46],
        hand: [44, 43],
        knee: [56, 56],
        foot: [56, 72],
      },
    ],
    props: [
      [6, 52, 26, 52],
      [16, 52, 16, 74],
    ],
    load: { at: "hand", kind: "plate" },
  },
  kickback: {
    poses: [
      {
        head: [57, 17],
        neck: [53, 24],
        hip: [42, 43],
        elbow: [60, 33],
        hand: [64, 43],
        knee: [46, 57],
        foot: [44, 71],
        knee2: [43, 58],
        foot2: [44, 73],
      },
      {
        head: [57, 17],
        neck: [53, 24],
        hip: [42, 43],
        elbow: [60, 33],
        hand: [64, 43],
        knee: [30, 52],
        foot: [18, 58],
        knee2: [43, 58],
        foot2: [44, 73],
      },
    ],
    props: [[66, 30, 66, 74]],
  },
  abduction: {
    poses: [
      {
        ...FRONT_SEATED,
        elbow: [32, 34],
        hand: [30, 45],
        elbow2: [48, 34],
        hand2: [50, 45],
        knee: [37, 52],
        foot: [37, 67],
        knee2: [43, 52],
        foot2: [43, 67],
      },
      {
        ...FRONT_SEATED,
        elbow: [32, 34],
        hand: [30, 45],
        elbow2: [48, 34],
        hand2: [50, 45],
        knee: [28, 50],
        foot: [24, 65],
        knee2: [52, 50],
        foot2: [56, 65],
      },
    ],
    props: [[26, 48, 54, 48]],
    front: true,
  },
  calf_raise: {
    poses: [
      { ...STAND, toe: [47, 73] },
      { ...shift(STAND, 1, -5), toe: [47, 73] },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  seated_calf: {
    poses: [
      {
        ...SEATED,
        head: [31, 18],
        neck: [31, 26],
        hip: [30, 48],
        elbow: [38, 36],
        hand: [44, 46],
        knee: [45, 48],
        foot: [46, 63],
        toe: [53, 64],
      },
      {
        ...SEATED,
        head: [31, 18],
        neck: [31, 26],
        hip: [30, 48],
        elbow: [38, 32],
        hand: [44, 42],
        knee: [45, 44],
        foot: [47, 59],
        toe: [53, 64],
      },
    ],
    props: [
      [24, 52, 42, 52],
      [33, 52, 33, 74],
      [50, 66, 60, 66],
    ],
    load: { at: "hand", kind: "plate" },
  },
  overhead_press: {
    poses: [
      { ...LOW_STAND, elbow: [46, 36], hand: [49, 27] },
      { ...LOW_STAND, elbow: [44, 15], hand: [46, 5] },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  lateral_raise: {
    poses: [
      {
        ...STAND,
        ...FRONT_LEGS,
        elbow: [34, 32],
        hand: [32, 43],
        elbow2: [46, 32],
        hand2: [48, 43],
      },
      {
        ...STAND,
        ...FRONT_LEGS,
        elbow: [29, 22],
        hand: [18, 22],
        elbow2: [51, 22],
        hand2: [62, 22],
      },
    ],
    front: true,
    load: { at: "hand", kind: "dumbbell" },
  },
  front_raise: {
    poses: [STAND, { ...STAND, elbow: [52, 20], hand: [63, 20] }],
    load: { at: "hand", kind: "dumbbell" },
  },
  rear_fly: {
    poses: [
      { ...BENT_OVER, elbow: [54, 50], hand: [55, 61] },
      { ...BENT_OVER, elbow: [56, 26], hand: [57, 15] },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  face_pull: {
    poses: [
      { ...STAND, elbow: [52, 22], hand: [63, 22] },
      { ...STAND, elbow: [30, 17], hand: [40, 12] },
    ],
    load: { at: "hand", kind: "handle" },
  },
  upright_row: {
    poses: [STAND, { ...STAND, elbow: [34, 22], hand: [46, 29] }],
    load: { at: "hand", kind: "plate" },
  },
  shrug: {
    poses: [STAND, { ...STAND, neck: [40, 18], elbow: [41, 30], hand: [42, 41] }],
    load: { at: "hand", kind: "plate" },
  },
  curl: {
    poses: [STAND, { ...STAND, elbow: [42, 33], hand: [50, 25] }],
    load: { at: "hand", kind: "dumbbell" },
  },
  pushdown: {
    poses: [
      { ...STAND, elbow: [41, 33], hand: [50, 27] },
      { ...STAND, elbow: [41, 33], hand: [43, 44] },
    ],
    load: { at: "hand", kind: "handle" },
  },
  skull_crusher: {
    poses: [
      { ...ON_BENCH, elbow: [21, 40], hand: [22, 29] },
      { ...ON_BENCH, elbow: [21, 40], hand: [11, 37] },
    ],
    props: BENCH,
    load: { at: "hand", kind: "plate" },
  },
  overhead_extension: {
    poses: [
      {
        head: [40, 19],
        neck: [40, 27],
        hip: [40, 48],
        elbow: [42, 15],
        hand: [43, 4],
        knee: [41, 61],
        foot: [40, 74],
      },
      {
        head: [40, 19],
        neck: [40, 27],
        hip: [40, 48],
        elbow: [42, 15],
        hand: [34, 22],
        knee: [41, 61],
        foot: [40, 74],
      },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  wrist_curl: {
    poses: [
      {
        ...SEATED,
        head: [33, 20],
        neck: [32, 28],
        hip: [30, 50],
        elbow: [36, 40],
        hand: [47, 47],
        knee: [45, 50],
        foot: [46, 65],
      },
      {
        ...SEATED,
        head: [33, 20],
        neck: [32, 28],
        hip: [30, 50],
        elbow: [36, 40],
        hand: [47, 42],
        knee: [45, 50],
        foot: [46, 65],
      },
    ],
    props: [
      [26, 54, 44, 54],
      [35, 54, 35, 74],
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  crunch: {
    poses: [
      {
        head: [12, 69],
        neck: [20, 70],
        hip: [42, 70],
        elbow: [18, 61],
        hand: [11, 65],
        knee: [53, 59],
        foot: [60, 72],
      },
      {
        head: [18, 54],
        neck: [24, 60],
        hip: [42, 70],
        elbow: [26, 51],
        hand: [18, 54],
        knee: [53, 59],
        foot: [60, 72],
      },
    ],
    props: [[4, 75, 76, 75]],
  },
  leg_raise: {
    poses: [
      {
        head: [38, 17],
        neck: [41, 24],
        hip: [41, 46],
        elbow: [43, 13],
        hand: [44, 2],
        knee: [41, 60],
        foot: [41, 74],
      },
      {
        head: [38, 17],
        neck: [41, 24],
        hip: [41, 46],
        elbow: [43, 13],
        hand: [44, 2],
        knee: [55, 44],
        foot: [69, 42],
      },
    ],
    props: [[20, 1, 62, 1]],
  },
  russian_twist: {
    poses: [
      {
        head: [36, 28],
        neck: [38, 36],
        hip: [40, 58],
        elbow: [30, 44],
        hand: [24, 51],
        elbow2: [34, 46],
        hand2: [25, 53],
        knee: [34, 49],
        foot: [28, 61],
        knee2: [46, 49],
        foot2: [52, 61],
      },
      {
        head: [44, 28],
        neck: [42, 36],
        hip: [40, 58],
        elbow: [46, 46],
        hand: [55, 53],
        elbow2: [50, 44],
        hand2: [56, 51],
        knee: [34, 49],
        foot: [28, 61],
        knee2: [46, 49],
        foot2: [52, 61],
      },
    ],
    front: true,
    load: { at: "hand", kind: "dumbbell" },
  },
  ab_wheel: {
    poses: [
      {
        head: [45, 34],
        neck: [40, 41],
        hip: [28, 57],
        elbow: [42, 53],
        hand: [43, 64],
        knee: [28, 72],
        foot: [14, 72],
      },
      {
        head: [67, 55],
        neck: [59, 58],
        hip: [41, 63],
        elbow: [70, 58],
        hand: [72, 67],
        knee: [28, 72],
        foot: [14, 72],
      },
    ],
    load: { at: "hand", kind: "plate" },
  },
  plank: {
    poses: [
      {
        head: [69, 56],
        neck: [62, 58],
        hip: [42, 64],
        elbow: [60, 70],
        hand: [71, 71],
        knee: [28, 68],
        foot: [14, 72],
      },
      {
        head: [69, 56],
        neck: [62, 58],
        hip: [42, 62],
        elbow: [60, 70],
        hand: [71, 71],
        knee: [28, 67],
        foot: [14, 72],
      },
    ],
    seconds: 3,
  },
  side_plank: {
    poses: [
      {
        head: [68, 47],
        neck: [62, 52],
        hip: [42, 62],
        elbow: [60, 64],
        hand: [70, 71],
        elbow2: [64, 41],
        hand2: [65, 30],
        knee: [28, 67],
        foot: [14, 72],
      },
      {
        head: [68, 48],
        neck: [62, 53],
        hip: [42, 66],
        elbow: [60, 64],
        hand: [70, 71],
        elbow2: [64, 42],
        hand2: [65, 31],
        knee: [28, 69],
        foot: [14, 72],
      },
    ],
    seconds: 3,
  },
  wall_sit: {
    poses: [
      {
        head: [29, 26],
        neck: [28, 34],
        hip: [28, 56],
        elbow: [33, 44],
        hand: [40, 40],
        knee: [43, 56],
        foot: [44, 72],
      },
      {
        head: [29, 25],
        neck: [28, 33],
        hip: [28, 56],
        elbow: [33, 43],
        hand: [40, 39],
        knee: [43, 56],
        foot: [44, 72],
      },
    ],
    props: [[24, 4, 24, 74]],
    seconds: 3,
  },
  clean: {
    poses: [DEADLIFT_LOW, { ...shift(STAND, 2, 0), elbow: [50, 30], hand: [53, 23] }],
    load: { at: "hand", kind: "plate" },
  },
  snatch: {
    poses: [
      DEADLIFT_LOW,
      { ...shift(LOW_STAND, 2, 0), elbow: [47, 15], hand: [50, 6] },
    ],
    load: { at: "hand", kind: "plate" },
  },
  swing: {
    poses: [
      {
        head: [60, 33],
        neck: [53, 37],
        hip: [34, 47],
        elbow: [50, 48],
        hand: [46, 58],
        knee: [46, 59],
        foot: [42, 73],
      },
      {
        head: [41, 13],
        neck: [41, 21],
        hip: [41, 43],
        elbow: [53, 22],
        hand: [64, 23],
        knee: [42, 58],
        foot: [42, 73],
      },
    ],
    load: { at: "hand", kind: "dumbbell" },
  },
  farmer_carry: {
    poses: [walkPose(true), walkPose(false)],
    load: { at: "hand", kind: "dumbbell" },
    seconds: 1.6,
  },
  burpee: {
    poses: [
      STAND,
      CROUCH,
      FEET_BACK,
      PLANK_UP,
      FEET_BACK,
      CROUCH,
      {
        head: [40, 9],
        neck: [40, 17],
        hip: [40, 39],
        elbow: [50, 10],
        hand: [58, 3],
        knee: [40, 54],
        foot: [40, 69],
      },
    ],
    seconds: 5,
  },
  jump: {
    poses: [
      {
        head: [55, 35],
        neck: [50, 42],
        hip: [36, 58],
        elbow: [42, 52],
        hand: [32, 56],
        knee: [50, 62],
        foot: [40, 73],
      },
      {
        head: [43, 6],
        neck: [42, 14],
        hip: [40, 36],
        elbow: [52, 8],
        hand: [60, 1],
        knee: [48, 48],
        foot: [42, 60],
      },
    ],
    seconds: 1.8,
  },
  hop: {
    poses: [
      { ...STAND, elbow: [44, 32], hand: [50, 40] },
      { ...shift(STAND, 0, -5), elbow: [44, 27], hand: [50, 35] },
    ],
    seconds: 0.8,
  },
  battle_ropes: {
    poses: [
      {
        head: [46, 23],
        neck: [44, 31],
        hip: [36, 52],
        elbow: [52, 38],
        hand: [62, 34],
        elbow2: [52, 42],
        hand2: [62, 48],
        knee: [48, 61],
        foot: [40, 73],
      },
      {
        head: [46, 23],
        neck: [44, 31],
        hip: [36, 52],
        elbow: [52, 42],
        hand: [62, 48],
        elbow2: [52, 38],
        hand2: [62, 34],
        knee: [48, 61],
        foot: [40, 73],
      },
    ],
    load: { at: "hand", kind: "handle" },
    seconds: 1,
  },
  run: {
    poses: [runPose(true), runPose(false)],
    seconds: 1,
  },
  bike: {
    poses: [0, 1, 2, 3].map((quarter) => bikePose((quarter * Math.PI) / 2)),
    props: [
      [29, 42, 38, 42],
      [34, 42, 42, 66],
      [42, 66, 60, 46],
      [60, 46, 62, 38],
      [42, 66, 42, 74],
    ],
    seconds: 1.4,
    steady: true,
  },
  climb: {
    poses: [climbPose("near"), climbPose("far")],
    props: [[58, 30, 58, 74]],
    load: { at: "hand", kind: "handle" },
    seconds: 1.4,
  },
  rower: {
    poses: [
      {
        head: [48, 37],
        neck: [44, 44],
        hip: [34, 64],
        elbow: elbow([44, 44], [62, 52], -1),
        hand: [62, 52],
        knee: knee([34, 64], [56, 66]),
        foot: [56, 66],
      },
      {
        head: [8, 37],
        neck: [12, 44],
        hip: [27, 64],
        elbow: elbow([12, 44], [24, 52]),
        hand: [24, 52],
        knee: knee([27, 64], [56, 66]),
        foot: [56, 66],
      },
    ],
    props: [
      [6, 70, 74, 70],
      [58, 62, 58, 70],
    ],
    load: { at: "hand", kind: "handle" },
    seconds: 2,
  },
  ski_erg: {
    poses: [
      {
        head: [41, 13],
        neck: [41, 21],
        hip: [40, 43],
        elbow: elbow([41, 21], [50, 2], -1),
        hand: [50, 2],
        knee: knee([40, 43], [40, 73]),
        foot: [40, 73],
      },
      {
        head: [60, 26],
        neck: [54, 31],
        hip: [36, 46],
        elbow: elbow([54, 31], [50, 52]),
        hand: [50, 52],
        knee: knee([36, 46], [40, 73]),
        foot: [40, 73],
      },
    ],
    load: { at: "hand", kind: "handle" },
    seconds: 1.6,
  },
  vertical_climber: {
    poses: [climberPose(true), climberPose(false)],
    front: true,
    load: { at: "hand", kind: "handle" },
    seconds: 1.4,
  },
  arm_ergometer: {
    poses: [0, 1, 2, 3].map((quarter) => cranePose((quarter * Math.PI) / 2)),
    props: [
      [29, 56, 47, 56],
      [38, 56, 38, 74],
      [56, 36, 64, 74],
    ],
    load: { at: "hand", kind: "handle" },
    seconds: 1.4,
    steady: true,
  },
  air_squat: {
    // Arms out in front and no load (TASK-461 A2).
    poses: [
      {
        head: [40, 12],
        neck: [40, 20],
        hip: [40, 42],
        elbow: [52, 21],
        hand: [63, 22],
        knee: [41, 57],
        foot: [40, 73],
      },
      {
        head: [54, 33],
        neck: [50, 40],
        hip: [37, 58],
        elbow: [62, 40],
        hand: [73, 40],
        knee: [52, 62],
        foot: [40, 73],
      },
    ],
  },
  glute_bridge: {
    // On the back, feet on the floor: the hips go up.
    poses: [
      {
        head: [14, 69],
        neck: [21, 70],
        hip: [40, 71],
        elbow: [30, 72],
        hand: [40, 73],
        knee: [52, 59],
        foot: [58, 73],
      },
      {
        head: [14, 69],
        neck: [21, 70],
        hip: [42, 58],
        elbow: [30, 72],
        hand: [40, 73],
        knee: [55, 55],
        foot: [58, 73],
      },
    ],
  },
  superman: {
    // Face down, arms out ahead: arms, chest and legs off the floor.
    poses: [
      {
        head: [64, 70],
        neck: [57, 71],
        hip: [36, 72],
        elbow: [69, 71],
        hand: [79, 71],
        knee: [21, 72],
        foot: [6, 73],
      },
      {
        head: [64, 63],
        neck: [57, 66],
        hip: [36, 72],
        elbow: [68, 62],
        hand: [78, 58],
        knee: [21, 69],
        foot: [7, 65],
      },
    ],
    seconds: 3,
  },
  mountain_climber: {
    // On the hands as for a push-up, a knee to the chest in turn.
    poses: [
      {
        ...PLANK_UP,
        knee: [53, 63],
        foot: [41, 71],
        knee2: [28, 66],
        foot2: [14, 72],
      },
      {
        ...PLANK_UP,
        knee: [40, 71],
        foot: [26, 73],
        knee2: [40, 71],
        foot2: [26, 73],
      },
      {
        ...PLANK_UP,
        knee: [28, 66],
        foot: [14, 72],
        knee2: [53, 63],
        foot2: [41, 71],
      },
      {
        ...PLANK_UP,
        knee: [40, 71],
        foot: [26, 73],
        knee2: [40, 71],
        foot2: [26, 73],
      },
    ],
    seconds: 1.2,
  },
} satisfies Record<string, Move>;

export type MoveKey = keyof typeof MOVES;

/** The adductors close what the abductors open. */
const ADDUCTION: Move = {
  ...MOVES.abduction,
  poses: [...MOVES.abduction.poses].reverse(),
};

/** How each exercise of the catalog moves. */
export const MOVE_OF: Readonly<Record<string, MoveKey | "adduction">> = {
  bench_press: "bench",
  incline_bench_press: "incline",
  decline_bench_press: "bench",
  dumbbell_bench_press: "bench",
  dumbbell_fly: "fly",
  chest_press_machine: "seated_press",
  pec_deck: "fly_seated",
  cable_crossover: "fly_standing",
  push_up: "push_up",
  dips: "dips",
  deadlift: "deadlift",
  pull_up: "pull_up",
  chin_up: "pull_up",
  assisted_pull_up: "pull_up",
  lat_pulldown: "pulldown",
  seated_cable_row: "seated_row",
  row_machine: "seated_row",
  barbell_row: "bent_row",
  dumbbell_row: "bent_row",
  t_bar_row: "bent_row",
  straight_arm_pulldown: "straight_pulldown",
  back_extension: "back_extension",
  superman: "superman",
  bodyweight_squat: "air_squat",
  back_squat: "squat",
  front_squat: "squat",
  smith_squat: "squat",
  leg_press: "leg_press",
  hack_squat: "squat",
  leg_extension: "leg_extension",
  leg_curl: "leg_curl",
  romanian_deadlift: "rdl",
  lunge: "lunge",
  bulgarian_split_squat: "lunge",
  step_up: "step_up",
  hip_thrust: "hip_thrust",
  glute_bridge: "glute_bridge",
  glute_machine: "kickback",
  hip_abduction: "abduction",
  hip_adduction: "adduction",
  standing_calf_raise: "calf_raise",
  seated_calf_raise: "seated_calf",
  overhead_press: "overhead_press",
  dumbbell_shoulder_press: "overhead_press",
  shoulder_press_machine: "overhead_press",
  lateral_raise: "lateral_raise",
  front_raise: "front_raise",
  rear_delt_fly: "rear_fly",
  reverse_pec_deck: "rear_fly",
  face_pull: "face_pull",
  upright_row: "upright_row",
  shrug: "shrug",
  barbell_curl: "curl",
  dumbbell_curl: "curl",
  hammer_curl: "curl",
  preacher_curl: "curl",
  cable_curl: "curl",
  biceps_curl_machine: "curl",
  triceps_pushdown: "pushdown",
  skull_crusher: "skull_crusher",
  overhead_triceps_extension: "overhead_extension",
  close_grip_bench_press: "bench",
  triceps_machine: "pushdown",
  wrist_curl: "wrist_curl",
  crunch: "crunch",
  ab_crunch_machine: "crunch",
  cable_crunch: "crunch",
  hanging_leg_raise: "leg_raise",
  russian_twist: "russian_twist",
  ab_wheel: "ab_wheel",
  plank: "plank",
  side_plank: "side_plank",
  wall_sit: "wall_sit",
  mountain_climber: "mountain_climber",
  power_clean: "clean",
  snatch: "snatch",
  kettlebell_swing: "swing",
  farmer_carry: "farmer_carry",
  burpee: "burpee",
  box_jump: "jump",
  battle_ropes: "battle_ropes",
  treadmill: "run",
  curved_treadmill: "run",
  exercise_bike: "bike",
  spin_bike: "bike",
  recumbent_bike: "bike",
  air_bike: "bike",
  elliptical: "climb",
  rowing_machine: "rower",
  ski_machine: "ski_erg",
  stair_climber: "climb",
  stepper: "climb",
  vertical_climber: "vertical_climber",
  arm_ergometer: "arm_ergometer",
  jump_rope: "hop",
};

/** The move of an exercise of the catalog; none for one the user named. */
export function moveOf(exercise: Pick<GymExercise, "key"> | string): Move | null {
  const key = typeof exercise === "string" ? exercise : exercise.key;
  const name = MOVE_OF[key];
  if (name === undefined) {
    return null;
  }
  return name === "adduction" ? ADDUCTION : MOVES[name];
}

/** The joints of `move`, in the order they are drawn. */
export function jointsOf(move: Move): Joint[] {
  return Object.keys(move.poses[0]) as Joint[];
}

/**
 * The head and the arms turn round the joint they hang from, the shortest
 * way, instead of going straight to where they end: a straight line would
 * fold an arm swinging past the shoulder. The body and the legs go
 * straight, so a foot on the floor stays there.
 */
const TURNING: Partial<Record<Joint, Joint>> = {
  head: "neck",
  elbow: "neck",
  hand: "elbow",
  elbow2: "neck",
  hand2: "elbow2",
};

/** Halfway between two poses: `t` from 0 (`a`) to 1 (`b`). */
function between(a: Pose, b: Pose, t: number): Pose {
  const pose: Partial<Record<Joint, Point>> = {};
  const joints = Object.keys(a) as Joint[];
  for (const joint of joints) {
    const from = a[joint];
    const to = b[joint] ?? from;
    if (from !== undefined && to !== undefined && TURNING[joint] === undefined) {
      pose[joint] = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
    }
  }
  // Parents first: the elbow before the hand.
  for (const joint of ["head", "elbow", "hand", "elbow2", "hand2"] as const) {
    const parent = TURNING[joint] as Joint;
    const from = a[joint];
    const to = b[joint] ?? from;
    const fromParent = a[parent];
    const toParent = b[parent] ?? fromParent;
    const at = pose[parent];
    if (
      from === undefined ||
      to === undefined ||
      fromParent === undefined ||
      toParent === undefined ||
      at === undefined
    ) {
      continue;
    }
    const angleA = Math.atan2(from[1] - fromParent[1], from[0] - fromParent[0]);
    let angleB = Math.atan2(to[1] - toParent[1], to[0] - toParent[0]);
    while (angleB - angleA > Math.PI) angleB -= 2 * Math.PI;
    while (angleB - angleA < -Math.PI) angleB += 2 * Math.PI;
    const lengthA = Math.hypot(from[0] - fromParent[0], from[1] - fromParent[1]);
    const lengthB = Math.hypot(to[0] - toParent[0], to[1] - toParent[1]);
    const angle = angleA + (angleB - angleA) * t;
    const length = lengthA + (lengthB - lengthA) * t;
    pose[joint] = [at[0] + length * Math.cos(angle), at[1] + length * Math.sin(angle)];
  }
  return pose as Pose;
}

/** Frames a pass is drawn with: the figure's clock steps between them. */
export const FRAMES = 24;

/**
 * The poses of one pass at `FRAMES` + 1 even steps, the last the same as
 * the first: through each pose and back to the first, easing in and out of
 * each one unless the move is `steady`.
 */
export function framesOf(move: Move): Pose[] {
  const poses = move.poses;
  const legs = poses.length;
  const frames: Pose[] = [];
  for (let i = 0; i <= FRAMES; i += 1) {
    const at = (i / FRAMES) * legs;
    const leg = Math.min(Math.floor(at), legs - 1);
    const t = at - leg;
    const eased = move.steady === true ? t : t * t * (3 - 2 * t);
    frames.push(between(poses[leg], poses[(leg + 1) % legs], eased));
  }
  return frames;
}
