import { useSyncExternalStore } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { usePocketOn } from "./pocketOn";

function watchApp(onChange: () => void): () => void {
  const watching = AppState.addEventListener("change", onChange);
  return () => watching.remove();
}

/** Nothing to tell while nobody asks. */
function watchNothing(): () => void {
  return () => {};
}

function appState(): AppStateStatus {
  return AppState.currentState;
}

/**
 * Whether anyone can see the run's numbers (TASK-496): not with the app
 * behind another or the phone locked («background», and «inactive», the
 * step before), nor under the black screen of pocket mode. What only the
 * eye needs, a clock ticking each second, waits until then. The app is
 * watched only while `watching`: out of a run in progress the numbers are
 * seen.
 */
export function useRunSeen(watching: boolean): boolean {
  const pocket = usePocketOn();
  const state = useSyncExternalStore(
    watching ? watchApp : watchNothing,
    appState,
    appState,
  );
  return !watching || (state !== "background" && state !== "inactive" && !pocket);
}
