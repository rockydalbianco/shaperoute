import type { SleepSummary } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { loadSleepOn } from "./sleepChoice";
import { readLastNight, type SleepReader } from "./sleepSamples";

/**
 * The night before an activity at `atMs`, read once from `reader` when the
 * end of the activity opens (TASK-467 part B2). Null, and nothing read:
 * without a reader (every build until part C), without the user's yes to
 * reading the sleep (`sleepChoice.ts`), and while it comes. No permission
 * is asked here: that is the «Sleep» card's of the profile.
 */
export function useLastNight(
  reader: SleepReader | null,
  atMs: number,
): SleepSummary | null {
  const [night, setNight] = useState<SleepSummary | null>(null);
  useEffect(() => {
    if (reader === null || !loadSleepOn()) {
      return;
    }
    let live = true;
    void readLastNight(reader, atMs).then((found) => {
      if (live) {
        setNight(found);
      }
    });
    return () => {
      live = false;
    };
  }, [reader, atMs]);
  return reader === null ? null : night;
}
