import { useEffect, useRef, useState } from "react";

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

/** Smaller than any zone, larger than an error the server sends: what is
 * told under it is not a map. */
export const NOTICE_MIN_BYTES = 100_000;

/**
 * At each opening of the app, once the position is known, the zones of the
 * phone around it: first the network of the sport of «Settings», then the
 * other (TASK-214, choice 4). Without asking, on any network, also on mobile
 * data (the user's choice of 2026-10-03); a zone the phone has costs a 304.
 * With a zone around the phone, Python starts ahead of the first route.
 *
 * Gives the bytes of the first maps of the phone while they download, for
 * the notice over «Draw route» (part C), else null. Only the first: when
 * the phone has no zone as the app opens, after the install or «Delete»
 * in «Settings»; never for the zones after them (the user's choice).
 */
export function usePhoneZones(
  position: PositionState,
  baseUrl: string | null,
  {
    engine = phoneEngine,
    download = downloadZone,
  }: { engine?: PhoneEngine; download?: typeof downloadZone } = {},
): number | null {
  const done = useRef(false);
  const [firstBytes, setFirstBytes] = useState<number | null>(null);

  useEffect(() => {
    if (done.current || baseUrl === null || position.status !== "ok") {
      return;
    }
    done.current = true;
    const point = position.point;
    const first = savedZones().length === 0;
    // The maps of both networks, told as one size as each starts.
    let told = 0;
    const onSize = (bytes: number) => {
      if (bytes >= NOTICE_MIN_BYTES) {
        told += bytes;
        setFirstBytes(told);
      }
    };
    void (async () => {
      let ready = false;
      for (const network of networksInOrder()) {
        const answer = await download(baseUrl, network, point, first ? { onSize } : {});
        ready ||= answer.kind === "saved" || answer.kind === "unchanged";
        // Offline at the opening: the zone saved before still counts.
        ready ||= coveringZone(savedZones(), network, point) !== null;
      }
      setFirstBytes(null);
      if (ready) {
        engine.warmUp();
      }
    })();
  }, [position, baseUrl, engine, download]);

  return firstBytes;
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
