import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { color } from "../theme/tokens";
import { heartHeight, heartStrokes } from "./heartLine";

/**
 * The launch animation, step by step (TASK-179, ADR-0147): the yellow screen
 * waits a moment, the heart is drawn, it stays a moment, the app comes up.
 */
export const INTRO_MS = { wait: 350, draw: 1600, hold: 450, fade: 300 } as const;

/** How long the yellow screen with the heart is seen, before it fades. */
export const INTRO_SHOWN_MS = INTRO_MS.wait + INTRO_MS.draw + INTRO_MS.hold;

/** From the first frame to the app alone on screen. */
export const INTRO_TOTAL_MS = INTRO_SHOWN_MS + INTRO_MS.fade;

const WAIT_SHARE = INTRO_MS.wait / (INTRO_MS.wait + INTRO_MS.draw);
const drawEase = Easing.inOut(Easing.quad);

/**
 * How much of the line is drawn at `t`, 0 to 1 of the wait and the drawing
 * together: nothing while the pen waits, then gently off and gently in.
 */
export function penProgress(t: number): number {
  return t <= WAIT_SHARE ? 0 : drawEase((t - WAIT_SHARE) / (1 - WAIT_SHARE));
}

/** The heart's width: most of a phone, never huge on a tablet. */
const HEART_SHARE = 0.6;
const HEART_WIDEST = 300;
const LINE = 5;
const PEN = 13;
const START_DOT = 15;
/** The logo's image is a square with the logo across its middle
 * (`assets/splash-logo-dark.png`, the one of the launch screen, TASK-181): it
 * shows through a low window. */
const LOGO_SHARE = 0.7;
const LOGO_WINDOW = 0.26;
const LOGO_GAP = 36;

type Props = {
  /** The animation is over and the app is alone on screen. */
  onDone: () => void;
};

/**
 * What the app shows as it opens: on the brand yellow, the heart of the demo
 * video drawn as a pen would run it, with the logo under it. It lies over the
 * app, which starts underneath, and takes the touches until it is gone.
 */
export function LaunchIntro({ onDone }: Props) {
  const { width } = useWindowDimensions();
  const [draw] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(1));
  // The newest `onDone`, without starting the animation again.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const startedAt = Date.now();
    let leave: ReturnType<typeof setTimeout> | undefined;
    // One animation from the first frame, its wait inside it: nothing has to
    // come back to JavaScript, busy starting the app, for the pen to start.
    const drawing = Animated.timing(draw, {
      toValue: 1,
      duration: INTRO_MS.wait + INTRO_MS.draw,
      easing: penProgress,
      useNativeDriver: true,
    });
    const leaving = Animated.timing(shown, {
      toValue: 0,
      duration: INTRO_MS.fade,
      useNativeDriver: true,
    });
    drawing.start(({ finished }) => {
      if (!finished) {
        return;
      }
      // The finished heart stays its moment, however late the drawing ended.
      // And the whole is never shorter than its time: with the phone's
      // animations switched off the drawing is over at once.
      const left = Math.max(INTRO_MS.hold, INTRO_SHOWN_MS - (Date.now() - startedAt));
      leave = setTimeout(() => {
        leaving.start((end) => {
          if (end.finished) {
            done.current();
          }
        });
      }, left);
    });
    return () => {
      clearTimeout(leave);
      drawing.stop();
      leaving.stop();
    };
  }, [draw, shown]);

  const heartWidth = Math.min(width * HEART_SHARE, HEART_WIDEST);
  const strokes = useMemo(() => heartStrokes(heartWidth), [heartWidth]);
  // The pen: where the line has got to, one stop per stroke end.
  const pen = useMemo(() => {
    const at = [0, ...strokes.map((s) => s.to)];
    return {
      x: draw.interpolate({
        inputRange: at,
        outputRange: [strokes[0].x1, ...strokes.map((s) => s.x2)],
      }),
      y: draw.interpolate({
        inputRange: at,
        outputRange: [strokes[0].y1, ...strokes.map((s) => s.y2)],
      }),
    };
  }, [draw, strokes]);

  const logoWidth = heartWidth * LOGO_SHARE;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.cover, { opacity: shown }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="MuW"
      testID="launch-intro"
    >
      <View style={{ width: heartWidth, height: heartHeight(heartWidth) }}>
        {strokes.map((s, i) => (
          <Animated.View
            key={i}
            style={[
              styles.stroke,
              {
                // A View turns about its centre: place the centre mid-stroke,
                // and let the round ends cover the joints.
                left: (s.x1 + s.x2) / 2 - (s.length + LINE) / 2,
                top: (s.y1 + s.y2) / 2 - LINE / 2,
                width: s.length + LINE,
                transform: [{ rotate: `${s.angle}deg` }],
                opacity: draw.interpolate({
                  inputRange: [s.from, s.to],
                  outputRange: [0, 1],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        ))}
        <Animated.View
          style={[
            styles.pen,
            { transform: [{ translateX: pen.x }, { translateY: pen.y }] },
          ]}
        />
        {/* Where the route starts and ends, as on the logo and on the map. */}
        <View
          style={[
            styles.startDot,
            {
              left: strokes[0].x1 - START_DOT / 2,
              top: strokes[0].y1 - START_DOT / 2,
            },
          ]}
        />
      </View>
      <View
        style={[
          styles.logoWindow,
          { width: logoWidth, height: logoWidth * LOGO_WINDOW },
        ]}
      >
        <Image
          source={require("../../assets/splash-logo-dark.png")}
          style={{ width: logoWidth, height: logoWidth }}
          accessible={false}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    alignItems: "center",
    justifyContent: "center",
    // The yellow of the launch screen (TASK-181): no black in between.
    backgroundColor: color.accent,
  },
  stroke: {
    position: "absolute",
    height: LINE,
    borderRadius: LINE / 2,
    backgroundColor: color.onAccent,
  },
  pen: {
    position: "absolute",
    left: -PEN / 2,
    top: -PEN / 2,
    width: PEN,
    height: PEN,
    borderRadius: PEN / 2,
    backgroundColor: color.onAccent,
  },
  startDot: {
    position: "absolute",
    width: START_DOT,
    height: START_DOT,
    borderRadius: START_DOT / 2,
    backgroundColor: color.text,
    borderWidth: 3,
    borderColor: color.onAccent,
  },
  logoWindow: {
    marginTop: LOGO_GAP,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
