import type { LiveShareSent, LiveStats, RunActivity } from "@shaperoute/shared-types";
import { useSyncExternalStore } from "react";

import { emptyTrack, MAX_ACCURACY_M, type Track } from "../navigation/trackRecorder";
import {
  createLiveShare,
  createLiveShareMade,
  type LiveApiOptions,
  makeLiveLink,
  sendLiveShareTo,
  sendLiveUpdate,
  stopLiveShareRequest,
} from "./liveShareApi";
import { type LiveEnd, LiveSharer } from "./liveSharer";
import { liveStats } from "./liveStats";

/**
 * The live link of the activity under way (TASK-424 part B1, ADR-0352):
 * one at a time, as the run. It lives here, outside React, because the
 * position task feeds it with the phone locked (`navigation/runPosition.ts`
 * calls `liveShareFix`): no task of its own. The recording screen tells it
 * the numbers (`observeLiveShare`) and the end (`finishLiveShare`); the
 * button starts and stops it. It starts only from the button, never by
 * itself.
 */

export type LiveShareStatus =
  | { kind: "off" }
  /** POST /me/live-shares on its way. */
  | { kind: "starting" }
  /** `url` null for a share made only for the chat (TASK-468 part B1),
   * until «Share link». */
  | { kind: "sharing"; id: string; url: string | null };

/** What the recording screen knows, for the numbers of the next update. */
export type LiveSnapshot = {
  track: Track;
  kcal: number | null;
  bpm: number | null;
  paused: boolean;
  /** A recording without a track (a swim in a pool, a workout at the gym,
   * part B2): its numbers at a time, in place of the track's. */
  numbers?: (atMs: number) => LiveStats;
};

/** In front, an update can be due with no fix: a pause, the end. */
export const TICK_MS = 5000;

const OFF: LiveShareStatus = { kind: "off" };

let status: LiveShareStatus = OFF;
let sharer: LiveSharer | null = null;
/** The requests of the share on: its link later, «Send in MuW». */
let sharing: LiveApiOptions | null = null;
let snapshot: LiveSnapshot = {
  track: emptyTrack(),
  kcal: null,
  bpm: null,
  paused: false,
};
/** When the activity ended: the time stops there. */
let endedAtMs: number | null = null;
/** The fixes of `snapshot.track` already handed to the link. */
let fedFixes = 0;
/** The activity ended while the link was being made. */
let cancelled = false;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function put(next: LiveShareStatus): void {
  status = next;
  for (const listener of listeners) {
    listener();
  }
}

function startTimer(): void {
  if (timer === null) {
    timer = setInterval(() => void sharer?.tick(), TICK_MS);
  }
}

function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

export function liveShareStatus(): LiveShareStatus {
  return status;
}

export function subscribeLiveShare(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The link's state, drawn again when it changes. */
export function useLiveShare(): LiveShareStatus {
  return useSyncExternalStore(subscribeLiveShare, liveShareStatus, liveShareStatus);
}

export type StartOutcome =
  | { kind: "started"; id: string; url: string | null }
  /** The link could not be made: say so, and nothing is shared. */
  | { kind: "failed" }
  /** A link is already on, or on its way. */
  | { kind: "busy" };

/** Makes the link of the activity under way and starts sending. */
export async function startLiveShare(
  api: LiveApiOptions,
  activity: RunActivity,
  /** A swim in a pool: its pool, and the page shows lengths (part B2). */
  poolLengthM: number | null = null,
  /** TASK-468 part B1: without its link, for the chat only; the heart rate
   * to the viewers in the app (off unless turned on). */
  choice: { link?: boolean; heartVisible?: boolean } = {},
): Promise<StartOutcome> {
  if (status.kind !== "off") {
    return { kind: "busy" };
  }
  cancelled = false;
  put({ kind: "starting" });
  const request = {
    activity,
    ...(poolLengthM === null ? {} : { pool_length_m: poolLengthM }),
    ...(choice.link === false ? { link: false } : {}),
    ...(choice.heartVisible === true ? { heart_visible: true } : {}),
  };
  const answer =
    choice.link === false
      ? await createLiveShareMade(api, request)
      : await createLiveShare(api, request);
  if (answer.kind !== "ok") {
    put(OFF);
    return { kind: "failed" };
  }
  const { id, url } = answer.value;
  if (cancelled) {
    // The activity ended meanwhile: the link goes before anyone has it.
    put(OFF);
    void stopLiveShareRequest(api, id);
    return { kind: "failed" };
  }
  endedAtMs = null;
  // The route from here on: the server takes no point much older.
  fedFixes = snapshot.track.fixes.length;
  const mine: LiveSharer = new LiveSharer({
    update: (update) => sendLiveUpdate(api, id, update),
    stop: () => stopLiveShareRequest(api, id),
    stats: () => {
      const atMs = endedAtMs ?? Date.now();
      return snapshot.numbers !== undefined
        ? snapshot.numbers(atMs)
        : liveStats(snapshot.track, atMs, snapshot.kcal, snapshot.bpm);
    },
    state: () => (snapshot.paused ? "paused" : "live"),
    now: () => Date.now(),
    onEnd: (_why: LiveEnd) => {
      if (sharer === mine) {
        sharer = null;
        sharing = null;
        stopTimer();
        put(OFF);
      }
    },
  });
  sharer = mine;
  sharing = api;
  put({ kind: "sharing", id, url });
  startTimer();
  // The first update at once: the page shows the numbers from the start.
  void mine.tick();
  return { kind: "started", id, url };
}

/** «Share link» while a share made for the chat is on (TASK-468 part B1):
 * its link, made now; null when it could not be made. */
export async function liveShareLink(): Promise<string | null> {
  const api = sharing;
  if (status.kind !== "sharing" || api === null) {
    return null;
  }
  if (status.url !== null) {
    return status.url;
  }
  const { id } = status;
  const answer = await makeLiveLink(api, id);
  if (answer.kind !== "ok" || status.kind !== "sharing" || status.id !== id) {
    return null;
  }
  put({ kind: "sharing", id, url: answer.value.url });
  return answer.value.url;
}

/** «Send in MuW» (TASK-468 part B1): the share in a message to each
 * person; null when it could not be sent. */
export async function sendLiveTo(publicIds: string[]): Promise<LiveShareSent | null> {
  const api = sharing;
  if (status.kind !== "sharing" || api === null || publicIds.length === 0) {
    return null;
  }
  const answer = await sendLiveShareTo(api, status.id, publicIds);
  return answer.kind === "ok" ? answer.value : null;
}

/** «Stop sharing»: the link stops now, its points go on the server. */
export async function stopLiveShare(): Promise<void> {
  cancelled = true;
  await sharer?.stop();
}

/** A fix of the position task, in front or with the phone locked. */
export function liveShareFix(position: {
  coords: { latitude: number; longitude: number; accuracy: number | null };
  timestamp: number;
}): void {
  const mine = sharer;
  if (mine === null) {
    return;
  }
  const { latitude, longitude, accuracy } = position.coords;
  // Where the runner was not (ADR-0070): the track leaves it out too.
  if (accuracy === null || accuracy <= MAX_ACCURACY_M) {
    mine.point(latitude, longitude, position.timestamp);
  }
  void mine.tick();
}

/** The recording screen's numbers, again at each change. A pause or a
 * resume goes at once. Its track's new fixes go to the link too: where the
 * GPS is followed in the foreground only, they are the only ones; else the
 * task's came first, and the same fix is not taken twice. */
export function observeLiveShare(next: LiveSnapshot): void {
  const fixes = next.track.fixes;
  if (fixes.length < fedFixes) {
    // A new track: a new activity.
    fedFixes = 0;
  }
  snapshot = next;
  const mine = sharer;
  if (mine === null) {
    return;
  }
  for (let i = fedFixes; i < fixes.length; i += 1) {
    const [lat, lon] = fixes[i].point;
    mine.point(lat, lon, fixes[i].timeMs);
  }
  fedFixes = fixes.length;
  void mine.tick();
}

/** The numbers of a recording without a track (part B2: a swim in a pool, a
 * workout at the gym), again at each change: no points, the numbers worked
 * out at the time of each update. A pause or a resume goes at once. */
export function observeLiveNumbers(
  numbers: (atMs: number) => LiveStats,
  paused: boolean,
): void {
  observeLiveShare({ track: emptyTrack(), kcal: null, bpm: null, paused, numbers });
}

/** The activity ended: `finished`, and the link lasts one hour more. */
export function finishLiveShare(): void {
  if (status.kind === "starting") {
    cancelled = true;
  }
  const mine = sharer;
  if (mine === null) {
    return;
  }
  endedAtMs ??= Date.now();
  void mine.finish();
}

/** For the tests: as when the app opens. */
export function resetLiveShare(): void {
  stopTimer();
  sharer = null;
  sharing = null;
  status = OFF;
  snapshot = { track: emptyTrack(), kcal: null, bpm: null, paused: false };
  endedAtMs = null;
  fedFixes = 0;
  cancelled = false;
  listeners.clear();
}
