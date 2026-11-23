import { useEffect, useRef, useState } from "react";
import { type StyleProp, Text, type TextStyle } from "react-native";

import { motion } from "../theme/tokens";
import { useReduceMotion } from "../ui/useReduceMotion";

/** How long a number takes to reach its value: two sheets' time. */
export const COUNT_MS = 2 * motion.sheetMs;

/** Where a count is `part` (0 to 1) of the way: fast, then settling. */
export function countAt(from: number, to: number, part: number): number {
  const done = Math.min(1, Math.max(0, part));
  return Math.round(from + (to - from) * (1 - Math.pow(1 - done, 3)));
}

type Props = {
  /** The number to reach; null for none («—»). */
  value: number | null;
  /** How a number is written; whole numbers by default. */
  format?: (value: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

/**
 * A number that counts up to its value (TASK-489 part H): from zero when
 * it comes, from where it was when it changes. With «Reduce Motion» it is
 * its value at once. Screen readers are told the value by what holds it
 * (its label), never the numbers on the way.
 */
export function CountUp({ value, format = String, style, testID }: Props) {
  if (value === null) {
    return (
      <Text style={style} testID={testID}>
        —
      </Text>
    );
  }
  // A number after a dash is a new number: it comes from zero again.
  return <Counting value={value} format={format} style={style} testID={testID} />;
}

function Counting({
  value,
  format,
  style,
  testID,
}: {
  value: number;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  const still = useReduceMotion();
  // Where the count is: set by the frames of the count only.
  const [counted, setCounted] = useState<number | null>(null);
  const at = useRef(0);

  useEffect(() => {
    if (still) {
      // Nothing is counted; when motion is back the number comes anew.
      at.current = 0;
      return;
    }
    const from = at.current;
    if (from === value) {
      return;
    }
    let frame = 0;
    let began: number | null = null;
    const step = (now: number) => {
      began ??= now;
      const part = (now - began) / COUNT_MS;
      const next = countAt(from, value, part);
      at.current = next;
      setCounted(next);
      if (part < 1) {
        frame = requestAnimationFrame(step);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, still]);

  return (
    <Text style={style} testID={testID}>
      {format(still ? value : (counted ?? 0))}
    </Text>
  );
}
