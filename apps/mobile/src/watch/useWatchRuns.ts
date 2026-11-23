import { useEffect, useRef, useState } from "react";

import { type WatchFiles, watchFiles } from "./watchLink";
import { type WatchRun, watchRunOf } from "./watchRun";
import {
  type PendingWatchRun,
  PHONE_WATCH_RUN_DOORS,
  pendingWatchRuns,
  receiveWatchFile,
  setWatchRunOpener,
  subscribeWatchRuns,
  type WatchRunDoors,
} from "./watchRuns";

/**
 * The workouts of the Apple Watch, for the whole app (TASK-370 part B3c2):
 * the files the watch sends are kept and told about (watchRuns.ts), those
 * that came while the app was closed too; «Open» on the card shows one with
 * `open`, the app's end of a run (App.tsx).
 */
export function useWatchRuns(
  open: (run: WatchRun) => void,
  {
    files = watchFiles(),
    doors = PHONE_WATCH_RUN_DOORS,
  }: { files?: WatchFiles | null; doors?: WatchRunDoors } = {},
): void {
  const opening = useRef(open);
  useEffect(() => {
    opening.current = open;
  });
  useEffect(() => {
    setWatchRunOpener((pending) => opening.current(watchRunOf(pending.track)));
    const stop = files?.listen((file) => {
      void receiveWatchFile(file, files, doors);
    });
    return () => {
      setWatchRunOpener(null);
      stop?.();
    };
  }, [files, doors]);
}

/** The workouts waiting, kept up to date for the card. */
export function usePendingWatchRuns(
  doors: WatchRunDoors = PHONE_WATCH_RUN_DOORS,
): PendingWatchRun[] {
  const [runs, setRuns] = useState(() => pendingWatchRuns(doors));
  useEffect(() => subscribeWatchRuns(() => setRuns(pendingWatchRuns(doors))), [doors]);
  return runs;
}
