import { useEffect, useState } from "react";

import { showSavedLogo } from "../intro/SavedLogo";
import type { Exercise } from "../stretch/exercises";
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

/**
 * What a session is of: one of the three routines, whose length the screen
 * asks first; or the routine composed from a category of the stretching
 * home (TASK-520, ADR-0415), its exercises and minutes already chosen.
 */
export type StretchSession =
  | { routine: RoutineKey }
  | { category: string; minutes: number; exercises: readonly Exercise[] };

const listeners = new Set<(session: StretchSession) => void>();

/** «Start stretching»: the routine ticked on «Draw», unless one is on. */
export function startStretchSession(routine: RoutineKey = chosenRoutine()): void {
  listeners.forEach((listener) => listener({ routine }));
}

/** «Start» on the stretching home or on a category's page: that routine, at
 * once, unless a session is on. */
export function startCategorySession(
  category: string,
  minutes: number,
  exercises: readonly Exercise[],
): void {
  listeners.forEach((listener) => listener({ category, minutes, exercises }));
}

export function StretchSessionHost({ fetchFn }: { fetchFn?: typeof fetch } = {}) {
  const [session, setSession] = useState<StretchSession | null>(null);
  const { save } = useStretchOutbox(fetchFn);
  useEffect(() => {
    const start = (next: StretchSession) => setSession((on) => on ?? next);
    listeners.add(start);
    return () => {
      listeners.delete(start);
    };
  }, []);
  if (session === null) {
    return null;
  }
  return (
    <StretchScreen
      {...("routine" in session
        ? { routine: session.routine }
        : {
            exercises: session.exercises,
            session: { routine: session.category, minutes: session.minutes },
          })}
      onDone={(done) => {
        const kept = save(done);
        if (kept === "kept") {
          showSavedLogo();
        }
      }}
      onLeave={() => setSession(null)}
    />
  );
}
