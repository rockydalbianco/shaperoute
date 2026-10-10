import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { pageTitle } from "../screens/pageTitles";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useSport } from "../settings/useSport";
import {
  type Box,
  locate,
  type Located,
  sameBox,
  scrollsBack,
  tourPager,
  wait,
} from "./tourParts";
import { EDGE, placeBubble, shadeAround } from "./tourPlace";
import { partsOf, TOUR_STEPS } from "./tourSteps";
import { stepOf, tourTexts } from "./tourTexts";

/** At the first opening «Skip» waits this long (the user's choice). */
export const SKIP_LOCK_S = 5;
/** A step's parts are measured again after this, until they are all on
 * screen and still: a page sliding in, a scroll coming to rest. */
export const SETTLE_MS = 150;
/** At most so many times: then the step shows what is there. */
export const SETTLE_TRIES = 10;
/** How dark the screen is around the part shown. */
const SHADE = 0.82;
const FADE_MS = 250;

/** Finds the parts on screen, together. */
export type Locate = (
  names: readonly string[],
  screen: { width: number; height: number },
) => Promise<Located>;

type Props = {
  /** Seconds before «Skip» can be touched: 0 when the tour is asked again. */
  lockSeconds: number;
  /** The tour ended; `shown` is false when it could not start: no pages on
   * screen (the end of a run left open, say). */
  onEnd: (shown: boolean) => void;
  /** The real parts unless a test says otherwise. */
  locateParts?: Locate;
};

/**
 * The tour of the first opening (TASK-266): over the real screens, one part
 * at a time in the light, the rest dark, and a few words beside it, with
 * «Next». «Skip» counts down from `lockSeconds` before it can be touched.
 * Touches on the app wait until the tour ends; then «Draw» is back.
 */
export function Tour(props: Props) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Over the app's own: the tour is drawn outside it. */}
      <SafeAreaProvider>
        <TourLayer {...props} />
      </SafeAreaProvider>
    </View>
  );
}

function TourLayer({ lockSeconds, onEnd, locateParts = locate }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const texts = tourTexts();
  const sport = useSport();
  const [at, setAt] = useState(0);
  // The part the step shows, once found: null for none; undefined while the
  // tour moves to it.
  const [part, setPart] = useState<Box | null | undefined>(undefined);
  // The height of the words, once laid out: where they go depends on it.
  const [bubble, setBubble] = useState(0);
  const left = useCountdown(lockSeconds);
  const [shown] = useState(() => new Animated.Value(0));
  const ended = useRef(false);
  const step = TOUR_STEPS[at];
  const last = at === TOUR_STEPS.length - 1;

  const end = useCallback(
    (seen: boolean) => {
      if (ended.current) {
        return;
      }
      ended.current = true;
      if (seen) {
        scrollsBack();
        tourPager()?.show(pageTitle("draw"));
      }
      onEnd(seen);
    },
    [onEnd],
  );

  useEffect(() => {
    Animated.timing(shown, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [shown]);

  useEffect(() => {
    let gone = false;
    async function find() {
      const pager = tourPager();
      if (pager === null) {
        end(at > 0);
        return;
      }
      const title = pageTitle(step.page);
      if (pager.shown() !== title) {
        pager.show(title);
      }
      const names = partsOf(step, title);
      let before: Located | null = null;
      for (let tries = 0; !gone; tries += 1) {
        const now = await locateParts(names, { width, height });
        const still = before !== null && now.all && sameBox(before.box, now.box);
        if (still || tries >= SETTLE_TRIES) {
          if (!gone) {
            setPart(now.box);
          }
          return;
        }
        before = now;
        await wait(SETTLE_MS);
      }
    }
    void find();
    return () => {
      gone = true;
    };
  }, [at, step, width, height, locateParts, end]);

  function next() {
    if (last) {
      end(true);
      return;
    }
    setPart(undefined);
    setAt(at + 1);
  }

  const screen = { width, height };
  const placed = part === undefined ? null : placeBubble(part, screen, insets, bubble);
  // On the water «Draw» has no «Word» nor «Image» (TASK-191).
  const words =
    step.id === "shape" && sport === "paddle"
      ? { ...texts.steps.shape, body: texts.shapeOnWater }
      : texts.steps[step.id];
  const waiting = left > 0;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: shown }]}
      testID="tour"
      accessibilityViewIsModal
    >
      {shadeAround(placed?.hole ?? null, screen).map((box) => (
        <View
          key={`${box.x},${box.y}`}
          style={[
            styles.shade,
            { left: box.x, top: box.y, width: box.width, height: box.height },
          ]}
        />
      ))}
      {placed?.hole && (
        <View
          testID="tour-light"
          pointerEvents="none"
          style={[
            styles.ring,
            {
              left: placed.hole.x,
              top: placed.hole.y,
              width: placed.hole.width,
              height: placed.hole.height,
            },
          ]}
        />
      )}
      {placed !== null && (
        <View
          style={[
            styles.bubble,
            { top: placed.bubbleTop },
            bubble === 0 && styles.unseen,
          ]}
          onLayout={(event) => setBubble(event.nativeEvent.layout.height)}
        >
          <Text style={styles.title} accessibilityRole="header">
            {words.title}
          </Text>
          <Text style={styles.body}>{words.body}</Text>
          <View style={styles.foot}>
            <View
              style={styles.dots}
              accessible
              accessibilityLabel={stepOf(texts, at + 1, TOUR_STEPS.length)}
            >
              {TOUR_STEPS.map((each, index) => (
                <View
                  key={each.id}
                  style={[styles.dot, index === at && styles.dotHere]}
                />
              ))}
            </View>
            <View style={styles.buttons}>
              {!last && (
                <Pressable
                  style={styles.skip}
                  onPress={() => end(true)}
                  disabled={waiting}
                  accessibilityRole="button"
                  accessibilityLabel={texts.skip}
                  accessibilityState={{ disabled: waiting }}
                >
                  <Text style={[styles.skipText, waiting && styles.skipWaiting]}>
                    {waiting ? `${texts.skip} (${left})` : texts.skip}
                  </Text>
                </Pressable>
              )}
              <Pressable style={styles.next} onPress={next} accessibilityRole="button">
                <Text style={styles.nextText}>{last ? texts.done : texts.next}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Seconds left from `seconds`, one less each second. A question of the
 * phone over the app (the position, at the first opening) stops the count:
 * the tour is not seen meanwhile.
 */
export function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);
  const counting = left > 0;
  useEffect(() => {
    if (!counting) {
      return;
    }
    const timer = setInterval(() => {
      const state = AppState.currentState;
      if (state !== "background" && state !== "inactive") {
        setLeft((now) => Math.max(0, now - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [counting]);
  return left;
}

const styles = StyleSheet.create({
  // Dark in both tones, lowered: the rest of the screen is still seen.
  shade: {
    position: "absolute",
    backgroundColor: color.scrim,
    opacity: SHADE,
  },
  // In light, not yellow: yellow is the route's.
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: color.onScrim,
    borderRadius: radius.md,
  },
  bubble: {
    position: "absolute",
    left: EDGE,
    right: EDGE,
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  // Laid out before it is seen: where it goes depends on its height.
  unseen: {
    opacity: 0,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: color.text,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.4,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    marginTop: space.xs,
  },
  dots: {
    flexDirection: "row",
    gap: space.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.border,
  },
  dotHere: {
    backgroundColor: color.text,
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  skip: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  skipText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  skipWaiting: {
    color: color.textFaint,
  },
  // Light on black: the one button of the tour, never yellow.
  next: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.text,
  },
  nextText: {
    color: color.background,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
