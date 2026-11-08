import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useReduceMotion } from "../ui/useReduceMotion";
import { color } from "../theme/tokens";
import { FRAMES, framesOf, type Joint, type Move, MOVE_BOX, type Pose } from "./moves";

/** The bones drawn, the far ones first so the near ones go over them. */
const FAR_BONES: readonly (readonly [Joint, Joint])[] = [
  ["neck", "elbow2"],
  ["elbow2", "hand2"],
  ["hip", "knee2"],
  ["knee2", "foot2"],
];
const NEAR_BONES: readonly (readonly [Joint, Joint])[] = [
  ["neck", "hip"],
  ["hip", "knee"],
  ["knee", "foot"],
  ["foot", "toe"],
  ["neck", "elbow"],
  ["elbow", "hand"],
];

/** The thickness of a bone and the head's radius, in the box's units. */
const BONE = 3.5;
const HEAD = 5;
const LOAD_RADIUS = { plate: 6, dumbbell: 3.5, handle: 2.5 } as const;

/** The pose shown still: halfway through, where the effort is. */
const STILL_FRAME = FRAMES / 2;

type Track = {
  x: number[];
  y: number[];
  angle: number[];
  length: number[];
};

/** Where the middle of the bone from `a` to `b` is at each frame, its
 * angle (unwrapped, so it never spins the long way) and its length. */
function boneTrack(frames: Pose[], a: Joint, b: Joint): Track | null {
  const track: Track = { x: [], y: [], angle: [], length: [] };
  for (const pose of frames) {
    const from = pose[a];
    const to = pose[b];
    if (from === undefined || to === undefined) {
      return null;
    }
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const before = track.angle[track.angle.length - 1];
    if (before !== undefined) {
      while (angle - before > 180) angle -= 360;
      while (angle - before < -180) angle += 360;
    }
    track.x.push((from[0] + to[0]) / 2);
    track.y.push((from[1] + to[1]) / 2);
    track.angle.push(angle);
    track.length.push(Math.hypot(dx, dy));
  }
  return track;
}

function jointTrack(frames: Pose[], joint: Joint): Pick<Track, "x" | "y"> | null {
  if (frames[0][joint] === undefined) {
    return null;
  }
  return {
    x: frames.map((pose) => pose[joint]?.[0] ?? 0),
    y: frames.map((pose) => pose[joint]?.[1] ?? 0),
  };
}

const INPUT = Array.from({ length: FRAMES + 1 }, (_, i) => i / FRAMES);

/** A value of the figure: following the clock, or the still frame's. */
function follow(
  clock: Animated.Value | null,
  values: number[],
  scale: number,
): Animated.AnimatedInterpolation<number> | number {
  const scaled = values.map((value) => value * scale);
  return clock === null
    ? scaled[STILL_FRAME]
    : clock.interpolate({ inputRange: INPUT, outputRange: scaled });
}

function followAngle(
  clock: Animated.Value | null,
  angles: number[],
): Animated.AnimatedInterpolation<string> | string {
  return clock === null
    ? `${angles[STILL_FRAME]}deg`
    : clock.interpolate({
        inputRange: INPUT,
        outputRange: angles.map((angle) => `${angle}deg`),
      });
}

/**
 * How an exercise moves (TASK-411 part E, ADR-0341): a stick figure of the
 * app going through the poses of `move` and back, the load in yellow, in a
 * square of `size`. Still with «Reduce Motion», or with `still`. Only a
 * picture: the screen reader skips it, the name beside it says it all.
 */
export function ExerciseFigure({
  move,
  size,
  still = false,
  testID,
}: {
  move: Move;
  size: number;
  still?: boolean;
  testID?: string;
}) {
  const reduced = useReduceMotion();
  const moving = !still && !reduced;
  const [clock] = useState(() => new Animated.Value(0));
  const seconds = move.seconds ?? 2.4;

  useEffect(() => {
    if (!moving) {
      return;
    }
    clock.setValue(0);
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: seconds * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [clock, moving, seconds]);

  const frames = useMemo(() => framesOf(move), [move]);
  const scale = size / MOVE_BOX;
  const ticking = moving ? clock : null;
  const thickness = BONE * scale;

  const bone = (a: Joint, b: Joint, far: boolean) => {
    const track = boneTrack(frames, a, b);
    if (track === null) {
      return null;
    }
    const longest = Math.max(...track.length) * scale + thickness;
    const stretch = track.length.map(
      (length) => (length * scale + thickness) / longest,
    );
    return (
      <Animated.View
        key={`${a}-${b}`}
        style={[
          styles.part,
          {
            left: -longest / 2,
            top: -thickness / 2,
            width: longest,
            height: thickness,
            borderRadius: thickness / 2,
            backgroundColor: far && move.front !== true ? color.textFaint : color.text,
            transform: [
              { translateX: follow(ticking, track.x, scale) },
              { translateY: follow(ticking, track.y, scale) },
              { rotate: followAngle(ticking, track.angle) },
              { scaleX: follow(ticking, stretch, 1) },
            ],
          },
        ]}
      />
    );
  };

  const dot = (joint: Joint, radius: number, style: object, key: string) => {
    const track = jointTrack(frames, joint);
    if (track === null) {
      return null;
    }
    const r = radius * scale;
    return (
      <Animated.View
        key={key}
        style={[
          styles.part,
          style,
          {
            left: -r,
            top: -r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            transform: [
              { translateX: follow(ticking, track.x, scale) },
              { translateY: follow(ticking, track.y, scale) },
            ],
          },
        ]}
      />
    );
  };

  const load = move.load;
  const loadRadius = load === undefined ? 0 : LOAD_RADIUS[load.kind];
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    >
      {(move.props ?? []).map(([x1, y1, x2, y2], index) => {
        const length = Math.hypot(x2 - x1, y2 - y1) * scale + thickness;
        return (
          <View
            key={`prop-${index}`}
            style={[
              styles.part,
              styles.prop,
              {
                left: ((x1 + x2) / 2) * scale - length / 2,
                top: ((y1 + y2) / 2) * scale - thickness / 2,
                width: length,
                height: thickness,
                borderRadius: thickness / 2,
                transform: [
                  { rotate: `${(Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI}deg` },
                ],
              },
            ]}
          />
        );
      })}
      {FAR_BONES.map(([a, b]) => bone(a, b, true))}
      {load !== undefined &&
        dot(`${load.at}2` as Joint, loadRadius, styles.load, "load-far")}
      {NEAR_BONES.map(([a, b]) => bone(a, b, false))}
      {dot("head", HEAD, [styles.head, { borderWidth: thickness * 0.85 }], "head")}
      {load !== undefined && dot(load.at, loadRadius, styles.load, "load")}
    </View>
  );
}

const styles = StyleSheet.create({
  part: {
    position: "absolute",
  },
  prop: {
    backgroundColor: color.borderStrong,
  },
  head: {
    borderColor: color.text,
  },
  load: {
    backgroundColor: color.accent,
  },
});
