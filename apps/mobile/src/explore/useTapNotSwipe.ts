import { useRef } from "react";
import type { GestureResponderEvent } from "react-native";

/** How far a finger may move, in points, and still have tapped: as in «Feed». */
export const TAP_SLOP = 12;

type TapHandlers = {
  /** Remembers where the finger came down. */
  onPressIn: (event: GestureResponderEvent) => void;
  /** Calls `onTap`, unless the finger has moved further than `TAP_SLOP`. */
  onPress: (event: GestureResponderEvent) => void;
};

/**
 * The press handlers of a card a swipe must not open (TASK-196), as a
 * drawing of «Feed» does since TASK-188 (ADR-0151). On the last page a swipe
 * towards the page that is not there moves nothing, so nothing takes the
 * touch away, and it would end as a tap on the card it crossed. The card
 * remembers where the finger came down and ignores one that has moved.
 */
export function useTapNotSwipe(onTap: (() => void) | undefined): TapHandlers {
  const down = useRef<{ x: number; y: number } | null>(null);
  function onPressIn({ nativeEvent }: GestureResponderEvent) {
    down.current = { x: nativeEvent.pageX, y: nativeEvent.pageY };
  }
  function onPress({ nativeEvent }: GestureResponderEvent) {
    const from = down.current;
    down.current = null;
    const moved =
      from === null
        ? 0
        : Math.hypot(nativeEvent.pageX - from.x, nativeEvent.pageY - from.y);
    if (moved <= TAP_SLOP) {
      onTap?.();
    }
  }
  return { onPressIn, onPress };
}
