import { useEffect, useState } from "react";

import {
  canChoose,
  DEFAULT_SPORT,
  loadSport,
  type Sport,
  subscribeSport,
} from "./sport";

/**
 * The sport chosen in «Settings» (TASK-190): read from the phone once, then
 * each new choice as it is made, so «Draw» follows it without a restart. A
 * sport that is not ready reads as «Run», as on the phone (loadSport).
 */
export function useSport(): Sport {
  const [sport, setSport] = useState<Sport>(() => loadSport());
  useEffect(
    () =>
      subscribeSport((chosen) => setSport(canChoose(chosen) ? chosen : DEFAULT_SPORT)),
    [],
  );
  return sport;
}
