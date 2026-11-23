import { useCallback, useEffect, useRef } from "react";

/** How long a tap waits for a second one, in ms: after it, it was one tap. */
export const DOUBLE_TAP_MS = 300;

/**
 * Taps on the picture of a post (TASK-454 part B, the user's choice of
 * 2026-11-11): two close in time are its super like, one alone does what a
 * tap did before, once the wait for a second is over. The function it gives
 * takes each tap, with what that tap does alone.
 *
 * Without `onDouble` (a post nobody can react to) a tap is one tap at once:
 * nothing waits where two taps mean nothing. A picture that goes away while
 * a tap waits takes it along.
 */
export function useDoubleTap(
  onDouble: (() => void) | undefined,
): (alone: () => void) => void {
  // The tap that waits for a second one, and what it does alone.
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The newest answer to two taps, for the function made once.
  const double = useRef(onDouble);
  useEffect(() => {
    double.current = onDouble;
  }, [onDouble]);
  useEffect(
    () => () => {
      if (waiting.current !== null) {
        clearTimeout(waiting.current);
        waiting.current = null;
      }
    },
    [],
  );
  return useCallback((alone: () => void) => {
    const twice = double.current;
    if (twice === undefined) {
      alone();
      return;
    }
    if (waiting.current !== null) {
      // The second: neither tap does what one alone does.
      clearTimeout(waiting.current);
      waiting.current = null;
      twice();
      return;
    }
    waiting.current = setTimeout(() => {
      waiting.current = null;
      alone();
    }, DOUBLE_TAP_MS);
  }, []);
}
