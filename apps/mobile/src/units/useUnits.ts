import { useSyncExternalStore } from "react";

import { appUnits, subscribeUnits, type Units } from "./units";

/**
 * The units the app shows distances in, and a new render each time
 * «Settings» changes them (TASK-182). Each component that writes a distance
 * calls it, so what is on the screen follows at once (ADR-0149).
 */
export function useUnits(): Units {
  return useSyncExternalStore(subscribeUnits, appUnits);
}
