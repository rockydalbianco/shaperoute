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
 * The launch animation, step by step (TASK-179, ADR-0147): the yellow floods
 * the screen, the heart is drawn, it stays a moment, the app comes up.
 */
export const INTRO_MS = { flood: 350, draw: 1600, hold: 450, fade: 300 } as const;

/** How long the yellow screen with the heart is seen, before it fades. */
export const INTRO_SHOWN_MS = INTRO_MS.flood + INTRO_MS.draw + INTRO_MS.hold;

/** From the first frame to the app alone on screen. */
export const INTRO_TOTAL_MS = INTRO_SHOWN_MS + INTRO_MS.fade;

/** The heart's width: most of a phone, never huge on a tablet. */
const HEART_SHARE = 0.6;
const HEART_WIDEST = 300;
const LINE = 5;
const PEN = 13;
const START_DOT = 15;
/** The logo's image is a square with the logo across its middle
 * (`assets/splash-logo.png`, TASK-165): it shows through a low window. */
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
  const { width, height } = useWindowDimensions();
  const [flood] = useState(() => new Animated.Value(0));
  const [draw] = useState(() => new Animated.Value(0));
  const [shown] = useState(() => new Animated.Value(1));
  // The newest `onDone`, without starting the animation again.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const drawing = Animated.sequence([
      Animated.timing(flood, {
        toValue: 1,
        duration: INTRO_MS.flood,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(draw, {
        toValue: 1,
        duration: INTRO_MS.draw,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    const leaving = Animated.timing(shown, {
      toValue: 0,
      duration: INTRO_MS.fade,
      useNativeDriver: true,
    });
    drawing.start();
    // The clock decides when it leaves, not the end of the drawing: with the
    // phone's animations switched off the drawing is over at once, and the
    // heart must still be seen for its time.
    const leave = setTimeout(() => {
      leaving.start(({ finished }) => {
        if (finished) {
          done.current();
        }
      });
    }, INTRO_SHOWN_MS);
    return () => {
      clearTimeout(leave);
      drawing.stop();
      leaving.stop();
    };
  }, [flood, draw, shown]);

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

  // The circle that floods the screen from its centre reaches the corners.
  const reach = Math.hypot(width, height) + 2;
  const logoWidth = heartWidth * LOGO_SHARE;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.cover, { opacity: shown }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Sgrava"
      testID="launch-intro"
    >
      <Animated.View
        style={[
          styles.flood,
          {
            width: reach,
            height: reach,
            borderRadius: reach / 2,
            left: (width - reach) / 2,
            top: (height - reach) / 2,
            // Never quite nothing: Android cannot turn back a scale of zero.
            transform: [
              {
                scale: flood.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.01, 1],
                }),
              },
            ],
          },
        ]}
      />
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
            {
              opacity: flood,
              transform: [{ translateX: pen.x }, { translateY: pen.y }],
            },
          ]}
        />
        {/* Where the route starts and ends, as on the logo and on the map. */}
        <Animated.View
          style={[
            styles.startDot,
            {
              left: strokes[0].x1 - START_DOT / 2,
              top: strokes[0].y1 - START_DOT / 2,
              opacity: flood,
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
          source={require("../../assets/splash-logo.png")}
          style={[styles.logo, { width: logoWidth, height: logoWidth }]}
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
    // What the launch screen leaves behind (TASK-165), until the yellow comes.
    backgroundColor: color.background,
    overflow: "hidden",
  },
  flood: {
    position: "absolute",
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
  logo: {
    // The image is the yellow logo: on yellow it is drawn in the dark colour.
    tintColor: color.onAccent,
  },
});
