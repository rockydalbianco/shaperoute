import { useEffect, useRef } from "react";

import type { PositionState } from "../location/useCurrentPosition";
import { activityOf, loadSport } from "../settings/sport";
import { type PhoneEngine, phoneEngine } from "./phoneEngine";
import {
  coveringZone,
  downloadZone,
  NETWORKS,
  type Network,
  savedZones,
} from "./zones";

/**
 * At each opening of the app, once the position is known, the zones of the
 * phone around it: first the network of the sport of «Settings», then the
 * other (TASK-214, choice 4). Without asking, on any network, also on mobile
 * data (the user's choice of 2026-10-03); a zone the phone has costs a 304.
 * With a zone around the phone, Python starts ahead of the first route.
 */
export function usePhoneZones(
  position: PositionState,
  baseUrl: string | null,
  {
    engine = phoneEngine,
    download = downloadZone,
  }: { engine?: PhoneEngine; download?: typeof downloadZone } = {},
): void {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || baseUrl === null || position.status !== "ok") {
      return;
    }
    done.current = true;
    const point = position.point;
    void (async () => {
      let ready = false;
      for (const network of networksInOrder()) {
        const answer = await download(baseUrl, network, point);
        ready ||= answer.kind === "saved" || answer.kind === "unchanged";
        // Offline at the opening: the zone saved before still counts.
        ready ||= coveringZone(savedZones(), network, point) !== null;
      }
      if (ready) {
        engine.warmUp();
      }
    })();
  }, [position, baseUrl, engine, download]);
}

/** The networks the phone draws on, that of the chosen sport first. */
export function networksInOrder(
  first: Network | undefined = NETWORKS[activityOf(loadSport())],
) {
  const all = [...new Set(Object.values(NETWORKS))];
  return first === undefined
    ? all
    : [first, ...all.filter((network) => network !== first)];
}
