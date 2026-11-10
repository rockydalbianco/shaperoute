import {
  LIVE_PAUSED_UPDATE_EVERY_S,
  LIVE_POINT_EVERY_S,
  LIVE_POINTS_PER_UPDATE_MAX,
  LIVE_UPDATE_EVERY_S,
  type LiveShare,
  type LiveState,
  type LiveStats,
  type LiveUpdate,
} from "@shaperoute/shared-types";

import type { LiveAnswer } from "./liveShareApi";

/**
 * One live link while it lasts (TASK-424 part B1, ADR-0352): the points
 * waiting to go, when the next update is due, and what the answers mean.
 * No timer and no clock of its own: whoever holds it calls `tick` (at each
 * fix of the position task, and every few seconds in front), so the rhythm
 * is tested with a clock in hand.
 *
 * - Moving, an update every 15 s with the points taken since the last one
 *   (one every 5 s at most, 200 at most per update) and the numbers of the
 *   moment. A pause, a resume and the end go at once; paused, one every
 *   60 s.
 * - Without network the points wait, 500 at most: the oldest go first.
 * - A 410 (or 404, 401) ends the link here too; the end of the activity
 *   sends `finished`, tried a few times.
 */

export const UPDATE_EVERY_MS = LIVE_UPDATE_EVERY_S * 1000;
export const PAUSED_UPDATE_EVERY_MS = LIVE_PAUSED_UPDATE_EVERY_S * 1000;
export const POINT_EVERY_MS = LIVE_POINT_EVERY_S * 1000;
export const POINTS_PER_UPDATE = LIVE_POINTS_PER_UPDATE_MAX;
/** Points kept while the network is away: 40 minutes at one every 5 s. */
export const QUEUE_MAX = 500;
/** Times the end is sent before giving up: the link expires by itself. */
export const FINISH_TRIES = 4;

/** Why a link is over on the phone. */
export type LiveEnd = "finished" | "stopped" | "ended";

type QueuedPoint = { lat: number; lon: number; atMs: number };

export type LiveSharerDeps = {
  /** POST …/updates for this link. */
  update: (update: LiveUpdate) => Promise<LiveAnswer<LiveShare>>;
  /** DELETE for this link. */
  stop: () => Promise<LiveAnswer<null>>;
  /** The numbers of the moment, and whether the activity moves. */
  stats: () => LiveStats;
  state: () => Exclude<LiveState, "finished">;
  now: () => number;
  /** Called once, when the link is over. */
  onEnd: (why: LiveEnd) => void;
};

export class LiveSharer {
  private queue: QueuedPoint[] = [];
  private lastPointMs: number | null = null;
  /** The last update tried, and the state it carried. */
  private lastTryMs: number | null = null;
  private lastTryState: LiveState | null = null;
  private lastTryOk = false;
  /** The last update carried all the points it could. */
  private lastTryFull = false;
  private inFlight: Promise<void> | null = null;
  private finishing = false;
  private finishTries = 0;
  private over: LiveEnd | null = null;

  constructor(private readonly deps: LiveSharerDeps) {}

  /** Why the link is over, or null while it lasts. */
  get ended(): LiveEnd | null {
    return this.over;
  }

  /** The points waiting to go. */
  get waiting(): number {
    return this.queue.length;
  }

  /** A fix of the position task. Kept while moving, one every 5 s. */
  point(lat: number, lon: number, atMs: number): void {
    if (this.over !== null || this.finishing || this.deps.state() !== "live") {
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(atMs)) {
      return;
    }
    if (this.lastPointMs !== null && atMs - this.lastPointMs < POINT_EVERY_MS) {
      return;
    }
    this.lastPointMs = atMs;
    this.queue.push({ lat, lon, atMs });
    if (this.queue.length > QUEUE_MAX) {
      this.queue.splice(0, this.queue.length - QUEUE_MAX);
    }
  }

  /** The state an update would carry now. */
  private stateNow(): LiveState {
    return this.finishing ? "finished" : this.deps.state();
  }

  /** Whether an update should go now. */
  due(): boolean {
    if (this.over !== null || this.inFlight !== null) {
      return false;
    }
    const state = this.stateNow();
    if (this.lastTryMs === null || state !== this.lastTryState) {
      return true;
    }
    // Points left behind by a full update: the next one at once.
    if (this.lastTryOk && this.lastTryFull && this.queue.length > 0) {
      return true;
    }
    const every = state === "paused" ? PAUSED_UPDATE_EVERY_MS : UPDATE_EVERY_MS;
    return this.deps.now() - this.lastTryMs >= every;
  }

  /** Sends an update if one is due; resolves when it is answered. */
  tick(): Promise<void> {
    if (!this.due()) {
      return this.inFlight ?? Promise.resolve();
    }
    const flight = this.send().finally(() => {
      this.inFlight = null;
    });
    this.inFlight = flight;
    return flight;
  }

  /** The activity ended: `finished` goes now, and again if it fails. */
  finish(): Promise<void> {
    if (this.over !== null) {
      return Promise.resolve();
    }
    this.finishing = true;
    return (this.inFlight ?? Promise.resolve()).then(() => this.tick());
  }

  /** The runner stopped sharing: over here at once, then the DELETE. */
  async stop(): Promise<void> {
    if (this.over !== null) {
      return;
    }
    this.end("stopped");
    const answer = await this.deps.stop();
    if (answer.kind === "retry") {
      // Once more: else the link lasts until it expires by itself.
      await this.deps.stop();
    }
  }

  private end(why: LiveEnd): void {
    if (this.over !== null) {
      return;
    }
    this.over = why;
    this.queue = [];
    this.deps.onEnd(why);
  }

  private async send(): Promise<void> {
    const state = this.stateNow();
    const batch = this.queue.slice(0, POINTS_PER_UPDATE);
    this.lastTryMs = this.deps.now();
    this.lastTryState = state;
    this.lastTryFull = batch.length === POINTS_PER_UPDATE;
    const answer = await this.deps.update({
      points: batch.map(({ lat, lon, atMs }) => ({
        lat,
        lon,
        at: new Date(atMs).toISOString(),
      })),
      stats: this.deps.stats(),
      state,
    });
    if (this.over !== null) {
      // Stopped while the update was on its way.
      return;
    }
    this.lastTryOk = answer.kind === "ok";
    if (answer.kind === "ended") {
      this.end("ended");
      return;
    }
    if (answer.kind === "ok" || answer.kind === "rejected") {
      // Gone, or refused for good: never sent again. By time, as the
      // oldest may have left the queue while the update was on its way.
      const lastMs = batch[batch.length - 1]?.atMs;
      if (lastMs !== undefined) {
        this.queue = this.queue.filter((point) => point.atMs > lastMs);
      }
    }
    if (state === "finished") {
      this.finishTries += 1;
      if (answer.kind !== "retry" || this.finishTries >= FINISH_TRIES) {
        this.end("finished");
      }
      return;
    }
    if (
      answer.kind === "ok" &&
      answer.value.status !== "live" &&
      answer.value.status !== "paused"
    ) {
      this.end("ended");
    }
  }
}
