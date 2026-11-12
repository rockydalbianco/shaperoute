import { type ReactNode, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { color } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";
import {
  type Breath,
  deepen,
  grounding,
  LENGTH,
  PARENT,
  type Pose,
  type Segment,
  STAND,
} from "./poses";

/**
 * The stretching figure (TASK-285 part B, ADR-0247; moves of TASK-466 part
 * A, ADR-0378): a person drawn with thin turned Views, as the heart of the launch
 * animation is (ADR-0147), with no drawing library. Each segment is a
 * zero-sized frame at its joint, turned by its angle, holding its bar and
 * the segments that hang from it: a limb never changes length while it
 * turns.
 *
 * How it moves:
 * - a new pose is reached in `POSE_MS`, every joint turning the short way;
 * - from one exercise to the next, or to the other side, it stands up first
 *   and then goes down into the new pose, as a person would;
 * - to do the other side it turns round while standing, narrowing to its
 *   edge and opening the other way, instead of flipping at once;
 * - while a pose is held it breathes: slowly a little deeper and back
 *   (`Breath`), every `BREATH_MS`;
 * - with «Reduce Motion» on, it takes each pose at once and stays still.
 */

/** How long the figure takes to move from one pose to the next. */
export const POSE_MS = 800;
/** One breath while a pose is held: deeper and back. */
export const BREATH_MS = 4000;
/** How long the breath takes to settle when the hold stops. */
const SETTLE_MS = 300;

/** The bar's width and the far limbs' fade, as a share of the height. */
const LINE_SHARE = 0.034;
const FAR_OPACITY = 0.4;
/** The arms hang a little below the neck. */
const SHOULDER_SHARE = 0.9;
/** The head's diameter, a little more than its segment for a rounder face. */
const HEAD_SHARE = 1.05;

type Props = {
  pose: Pose;
  /** The figure's height on screen, in pixels. */
  height: number;
  /** Turned round, to do the other side. */
  mirrored?: boolean;
  /** How the pose goes deeper on each breath. */
  breath?: Breath;
  /** Whether it breathes now: the pose is held and the time runs. */
  breathing?: boolean;
  testID?: string;
};

/** Which way the figure looks: 1 to the right, -1 to the left. */
type Facing = 1 | -1;

/** The poses a move goes through, first to last, and which way it looks. */
type Move = { poses: readonly Pose[]; from: Facing; to: Facing };

/**
 * The way from `from` to `to`: straight, or standing up in between when
 * one bent pose follows another or the figure turns round. Pure, for the
 * tests.
 */
export function path(from: Pose, to: Pose, turning: boolean): readonly Pose[] {
  if (from === to && !turning) {
    return [to];
  }
  if (turning || (from !== STAND && to !== STAND)) {
    return [from, STAND, to];
  }
  return [from, to];
}

/** The angle of `segment` in its parent's frame. */
function relative(segment: Segment, angles: Readonly<Record<Segment, number>>): number {
  const parent = PARENT[segment];
  return parent === null ? angles[segment] : angles[segment] - angles[parent];
}

/** `to` brought within half a turn of `from`: the joint turns the short way. */
export function nearest(from: number, to: number): number {
  let delta = (to - from) % 360;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return from + delta;
}

/** One joint's angles along a path, each the short way from the one before. */
export function turns(segment: Segment, poses: readonly Pose[]): number[] {
  const out: number[] = [];
  for (const pose of poses) {
    const angle = relative(segment, pose);
    const before = out[out.length - 1];
    out.push(before === undefined ? angle : nearest(before, angle));
  }
  return out;
}

/** Keyframes 0, 1, 2…: one per pose; a still figure gets two equal ones. */
function keyframes<T>(values: readonly T[]): {
  inputRange: number[];
  outputRange: T[];
} {
  const outputRange = values.length === 1 ? [values[0], values[0]] : [...values];
  return { inputRange: outputRange.map((_, i) => i), outputRange };
}

/** What every limb of one figure shares: its motion and its scale. */
type Frame = {
  t: Animated.Value;
  b: Animated.Value;
  move: Move;
  breath: Breath;
  height: number;
  line: number;
};

/** A segment's turn at the bottom of a breath, in its parent's frame. */
function breathTurn(segment: Segment, breath: Breath): number {
  const parent = PARENT[segment];
  const own = breath[segment] ?? 0;
  return parent === null ? own : own - (breath[parent] ?? 0);
}

function Limb({
  segment,
  frame,
  far = false,
  children,
}: {
  segment: Segment;
  frame: Frame;
  far?: boolean;
  children?: ReactNode;
}) {
  const { t, b, move, breath, height, line } = frame;
  const { inputRange, outputRange } = keyframes(turns(segment, move.poses));
  const rotate = t.interpolate({
    inputRange,
    outputRange: outputRange.map((angle) => `${angle}deg`),
  });
  const deeper = b.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${breathTurn(segment, breath)}deg`],
  });
  const length = LENGTH[segment] * height;
  const head = length * HEAD_SHARE;
  return (
    <Animated.View
      style={[styles.joint, { transform: [{ rotate }, { rotate: deeper }] }]}
    >
      {segment === "head" ? (
        <View
          style={[
            styles.part,
            {
              left: -head / 2,
              top: -line / 2,
              width: head,
              height: head,
              borderRadius: head / 2,
            },
          ]}
        />
      ) : (
        <>
          <View
            style={[
              styles.part,
              {
                left: -line / 2,
                top: -line / 2,
                width: line,
                height: length + line,
                borderRadius: line / 2,
                opacity: far ? FAR_OPACITY : 1,
              },
            ]}
          />
          {/* A round joint where the next segment hangs: no gap on a bend. */}
          <View
            style={[
              styles.part,
              {
                left: -line * 0.6,
                top: length - line * 0.6,
                width: line * 1.2,
                height: line * 1.2,
                borderRadius: line * 0.6,
                opacity: far ? FAR_OPACITY : 1,
              },
            ]}
          />
        </>
      )}
      {children !== undefined && (
        <View style={[styles.joint, { top: length }]}>{children}</View>
      )}
    </Animated.View>
  );
}

export function Figure({
  pose,
  height,
  mirrored = false,
  breath = {},
  breathing = false,
  testID,
}: Props) {
  const reduced = useReduceMotion();
  const facing: Facing = mirrored ? -1 : 1;
  const [t] = useState(() => new Animated.Value(0));
  const [b] = useState(() => new Animated.Value(0));
  // The figure comes in standing and goes down into its first pose.
  const [move, setMove] = useState<Move>(() => ({
    poses: path(STAND, pose, false),
    from: facing,
    to: facing,
  }));
  const at = move.poses[move.poses.length - 1];
  // A new pose or a turn: from where the figure is to where it goes.
  if (pose !== at || facing !== move.to) {
    setMove({
      poses: path(at, pose, facing !== move.to),
      from: move.to,
      to: facing,
    });
  }

  useEffect(() => {
    const end = move.poses.length - 1;
    if (end === 0 || reduced) {
      t.setValue(Math.max(end, 1));
      return;
    }
    t.setValue(0);
    const moving = Animated.timing(t, {
      toValue: end,
      duration: POSE_MS * end,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    moving.start();
    return () => moving.stop();
  }, [move, t, reduced]);

  useEffect(() => {
    if (!breathing || reduced) {
      if (reduced) {
        b.setValue(0);
        return;
      }
      const settling = Animated.timing(b, {
        toValue: 0,
        duration: SETTLE_MS,
        useNativeDriver: true,
      });
      settling.start();
      return () => settling.stop();
    }
    const half = {
      duration: BREATH_MS / 2,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    };
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(b, { ...half, toValue: 1 }),
        Animated.timing(b, { ...half, toValue: 0 }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [breathing, reduced, b]);

  const line = LINE_SHARE * height;
  const frame: Frame = { t, b, move, breath, height, line };

  // The hip rises and falls with the pose: a kneeling figure sits lower.
  const ground = keyframes(move.poses.map((p) => -grounding(p) * height));
  const sink = (grounding(at) - grounding(deepen(at, breath))) * height;
  const lift = Animated.add(
    t.interpolate(ground),
    b.interpolate({ inputRange: [0, 1], outputRange: [0, sink] }),
  );
  // Turning round: narrow to the edge while standing, open the other way.
  const middle = (move.poses.length - 1) / 2;
  const scaleX =
    move.from === move.to
      ? move.to
      : t.interpolate({
          inputRange: [0, middle - 0.3, middle + 0.3, move.poses.length - 1],
          outputRange: [move.from, move.from, move.to, move.to],
        });
  const shoulders = -LENGTH.torso * height * (1 - SHOULDER_SHARE);

  return (
    <Animated.View
      style={[styles.stage, { height, transform: [{ scaleX }] }]}
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View style={[styles.hip, { transform: [{ translateY: lift }] }]}>
        <Limb segment="thighFar" frame={frame} far>
          <Limb segment="shinFar" frame={frame} far>
            <Limb segment="footFar" frame={frame} far />
          </Limb>
        </Limb>
        <Limb segment="torso" frame={frame}>
          <View style={[styles.joint, { top: shoulders }]}>
            <Limb segment="upperArmFar" frame={frame} far>
              <Limb segment="forearmFar" frame={frame} far />
            </Limb>
          </View>
          <Limb segment="head" frame={frame} />
          <View style={[styles.joint, { top: shoulders }]}>
            <Limb segment="upperArmNear" frame={frame}>
              <Limb segment="forearmNear" frame={frame} />
            </Limb>
          </View>
        </Limb>
        <Limb segment="thighNear" frame={frame}>
          <Limb segment="shinNear" frame={frame}>
            <Limb segment="footNear" frame={frame} />
          </Limb>
        </Limb>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  // The hip, at the floor until lifted by the pose.
  hip: {
    width: 0,
    height: 0,
  },
  joint: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  },
  part: {
    position: "absolute",
    backgroundColor: color.text,
  },
});
