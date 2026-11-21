import { tLater } from "../i18n";
import {
  type Breath,
  CALF,
  CALF_BREATH,
  CAT,
  CAT_BREATH,
  CHEST,
  CHEST_BREATH,
  CHILD,
  CHILD_BREATH,
  FORWARD_FOLD,
  FORWARD_FOLD_BREATH,
  GLUTE,
  GLUTE_BREATH,
  HAMSTRING,
  HAMSTRING_BREATH,
  HIP_FLEXOR,
  HIP_FLEXOR_BREATH,
  KNEE_HUG,
  KNEE_HUG_BREATH,
  NECK,
  NECK_BREATH,
  OVERHEAD_REACH,
  OVERHEAD_REACH_BREATH,
  type Pose,
  QUAD,
  QUAD_BREATH,
  SHOULDER,
  SHOULDER_BREATH,
  TRICEPS,
  TRICEPS_BREATH,
  UPPER_BACK,
  UPPER_BACK_BREATH,
} from "./poses";

/**
 * The five stretches after a run (TASK-285 part B, ADR-0247): the runner's
 * classics, from the thigh to the hip, each held one side at a time. The
 * names and the lines are ours, written in English here and translated
 * where they are shown (`tables.test.ts` finds them through `tLater`).
 */

export type Exercise = {
  key: string;
  /** The name shown over the figure. */
  name: string;
  /** One or two short lines on how to do it. */
  howTo: string;
  /** Held on each side in turn, the figure turning round for the second. */
  sides: boolean;
  /** How long each side is held. */
  seconds: number;
  pose: Pose;
  /** How the pose goes deeper on each breath while held; none, it stays still. */
  breath?: Breath;
};

/** How long a side is held, in the user's proposal of 2026-10-13. */
export const SIDE_SECONDS = 20;
/** «Get ready» before each exercise, in seconds (TASK-466 part A). */
export const READY_S = 5;
/** «Switch sides» before an exercise's second side, in seconds. */
export const SWITCH_S = 3;

export const EXERCISES: readonly Exercise[] = [
  {
    key: "quad",
    name: tLater("Quad stretch"),
    howTo: tLater("Stand tall. Pull one heel toward your glutes, knees together."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: QUAD,
    breath: QUAD_BREATH,
  },
  {
    key: "hamstring",
    name: tLater("Hamstring stretch"),
    howTo: tLater("Put one heel forward, toes up. Lean from the hips, back straight."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: HAMSTRING,
    breath: HAMSTRING_BREATH,
  },
  {
    key: "calf",
    name: tLater("Calf stretch"),
    howTo: tLater("Step back, heel down. Lean toward the wall until the calf pulls."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: CALF,
    breath: CALF_BREATH,
  },
  {
    key: "hipFlexor",
    name: tLater("Hip flexor stretch"),
    howTo: tLater("Kneel on one knee. Push your hips forward, chest up."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: HIP_FLEXOR,
    breath: HIP_FLEXOR_BREATH,
  },
  {
    key: "glute",
    name: tLater("Glute stretch"),
    howTo: tLater("Cross one ankle over the other knee. Sit back as if into a chair."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: GLUTE,
    breath: GLUTE_BREATH,
  },
];

/**
 * The ten stretches of TASK-466 part B (ADR-0378), for the routines of 3, 5
 * and 10 minutes (`routines.ts`): the neck, the shoulders, the chest, the
 * back and the floor. Their `seconds` is the plain hold; a routine sets its
 * own.
 */
export const MORE_EXERCISES: readonly Exercise[] = [
  {
    key: "neck",
    name: tLater("Neck stretch"),
    howTo: tLater("Stand tall. Let your chin drop toward your chest, shoulders low."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: NECK,
    breath: NECK_BREATH,
  },
  {
    key: "overheadReach",
    name: tLater("Overhead reach"),
    howTo: tLater("Reach both arms up high. Grow tall, chest open."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: OVERHEAD_REACH,
    breath: OVERHEAD_REACH_BREATH,
  },
  {
    key: "shoulder",
    name: tLater("Shoulder stretch"),
    howTo: tLater("Bring one arm across your chest. Pull it in with the other hand."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: SHOULDER,
    breath: SHOULDER_BREATH,
  },
  {
    key: "chest",
    name: tLater("Chest opener"),
    howTo: tLater("Clasp your hands behind your back. Lift them a little, chest out."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: CHEST,
    breath: CHEST_BREATH,
  },
  {
    key: "triceps",
    name: tLater("Triceps stretch"),
    howTo: tLater("Raise one elbow, hand down your back. Press the elbow back gently."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: TRICEPS,
    breath: TRICEPS_BREATH,
  },
  {
    key: "upperBack",
    name: tLater("Upper back stretch"),
    howTo: tLater(
      "Reach your arms forward, hands together. Round your back, head down.",
    ),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: UPPER_BACK,
    breath: UPPER_BACK_BREATH,
  },
  {
    key: "forwardFold",
    name: tLater("Forward fold"),
    howTo: tLater("Fold forward from the hips. Let your arms hang, knees soft."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: FORWARD_FOLD,
    breath: FORWARD_FOLD_BREATH,
  },
  {
    key: "cat",
    name: tLater("Cat stretch"),
    howTo: tLater("On hands and knees. Round your back up, let your head drop."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: CAT,
    breath: CAT_BREATH,
  },
  {
    key: "child",
    name: tLater("Child's pose"),
    howTo: tLater("Sit back on your heels. Reach your arms forward, forehead down."),
    sides: false,
    seconds: SIDE_SECONDS,
    pose: CHILD,
    breath: CHILD_BREATH,
  },
  {
    key: "kneeHug",
    name: tLater("Knee hug"),
    howTo: tLater("Stand on one leg. Hug the other knee to your chest."),
    sides: true,
    seconds: SIDE_SECONDS,
    pose: KNEE_HUG,
    breath: KNEE_HUG_BREATH,
  },
];

/** How long the whole routine takes, every side held to the end. */
export function routineSeconds(exercises: readonly Exercise[] = EXERCISES): number {
  return exercises.reduce((sum, e) => sum + e.seconds * (e.sides ? 2 : 1), 0);
}

/**
 * How long a routine takes on the screen: each exercise's «Get ready», its
 * holds and, held on each side, the «Switch sides» between them.
 */
export function sessionSeconds(exercises: readonly Exercise[]): number {
  return exercises.reduce(
    (sum, e) => sum + READY_S + (e.sides ? 2 * e.seconds + SWITCH_S : e.seconds),
    0,
  );
}
