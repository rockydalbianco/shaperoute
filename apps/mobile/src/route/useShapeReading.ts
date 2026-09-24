import type { Shape } from "@shaperoute/shared-types";
import { useCallback, useState } from "react";

import { requestShapeReading, type ShapeReadingOutcome } from "../api/shapeReadings";

/** What can go wrong while the AI reads the words (see problems.ts). */
export type ShapeProblem =
  Exclude<ShapeReadingOutcome, { kind: "reading" }> | { kind: "no_api_url" };

/** Where the AI stands with some words the table does not know. */
export type ShapeReadingState =
  /** Not asked yet: the words are sent when the user is done typing. */
  | { status: "unread" }
  | { status: "reading" }
  /** Null: no shape of the catalogue fits the words. */
  | { status: "read"; shape: Shape | null }
  /** Not remembered: reading the same words again asks again. */
  | { status: "failed"; problem: ShapeProblem };

const UNREAD: ShapeReadingState = { status: "unread" };

/** The same words whatever the case and the spaces, like the API's cache. */
function keyOf(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The AI's readings of the words the table does not know (ADR-0012), kept
 * for the session: the same words are asked once.
 */
export function useShapeReading(baseUrl: string | null): {
  stateOf: (text: string) => ShapeReadingState;
  read: (text: string) => void;
} {
  const [readings, setReadings] = useState<ReadonlyMap<string, ShapeReadingState>>(
    new Map(),
  );

  const stateOf = useCallback(
    (text: string) => readings.get(keyOf(text)) ?? UNREAD,
    [readings],
  );

  const read = useCallback(
    (text: string) => {
      const key = keyOf(text);
      const status = readings.get(key)?.status;
      if (!key || status === "reading" || status === "read") {
        return;
      }
      const settle = (state: ShapeReadingState) =>
        setReadings((now) => new Map(now).set(key, state));
      if (!baseUrl) {
        settle({ status: "failed", problem: { kind: "no_api_url" } });
        return;
      }
      settle({ status: "reading" });
      void requestShapeReading(baseUrl, text.trim()).then((outcome) =>
        settle(
          outcome.kind === "reading"
            ? { status: "read", shape: outcome.shape }
            : { status: "failed", problem: outcome },
        ),
      );
    },
    [baseUrl, readings],
  );

  return { stateOf, read };
}
