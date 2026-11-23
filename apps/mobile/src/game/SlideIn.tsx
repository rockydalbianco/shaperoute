import { type ReactNode, useEffect, useState } from "react";
import { Animated } from "react-native";

import { springTo } from "../ui/motion";
import { useReduceMotion } from "../ui/useReduceMotion";

type Props = {
  /** Where it comes from: a page opened comes from the right, the list a
   * page goes back to from the left. */
  from: "right" | "left";
  children: ReactNode;
  testID?: string;
};

/** How far a page starts from where it rests, in points. */
export const SLIDE_POINTS = 32;

/**
 * A page of «Play» coming in (TASK-423, «1–4, solo Play»): a collection,
 * «Prizes» or a team opened slides in from the right and fades in; back on
 * the list, it comes from the left. On a spring, on the native driver. With
 * «Reduce Motion» it is just there. Give it a new `key` for each page.
 */
export function SlideIn({ from, children, testID }: Props) {
  const still = useReduceMotion();
  const [shown] = useState(() => new Animated.Value(still ? 1 : 0));

  useEffect(() => {
    if (still) {
      shown.setValue(1);
      return;
    }
    const enter = springTo(shown, 1, "smooth");
    enter.start();
    return () => enter.stop();
  }, [shown, still]);

  const translateX = shown.interpolate({
    inputRange: [0, 1],
    outputRange: [from === "right" ? SLIDE_POINTS : -SLIDE_POINTS, 0],
  });
  const opacity = shown.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }} testID={testID}>
      {children}
    </Animated.View>
  );
}
