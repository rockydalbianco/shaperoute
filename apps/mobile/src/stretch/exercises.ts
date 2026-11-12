import { tLater } from "../i18n";
import {
  type Breath,
  CALF,
  CALF_BREATH,
  GLUTE,
  GLUTE_BREATH,
  HAMSTRING,
  HAMSTRING_BREATH,
  HIP_FLEXOR,
  HIP_FLEXOR_BREATH,
  type Pose,
  QUAD,
  QUAD_BREATH,
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

/** How long the whole routine takes, every side held to the end. */
export function routineSeconds(exercises: readonly Exercise[] = EXERCISES): number {
  return exercises.reduce((sum, e) => sum + e.seconds * (e.sides ? 2 : 1), 0);
}
