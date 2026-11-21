import { useEffect, useState } from "react";

import { showSavedLogo } from "../intro/SavedLogo";
import type { RoutineKey } from "../stretch/routines";
import { StretchScreen } from "../stretch/StretchScreen";
import { chosenRoutine } from "./stretchChoice";
import { useStretchOutbox } from "./useStretchOutbox";

/**
 * A stretching session of the sport «Stretching» over the whole app
 * (TASK-475 part B, ADR-0386), from «Start stretching» in «Draw»: the
 * stretching screen of TASK-466 with the routine ticked there, which asks
 * how long first. As it ends the session is kept and goes to the API, as a
 * workout at the gym (GymWorkoutHost), and the logo says «Saved to My
 * activities»; a session with no exercise held to its end keeps nothing.
 * Those left from before go from here too. `fetchFn` is for the tests.
 */

const listeners = new Set<(routine: RoutineKey) => void>();

/** «Start stretching»: the routine ticked on «Draw», unless one is on. */
export function startStretchSession(routine: RoutineKey = chosenRoutine()): void {
  listeners.forEach((listener) => listener(routine));
}

export function StretchSessionHost({ fetchFn }: { fetchFn?: typeof fetch } = {}) {
  const [routine, setRoutine] = useState<RoutineKey | null>(null);
  const { save } = useStretchOutbox(fetchFn);
  useEffect(() => {
    const start = (next: RoutineKey) => setRoutine((on) => on ?? next);
    listeners.add(start);
    return () => {
      listeners.delete(start);
    };
  }, []);
  if (routine === null) {
    return null;
  }
  return (
    <StretchScreen
      routine={routine}
      onDone={(done) => {
        const kept = save(done);
        if (kept === "kept") {
          showSavedLogo();
        }
      }}
      onLeave={() => setRoutine(null)}
    />
  );
}
