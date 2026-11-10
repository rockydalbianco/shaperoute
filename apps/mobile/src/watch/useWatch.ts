import { useEffect, useRef, useState } from "react";

import {
  pauseRun,
  resumeRun,
  type RunPhase,
  runControl,
  subscribeRunControl,
} from "../navigation/runControl";
import { appUnits, subscribeUnits, type Units } from "../units/units";
import { type WatchLink, watchLink } from "./watchLink";
import type { WatchPhase } from "./watchMessages";
import { type WatchWaker, watchWaker } from "./watchWake";

/**
 * The run on the phone and the workout on the Apple Watch together
 * (TASK-370 part A3, ADR-0314): the same state on both.
 * - To the watch: the units chosen on the phone, as user info (the package
 *   sends the application context back, so they cannot go there); the
 *   run's countdown starts the watch's workout with the sport, «Pause»
 *   and «Resume» (by hand or by standing still) go as commands, and the
 *   end of the run ends it.
 * - From the watch: its state, as a message or from the application
 *   context; a pause, a resume and the end from the wrist do the same on
 *   the phone. Only a change seen between two of its states counts: a
 *   state sent before the phone's command, arriving after it, changes
 *   nothing. And the heart rate, for the screen.
 * The live heart rate of HealthKit's mirrored session needs native code
 * (`workoutSessionMirroringStartHandler`): it comes with the watch's build,
 * A-flip. Until then the watch sends it every 5 s, as it does its state.
 */

/** The watch's clock and the phone's may differ: a state this much older
 * than the run screen is still this run's. */
export const CLOCK_SLACK_MS = 5000;

/** The phases in which the watch has a workout it saves in Apple Health. */
const RECORDING: readonly WatchPhase[] = ["running", "paused", "finished"];

let watchRecorded = false;

/**
 * Whether the watch recorded the last run: then it saves the workout in
 * Apple Health itself, and the phone does not write it again (one
 * activity, one workout, TASK-321). Until the next run's countdown.
 */
export function watchSavesWorkout(): boolean {
  return watchRecorded;
}

export type FollowWatch = {
  /** The run's sport, as the watch knows sports: an activity of the app. */
  activity: string;
  /** The watch ended the workout: the run ends, as with «Stop». */
  onEnd: () => void;
  /** The heart rate the watch measures; null once its workout is over. */
  onHeart: (bpm: number | null) => void;
  /** Wakes the watch app at the countdown (part B4); none in Expo Go. */
  wake?: WatchWaker | null;
  now?: () => number;
};

/** Follows the run and the watch through `link` until the function it
 * returns is called: when the run screen goes, which ends the watch's
 * workout too. */
export function followWatch(
  link: WatchLink,
  { activity, onEnd, onHeart, wake = watchWaker(), now = Date.now }: FollowWatch,
): () => void {
  const since = now() - CLOCK_SLACK_MS;
  let phonePhase: RunPhase = "idle";
  /** The phone started the watch's workout. */
  let started = false;
  let ended = false;
  let watchPhase: WatchPhase | null = null;

  const end = () => {
    const over = watchPhase === "finished" || watchPhase === "ready";
    if (ended || over || !(started || watchRecorded)) {
      return;
    }
    ended = true;
    link.send({ type: "command", command: "end", from: "phone", at: now() });
  };

  const sendUnits = (units: Units) => {
    link.transfer({ type: "settings", units, at: now() });
  };
  sendUnits(appUnits());
  const stopUnits = subscribeUnits(sendUnits);

  // The start message reaches the watch only with MuW open there: Apple
  // wakes the app (part B4), and once it is up the start goes again, with
  // the app's sport. A watch already in its workout lets it go. Without
  // Apple Health's permission for workouts, or without a watch, Apple says
  // no: the run on the phone goes on all the same.
  const wakeWatch = () => {
    if (wake === null) {
      return;
    }
    const asked = wake(activity).catch(() => false);
    void asked.then((woken) => {
      const still = started && !ended && phonePhase !== "idle";
      if (woken && still && watchPhase === null) {
        link.send({
          type: "command",
          command: "start",
          activity,
          from: "phone",
          at: now(),
        });
      }
    });
  };

  const onControl = () => {
    const previous = phonePhase;
    const next = runControl().phase;
    phonePhase = next;
    if (next === previous) {
      return;
    }
    const at = now();
    if (next === "countdown") {
      // A new run: the watch starts with it, and records it afresh.
      watchRecorded = false;
      started = true;
      ended = false;
      watchPhase = null;
      link.send({ type: "command", command: "start", activity, from: "phone", at });
      wakeWatch();
    } else if (previous === "running" && next === "paused") {
      link.send({ type: "command", command: "pause", from: "phone", at });
    } else if (previous === "paused" && next === "running") {
      link.send({ type: "command", command: "resume", from: "phone", at });
    } else if (next === "idle") {
      end();
    }
  };
  onControl();
  const stopControl = subscribeRunControl(onControl);

  const stopListening = link.listen((message) => {
    if (message.type === "heartRate") {
      if (message.at >= since) {
        onHeart(message.bpm);
      }
      return;
    }
    if (message.type !== "state" || message.from !== "watch" || message.at < since) {
      return;
    }
    const previous = watchPhase;
    const next = message.phase;
    watchPhase = next;
    if (RECORDING.includes(next)) {
      watchRecorded = true;
    }
    if (next === "finished" || next === "ready") {
      onHeart(null);
    }
    if (previous === null || previous === next) {
      return;
    }
    if (previous === "running" && next === "paused" && phonePhase === "running") {
      pauseRun();
    } else if (previous === "paused" && next === "running" && phonePhase === "paused") {
      resumeRun();
    } else if (next === "finished" && phonePhase !== "idle" && !ended) {
      ended = true;
      onEnd();
    }
  });

  return () => {
    stopUnits();
    stopControl();
    stopListening();
    end();
  };
}

/**
 * The watch along the run of the screen that shows it; the heart rate it
 * measures, null without a watch. Nothing at all in an app without the
 * native module (every build until the watch's, the 1.1).
 */
export function useWatch(
  activity: string,
  onEnd: () => void,
  link: WatchLink | null = watchLink(),
): number | null {
  const [bpm, setBpm] = useState<number | null>(null);
  const endRef = useRef(onEnd);
  useEffect(() => {
    endRef.current = onEnd;
  }, [onEnd]);
  useEffect(() => {
    if (link === null) {
      return;
    }
    return followWatch(link, {
      activity,
      onEnd: () => endRef.current(),
      onHeart: setBpm,
    });
  }, [link, activity]);
  return bpm;
}
