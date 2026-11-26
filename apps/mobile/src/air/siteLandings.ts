import type { LatLon } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { apiUrl } from "../api/apiUrl";
import { type Box, fetchLandings, type FlyingSites } from "../api/flyingSites";
import { t, tLater } from "../i18n";
import { type KeptList, keptList } from "../storage/keptList";
import type { Waypoint } from "./waypoints";

/**
 * The landings of OpenStreetMap around the take-off (TASK-479 part D6,
 * ADR-0388), from our server's free-flight sites (TASK-493): asked once
 * when a flight starts, kept on the phone for the air, where there is often
 * no network, and asked again for another place or after a week. With no
 * site on the server, or no network, the pilot has the landings of their
 * file and their own, as before.
 */

export const SITE_LANDINGS_FILE = "site-landings.json";
/** A landing OSM has no name for. */
export const UNNAMED_LANDING = tLater("Landing");
/** The box around the take-off, degrees of latitude each way. */
export const AROUND_DEG = 0.25;
/** Landings older than this are asked again. */
export const STALE_MS = 7 * 24 * 3600 * 1000;

export type KeptLandings = {
  box: Box;
  fetchedAtMs: number;
  landings: Waypoint[];
  attribution: string;
};

function isKept(value: unknown): value is KeptLandings {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const one = value as Record<string, unknown>;
  const box = one.box as Record<string, unknown> | null;
  return (
    typeof one.fetchedAtMs === "number" &&
    typeof one.attribution === "string" &&
    Array.isArray(one.landings) &&
    box !== null &&
    typeof box === "object" &&
    ["south", "west", "north", "east"].every((k) => typeof box[k] === "number")
  );
}

const kept: KeptList<KeptLandings> = keptList(SITE_LANDINGS_FILE, isKept);

/** The box around `here`: as wide east–west as north–south on the ground. */
export function boxAround([lat, lon]: LatLon): Box {
  const across = AROUND_DEG / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  return {
    south: Math.max(-90, lat - AROUND_DEG),
    north: Math.min(90, lat + AROUND_DEG),
    west: Math.max(-180, lon - across),
    east: Math.min(180, lon + across),
  };
}

const inside = (box: Box, [lat, lon]: LatLon) =>
  lat >= box.south && lat <= box.north && lon >= box.west && lon <= box.east;

/** Whether the landings kept still serve a flight from `here`. */
export function stillGood(
  landings: KeptLandings | null,
  here: LatLon,
  nowMs: number,
): boolean {
  return (
    landings !== null &&
    inside(landings.box, here) &&
    nowMs - landings.fetchedAtMs < STALE_MS
  );
}

/** The server's sites as waypoints: landings, with their height when OSM
 * has it. */
export function landingsOf(sites: FlyingSites): Waypoint[] {
  return sites.sites
    .filter((site) => site.kind === "landing")
    .map((site) => ({
      name: site.name ?? t(UNNAMED_LANDING),
      code: null,
      point: [site.lat, site.lon] as LatLon,
      altM: site.ele_m,
      landing: true,
      description: null,
    }));
}

let current: KeptLandings | null | undefined;
const listeners = new Set<() => void>();

export function siteLandingsNow(
  list: KeptList<KeptLandings> = kept,
): KeptLandings | null {
  if (current === undefined) {
    current = list.load()[0] ?? null;
  }
  return current;
}

/**
 * The landings around `here`, asked of the server unless the kept ones
 * still serve. Never throws: without an answer the kept ones stay.
 */
export async function refreshSiteLandings(
  here: LatLon,
  nowMs: number,
  ask: (box: Box) => ReturnType<typeof fetchLandings> | null = (box) => {
    const base = apiUrl();
    return base === null ? null : fetchLandings(base, box);
  },
  list: KeptList<KeptLandings> = kept,
): Promise<"kept" | "fetched" | "failed"> {
  if (stillGood(siteLandingsNow(list), here, nowMs)) {
    return "kept";
  }
  const box = boxAround(here);
  try {
    const asked = ask(box);
    const outcome = asked === null ? null : await asked;
    if (outcome === null || outcome.kind !== "ok") {
      return "failed";
    }
    const next: KeptLandings = {
      box,
      fetchedAtMs: nowMs,
      landings: landingsOf(outcome.value),
      attribution: outcome.value.attribution,
    };
    list.save([next]);
    current = next;
    for (const listener of listeners) {
      listener();
    }
    return "fetched";
  } catch {
    return "failed";
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSiteLandings(): KeptLandings | null {
  return useSyncExternalStore(subscribe, () => siteLandingsNow());
}

/** For tests: as when the app starts. */
export function resetSiteLandings(): void {
  current = undefined;
  listeners.clear();
}
