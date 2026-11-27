import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { color } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";
import { BREATH_MS, nearest, POSE_MS } from "./Figure";
import {
  deepenFront,
  FRONT_LENGTH,
  FRONT_PARENT,
  FRONT_SHOULDER_SHARE,
  FRONT_STAND,
  type FrontBreath,
  frontDrift,
  frontGrounding,
  type FrontPose,
  frontSway,
  type FrontSegment,
  HIP_HALF,
  mirrorFront,
  mirrorFrontBreath,
  SHOULDER_HALF,
  sideOf,
} from "./posesFront";

/**
 * The stretching figure seen from the front (TASK-520, ADR-0415): the same
 * person as `Figure`, drawn the same way, with thin turned Views and no
 * drawing library (ADR-0147), for the exercises the side does not show.
 * Both arms and both legs show; the shoulders and the hips are two short
 * bars.
 *
 * It moves as `Figure` does: a new pose in `POSE_MS`, every joint the
 * short way, standing up between two poses; a breath while held, or a
 * movement at its own pace (`breathMs`); still with «Reduce Motion» on.
 * The other side is the same pose mirrored, reached through standing: seen
 * from the front nobody turns round. A pose `planted` on its feet keeps
 * them still as it moves: the hip goes across over them.
 */

/** How long the breath takes to settle when the hold stops. */
const SETTLE_MS = 300;
/** The bar's width, as a share of the height: the side figure's. */
const LINE_SHARE = 0.034;
/** The head's diameter, a little more than its segment for a rounder face. */
const HEAD_SHARE = 1.05;
/** Half the side of a joint's frame: never a view of no size (`Figure`). */
const JOINT = 1;

type Props = {
  pose: FrontPose;
  /** The figure's height on screen, in pixels. */
  height: number;
  /** The other side: the pose mirrored. */
  mirrored?: boolean;
  /** How the pose goes deeper on each breath, or how far it moves. */
  breath?: FrontBreath;
  /** Whether it breathes now: the pose is held and the time runs. */
  breathing?: boolean;
  /** One breath's time, or one go of a movement, there and back. */
  breathMs?: number;
  testID?: string;
};

/**
 * The way from `from` to `to`: straight, or standing up in between when
 * one pose follows another. Pure, for the tests.
 */
export function frontPath(from: FrontPose, to: FrontPose): readonly FrontPose[] {
  if (from === to) {
    return [to];
  }
  if (from !== FRONT_STAND && to !== FRONT_STAND) {
    return [from, FRONT_STAND, to];
  }
  return [from, to];
}

/**
 * Whether the body turns over somewhere along `poses`: standing to folded
 * forward, the head down between the legs. Seen from the front that is no
 * turn at all, the body comes toward whoever looks; drawn as one it would
 * swing out to a side like the hand of a clock. So the figure fades from
 * one pose to the other instead. Pure, for the tests.
 */
export function frontFlips(poses: readonly FrontPose[]): boolean {
  return poses.some(
    (pose, i) => i > 0 && Math.abs(nearest(0, pose.torso - poses[i - 1].torso)) > 90,
  );
}

/** The angle of `segment` in its parent's frame. */
function relative(
  segment: FrontSegment,
  angles: Readonly<Record<FrontSegment, number>>,
): number {
  const parent = FRONT_PARENT[segment];
  return parent === null ? angles[segment] : angles[segment] - angles[parent];
}

/** One joint's angles along a path, each the short way from the one before. */
export function frontTurns(
  segment: FrontSegment,
  poses: readonly FrontPose[],
): number[] {
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
  poses: readonly FrontPose[];
  breath: FrontBreath;
  height: number;
  line: number;
};

/** A segment's turn at the far end of a breath, in its parent's frame. */
function breathTurn(segment: FrontSegment, breath: FrontBreath): number {
  const parent = FRONT_PARENT[segment];
  const own = breath[segment] ?? 0;
  return parent === null ? own : own - (breath[parent] ?? 0);
}

function Limb({
  segment,
  frame,
  children,
}: {
  segment: FrontSegment;
  frame: Frame;
  children?: ReactNode;
}) {
  const { t, b, poses, breath, height, line } = frame;
  const { inputRange, outputRange } = keyframes(frontTurns(segment, poses));
  const rotate = t.interpolate({
    inputRange,
    outputRange: outputRange.map((angle) => `${angle}deg`),
  });
  const deeper = b.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${breathTurn(segment, breath)}deg`],
  });
  const length = FRONT_LENGTH[segment] * height;
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
              left: JOINT - head / 2,
              top: JOINT - line / 2,
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
                left: JOINT - line / 2,
                top: JOINT - line / 2,
                width: line,
                height: length + line,
                borderRadius: line / 2,
              },
            ]}
          />
          {/* A round joint where the next segment hangs: no gap on a bend. */}
          <View
            style={[
              styles.part,
              {
                left: JOINT - line * 0.6,
                top: JOINT + length - line * 0.6,
                width: line * 1.2,
                height: line * 1.2,
                borderRadius: line * 0.6,
              },
            ]}
          />
        </>
      )}
      {children}
    </Animated.View>
  );
}

/** A bar across a joint: the shoulders on the torso, the hips at its foot. */
function Bar({ half, top, line }: { half: number; top: number; line: number }) {
  return (
    <View
      style={[
        styles.part,
        {
          left: JOINT - half - line / 2,
          top: JOINT + top - line / 2,
          width: 2 * half + line,
          height: line,
          borderRadius: line / 2,
        },
      ]}
    />
  );
}

export function FigureFront({
  pose,
  height,
  mirrored = false,
  breath,
  breathing = false,
  breathMs = BREATH_MS,
  testID,
}: Props) {
  const reduced = useReduceMotion();
  // The side asked for: a pose of its own, the same one until it changes.
  const target = useMemo(() => (mirrored ? mirrorFront(pose) : pose), [pose, mirrored]);
  const swing = useMemo(
    () => (mirrored ? mirrorFrontBreath(breath ?? {}) : (breath ?? {})),
    [breath, mirrored],
  );
  const [t] = useState(() => new Animated.Value(0));
  const [b] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(1));
  // The figure comes in standing and goes into its first pose.
  const [poses, setPoses] = useState<readonly FrontPose[]>(() =>
    frontPath(FRONT_STAND, target),
  );
  const at = poses[poses.length - 1];
  if (target !== at) {
    setPoses(frontPath(at, target));
  }

  useEffect(() => {
    const end = poses.length - 1;
    if (end === 0 || reduced) {
      t.setValue(Math.max(end, 1));
      shown.setValue(1);
      return;
    }
    t.setValue(0);
    if (frontFlips(poses)) {
      // Out in the pose it was in, back in the new one.
      const half = { duration: POSE_MS / 2, useNativeDriver: true };
      const out = Animated.timing(shown, { ...half, toValue: 0 });
      const back = Animated.timing(shown, { ...half, toValue: 1 });
      out.start(({ finished }) => {
        if (finished) {
          t.setValue(end);
          back.start();
        }
      });
      return () => {
        out.stop();
        back.stop();
        shown.setValue(1);
      };
    }
    const moving = Animated.timing(t, {
      toValue: end,
      duration: POSE_MS * end,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    moving.start();
    return () => moving.stop();
  }, [poses, t, shown, reduced]);

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
      duration: breathMs / 2,
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
  }, [breathing, breathMs, reduced, b]);

  const line = LINE_SHARE * height;
  const frame: Frame = { t, b, poses, breath: swing, height, line };

  // The hip rises and falls with the pose: a sitting figure is lower.
  const ground = keyframes(poses.map((p) => -frontGrounding(p) * height));
  const sink = (frontGrounding(at) - frontGrounding(deepenFront(at, swing))) * height;
  const lift = Animated.add(
    t.interpolate(ground),
    b.interpolate({ inputRange: [0, 1], outputRange: [0, sink] }),
  );
  // A pose that reaches far to a side slides back, to stay on the screen;
  // one planted on its feet takes the hip across over them as it moves.
  const sway = frontSway(at, deepenFront(at, swing)) * height;
  const slide = Animated.add(
    t.interpolate(keyframes(poses.map((p) => frontDrift(p) * height))),
    b.interpolate({ inputRange: [0, 1], outputRange: [0, sway] }),
  );
  const torso = FRONT_LENGTH.torso * height;
  const shoulders = torso * FRONT_SHOULDER_SHARE;
  const arm = (segment: "upperArmLeft" | "upperArmRight") => ({
    // Upright, the torso's frame is turned half a turn: its right is the
    // screen's left.
    left: -sideOf(segment) * SHOULDER_HALF * height,
    top: shoulders,
  });
  const leg = (segment: "thighLeft" | "thighRight") => ({
    left: sideOf(segment) * HIP_HALF * height,
  });

  return (
    <View
      style={[styles.stage, { height }]}
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.View
        style={[
          styles.hip,
          { opacity: shown, transform: [{ translateX: slide }, { translateY: lift }] },
        ]}
      >
        <Bar half={HIP_HALF * height} top={0} line={line} />
        <View style={[styles.joint, leg("thighLeft")]}>
          <Limb segment="thighLeft" frame={frame}>
            <View style={[styles.joint, { top: FRONT_LENGTH.thighLeft * height }]}>
              <Limb segment="shinLeft" frame={frame} />
            </View>
          </Limb>
        </View>
        <View style={[styles.joint, leg("thighRight")]}>
          <Limb segment="thighRight" frame={frame}>
            <View style={[styles.joint, { top: FRONT_LENGTH.thighRight * height }]}>
              <Limb segment="shinRight" frame={frame} />
            </View>
          </Limb>
        </View>
        <Limb segment="torso" frame={frame}>
          <Bar half={SHOULDER_HALF * height} top={shoulders} line={line} />
          <View style={[styles.joint, arm("upperArmLeft")]}>
            <Limb segment="upperArmLeft" frame={frame}>
              <View style={[styles.joint, { top: FRONT_LENGTH.upperArmLeft * height }]}>
                <Limb segment="forearmLeft" frame={frame} />
              </View>
            </Limb>
          </View>
          <View style={[styles.joint, arm("upperArmRight")]}>
            <Limb segment="upperArmRight" frame={frame}>
              <View
                style={[styles.joint, { top: FRONT_LENGTH.upperArmRight * height }]}
              >
                <Limb segment="forearmRight" frame={frame} />
              </View>
            </Limb>
          </View>
          <View style={[styles.joint, { top: torso }]}>
            <Limb segment="head" frame={frame} />
          </View>
        </Limb>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  // The hip, its point at the floor until lifted by the pose.
  hip: {
    width: 2 * JOINT,
    height: 2 * JOINT,
    marginBottom: -JOINT,
  },
  // A joint in its parent's frame: both are squares of the same side, so
  // (0, 0) puts this joint's point on the parent's.
  joint: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 2 * JOINT,
    height: 2 * JOINT,
  },
  part: {
    position: "absolute",
    backgroundColor: color.text,
  },
});
