import { useEffect, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

import { selectionFeel } from "../haptics/haptics";
import { segmentPillFace, segmentTrackFace } from "../screens/Segmented";
import { color, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { springTo } from "../ui/motion";
import { Tap } from "../ui/Tap";
import { useGlassMode } from "../ui/useGlassMode";
import { useReduceMotion } from "../ui/useReduceMotion";

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The tabs of «Play» (TASK-423, the motion the user asked for: «1–4, solo
 * Play»): the look of `screens/Segmented`, with the chosen pill sliding to
 * the tab touched on a spring, a light tick of the phone, and each tab
 * answering the finger (`ui/Tap`). With «Reduce Motion» the pill is just
 * there. Only «Play» has the tick and the touch. The track and the pill look
 * as `Segmented`'s: glass with the pill standing out of it (TASK-469 A3).
 */
export function PlayTabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: Props<T>) {
  const still = useReduceMotion();
  const mode = useGlassMode();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [at] = useState(() => new Animated.Value(index));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (still) {
      at.setValue(index);
      return;
    }
    const slide = springTo(at, index, "snappy");
    slide.start();
    return () => slide.stop();
  }, [at, index, still]);

  // Each tab's width, from the track's: the pill is one of them.
  const count = Math.max(1, options.length);
  const tab = width > 0 ? (width - 2 * space.xs - (count - 1) * space.xs) / count : 0;
  const translateX = at.interpolate({
    inputRange: [0, Math.max(1, count - 1)],
    outputRange: [0, Math.max(1, count - 1) * (tab + space.xs)],
  });

  return (
    <View
      style={[styles.track, segmentTrackFace(mode), style]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      testID="play-tabs"
    >
      {tab > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            segmentPillFace(mode),
            { width: tab, transform: [{ translateX }] },
          ]}
          testID="play-tabs-pill"
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Tap
            key={option.value}
            style={styles.tab}
            onPress={() => {
              if (!selected) {
                selectionFeel();
              }
              onChange(option.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.text, selected && styles.textSelected]}>
              {option.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: space.xs,
    gap: space.xs,
    borderRadius: radius.pill,
  },
  pill: {
    position: "absolute",
    top: space.xs,
    bottom: space.xs,
    left: space.xs,
    borderRadius: radius.pill,
  },
  tab: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  text: {
    textAlign: "center",
    color: color.text,
    fontWeight: fontWeight.medium,
  },
  textSelected: {
    fontWeight: fontWeight.bold,
  },
});
