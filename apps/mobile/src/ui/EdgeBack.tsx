import { type ReactNode, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  type PanResponderGestureState,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { color, motion } from "../theme/tokens";
import { fadeTo, springTo } from "./motion";
import { useReduceMotion } from "./useReduceMotion";

/** How far from the left edge a finger starts the way back, in points. */
export const EDGE_BACK_WIDTH = 24;
/** How far a finger goes right before the page is the finger's, in points:
 * a touch on the «←» near the edge stays a touch. */
export const EDGE_BACK_SLOP = 8;
/** Past this share of the screen, let go, the page closes. */
export const EDGE_BACK_CLOSE_SHARE = 1 / 3;
/** Faster than this to the right, let go, the page closes wherever it is:
 * in points a millisecond, as `PanResponder` counts. */
export const EDGE_BACK_FLICK = 0.5;
/** How dark the app under the page is at the start of the way. */
export const EDGE_BACK_DIM = 0.25;

/** Whether a finger now at `moveX` that has moved `dx`, `dy` since it
 * touched is the way back: from the left edge, to the right, more across
 * than down. (`x0` is set only once a view has the finger: here it is
 * still the last gesture's.) */
export function startsEdgeBack(
  gesture: Pick<PanResponderGestureState, "moveX" | "dx" | "dy">,
): boolean {
  return (
    gesture.moveX - gesture.dx <= EDGE_BACK_WIDTH &&
    gesture.dx > EDGE_BACK_SLOP &&
    Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5
  );
}

/** Whether a page let go at `dx` with the speed `vx` closes. */
export function closesOnRelease(dx: number, vx: number, width: number): boolean {
  return dx > width * EDGE_BACK_CLOSE_SHARE || (vx > EDGE_BACK_FLICK && dx > 0);
}

type Props = {
  /** The page's own «←». */
  onBack: () => void;
  /** Off where the page has no way back. */
  enabled?: boolean;
  testID?: string;
  children: ReactNode;
};

/** The way back's own state, between the events of a finger. */
class EdgeGesture {
  readonly x = new Animated.Value(0);
  private onBack: () => void = () => {};
  private on = false;
  private still = false;
  private width = 0;
  // How far the finger had gone when the page became its: `PanResponder`
  // counts again from there, and the page must not jump back by it.
  private before = 0;

  readonly update = (now: {
    onBack: () => void;
    on: boolean;
    still: boolean;
    width: number;
  }): void => {
    this.onBack = now.onBack;
    this.on = now.on;
    this.still = now.still;
    this.width = now.width;
  };

  private back(): Animated.CompositeAnimation {
    return this.still ? fadeTo(this.x, 0) : springTo(this.x, 0, "glide");
  }

  // Away on a fixed time, as a sheet goes, not on a spring: a spring is at
  // rest a long while after the page is out of sight, and the page would
  // stay open, unseen, until then.
  private away(): Animated.CompositeAnimation {
    return this.still
      ? fadeTo(this.x, this.width)
      : Animated.timing(this.x, {
          toValue: this.width,
          duration: motion.sheetMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
  }

  private settle(dx: number, vx: number): void {
    if (!closesOnRelease(dx, vx, this.width)) {
      this.back().start();
      return;
    }
    this.away().start(({ finished }) => {
      if (finished) {
        this.onBack();
        // A page that stays, its content changed («Settings» back to
        // «Profile»), is where it was.
        this.x.setValue(0);
      }
    });
  }

  readonly handlers = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => {
      if (this.on && startsEdgeBack(gesture)) {
        this.before = gesture.dx;
        return true;
      }
      return false;
    },
    onPanResponderGrant: () => {
      this.x.stopAnimation();
      // As the «←» leaves a field: what was typed stays until the page
      // goes, the keyboard goes now.
      Keyboard.dismiss();
    },
    onPanResponderMove: (_, gesture) =>
      this.x.setValue(Math.max(0, this.before + gesture.dx)),
    onPanResponderRelease: (_, gesture) =>
      this.settle(this.before + gesture.dx, gesture.vx),
    onPanResponderTerminate: () => this.back().start(),
    onPanResponderTerminationRequest: () => false,
  }).panHandlers;
}

/**
 * The way back from the left edge, on iOS (TASK-470 E, the user's choice):
 * a finger from the edge of a page opened over the app takes the page to
 * the right, and the app shows under it, a little dark; let go past a third
 * of the screen, or flicked, the page goes and its «←» is called, else it
 * comes back on the spring `glide`. With «Reduce Motion» the page fades
 * instead of sliding. Android has its own back gesture, which the pages
 * already answer (`useBackCloses`). A touch, a scroll down, a row slid from
 * further in: all stay the page's.
 */
export function EdgeBack({ onBack, enabled = true, testID, children }: Props) {
  const { width } = useWindowDimensions();
  const still = useReduceMotion();
  // One gesture for the page's life: made again, a page drawn again under
  // the finger would lose the gesture half way.
  const [gesture] = useState(() => new EdgeGesture());
  const on = enabled && Platform.OS === "ios";
  useEffect(() => {
    gesture.update({ onBack, on, still, width });
  });
  const x = gesture.x;

  const look = still
    ? {
        opacity: x.interpolate({
          inputRange: [0, width],
          outputRange: [1, 0],
          extrapolate: "clamp",
        }),
      }
    : {
        transform: [
          {
            translateX: x.interpolate({
              inputRange: [0, width],
              outputRange: [0, width],
              extrapolate: "clamp",
            }),
          },
        ],
      };
  // None at rest: a page with clear corners shows nothing more.
  const dim = x.interpolate({
    inputRange: [0, 1, Math.max(width, 2)],
    outputRange: [0, EDGE_BACK_DIM, 0],
    extrapolate: "clamp",
  });
  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {on && (
        <Animated.View
          testID={testID === undefined ? undefined : `${testID}-dim`}
          pointerEvents="none"
          style={[styles.dim, { opacity: dim }]}
        />
      )}
      <Animated.View
        testID={testID}
        style={[StyleSheet.absoluteFill, look]}
        {...(on ? gesture.handlers : {})}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.scrim,
  },
});
