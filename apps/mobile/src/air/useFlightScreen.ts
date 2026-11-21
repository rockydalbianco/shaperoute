import { useEffect, useRef, useState } from "react";

import { afterFlightNotice } from "./flightNotice";
import type { PhaseKind } from "./flightParts";

/**
 * When the flight screen is open (TASK-479 part B1; the user's choice of
 * 2026-11-21, «Si apre da sola»): it opens by itself at the take-off, when
 * the recording's phase turns «In the air», once for each take-off; «Map»
 * closes it and «Flight screen» opens it again. Never over the notice of
 * the first flight: after it.
 */
export function useFlightScreen(
  phase: PhaseKind,
  live: boolean,
): { open: boolean; show: () => void; hide: () => void } {
  const [open, setOpen] = useState(false);
  const before = useRef<PhaseKind>(phase);
  useEffect(() => {
    const was = before.current;
    before.current = phase;
    if (live && was === "foot" && phase === "air") {
      afterFlightNotice(() => setOpen(true));
    }
  }, [phase, live]);
  // The recording over, the screen of the end, not of the flight.
  return { open: live && open, show: () => setOpen(true), hide: () => setOpen(false) };
}
