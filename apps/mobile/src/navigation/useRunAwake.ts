import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

/** The keep-awake tag of a run, beside pocket mode's: each clears its own. */
export const RUN_AWAKE_TAG = "run";

/**
 * The screen stays on for the whole run (TASK-255, ADR-0219), not only in
 * pocket mode: the GPS is followed in the foreground only, so a phone that
 * locks itself with the map in view would stop recording and the voice
 * without a word, and join the line again with a straight stretch. Best
 * effort, as pocket mode's: if the phone refuses, the run goes on.
 */
export function useRunAwake(on: boolean): void {
  useEffect(() => {
    if (!on) {
      return;
    }
    activateKeepAwakeAsync(RUN_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(RUN_AWAKE_TAG).catch(() => {});
    };
  }, [on]);
}
