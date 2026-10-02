import { useSyncExternalStore } from "react";

import { openPause, type TrackFix } from "./trackRecorder";
import type { RunRecorder } from "./trackStore";

/**
 * The controls of the run in progress (TASK-169, ADR-0137): the countdown
 * before it, «Pause» and «Resume», the pause that comes by itself when the
 * runner stands still, and whether the voice speaks. One run at a time, as
 * in the run file (trackStore): the screens press here, and the recording
 * (useFreeRun, useNavigation) does what was pressed.
 */

/** From «Start» to the first metre that counts: 3, 2, 1. */
export const COUNTDOWN_MS = 3000;
/** Standing still this long pauses the run, when the runner wants it. */
export const AUTO_PAUSE_AFTER_MS = 10_000;
/** How often standing still is looked for. */
export const AUTO_PAUSE_CHECK_MS = 1000;

export type RunPhase = "idle" | "countdown" | "running" | "paused";

export type RunControl = {
  phase: RunPhase;
  /** When the countdown ends, in milliseconds; null out of it. */
  startsAtMs: number | null;
  /** Paused by standing still, not by the runner: moving again resumes. */
  auto: boolean;
  /** The runner's choices; they stay for the next run. */
  autoPause: boolean;
  voice: boolean;
};

let state: RunControl = {
  phase: "idle",
  startsAtMs: null,
  auto: false,
  autoPause: true,
  voice: true,
};

const listeners = new Set<() => void>();

function set(next: Partial<RunControl>): void {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener();
  }
}

export function runControl(): RunControl {
  return state;
}

export function subscribeRunControl(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The controls, for a screen: it is drawn again when they change. */
export function useRunControl(): RunControl {
  return useSyncExternalStore(subscribeRunControl, runControl, runControl);
}

export function setAutoPause(on: boolean): void {
  set({ autoPause: on });
}

export function setVoice(on: boolean): void {
  set({ voice: on });
}

type Session = {
  recorder: RunRecorder;
  onChange: () => void;
  say: (text: string) => void;
  arrived: boolean;
  countdown: ReturnType<typeof setTimeout> | null;
  watch: ReturnType<typeof setInterval>;
};

let session: Session | null = null;

/** The run waits, by the runner's hand. */
export function pauseRun(): void {
  if (session === null || state.phase !== "running" || session.arrived) {
    return;
  }
  session.recorder.pause(Date.now());
  set({ phase: "paused", auto: false });
  session.onChange();
}

/** The run goes on, whoever paused it. */
export function resumeRun(): void {
  if (session === null || state.phase !== "paused") {
    return;
  }
  session.recorder.resume(Date.now());
  set({ phase: "running", auto: false });
  session.onChange();
}

/** The countdown ends now: when it has run out, and in tests. */
export function skipCountdown(): void {
  if (session?.countdown) {
    clearTimeout(session.countdown);
    session.countdown = null;
  }
  if (state.phase === "countdown") {
    set({ phase: "running", startsAtMs: null });
  }
}

/** Since when the runner has not moved: the last fix, or the last «Resume». */
function stillSinceMs(recorder: RunRecorder): number | null {
  const track = recorder.track();
  const last = track.fixes[track.fixes.length - 1];
  if (last === undefined) {
    return null;
  }
  const pause = track.pauses?.[track.pauses.length - 1];
  return Math.max(last.timeMs, pause?.toMs ?? 0);
}

function watchStanding(): void {
  if (
    session === null ||
    session.arrived ||
    !state.autoPause ||
    state.phase !== "running"
  ) {
    return;
  }
  const since = stillSinceMs(session.recorder);
  const now = Date.now();
  if (since === null || now - since < AUTO_PAUSE_AFTER_MS) {
    return;
  }
  session.recorder.pause(now, true);
  set({ phase: "paused", auto: true });
  session.say("Paused.");
  session.onChange();
}

export type RunSession = {
  /** A fix from the GPS, for the track: dropped during the countdown. */
  onFix(fix: TrackFix, arrived: boolean): void;
  /** The run is left: the controls are free for the next one. */
  end(): void;
};

/**
 * Puts the run that `recorder` records under these controls until `end`.
 * A new run begins with the countdown; one taken up again goes on at once.
 * `onChange` is called when a control changed the track, `say` with what the
 * voice has to tell (it is the caller's to keep quiet when the voice is off).
 */
export function controlRun(
  recorder: RunRecorder,
  { onChange, say }: { onChange: () => void; say: (text: string) => void },
): RunSession {
  // One run at a time: a run still under the controls leaves them.
  if (session !== null) {
    if (session.countdown) {
      clearTimeout(session.countdown);
    }
    clearInterval(session.watch);
  }
  const fresh = recorder.track().fixes.length === 0;
  const mine: Session = {
    recorder,
    onChange,
    say,
    arrived: false,
    countdown: fresh ? setTimeout(skipCountdown, COUNTDOWN_MS) : null,
    watch: setInterval(watchStanding, AUTO_PAUSE_CHECK_MS),
  };
  session = mine;
  set({
    phase: fresh ? "countdown" : "running",
    startsAtMs: fresh ? Date.now() + COUNTDOWN_MS : null,
    auto: false,
  });
  return {
    onFix(fix, arrived) {
      if (session !== mine || state.phase === "countdown") {
        return;
      }
      recorder.onFix(fix, arrived);
      mine.arrived = mine.arrived || arrived;
      // Moving again ended the pause that standing still began.
      if (state.phase === "paused" && state.auto && !openPause(recorder.track())) {
        set({ phase: "running", auto: false });
        say("Resumed.");
      }
    },
    end() {
      if (mine.countdown) {
        clearTimeout(mine.countdown);
      }
      clearInterval(mine.watch);
      if (session === mine) {
        session = null;
        set({ phase: "idle", startsAtMs: null, auto: false });
      }
    },
  };
}
