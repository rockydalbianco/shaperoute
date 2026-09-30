import type { TrackScoreResult } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { requestTrackScore, type ScoreOutcome } from "../api/trackScores";
import { distanceLabel } from "../navigation/phrases";
import { durationMs } from "../navigation/trackRecorder";
import type { ScorableRun } from "../navigation/trackStore";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * The end of a run (TASK-113): over the map, which shows the run on its
 * route, the score from 0 to 100 that the engine gives it (ADR-0090), how
 * far and how long. The run stays on the phone until it has its score.
 */

export type ScoreState =
  | { status: "loading" }
  | { status: "scored"; score: TrackScoreResult }
  /** The engine refuses the run: too little of it to judge. */
  | { status: "too_short" }
  /** No API to ask: the run is kept for later. */
  | { status: "offline" }
  | { status: "failed" };

/** What the screen shows for an answer of the API; null for none yet. */
function stateOf(outcome: ScoreOutcome): ScoreState | null {
  switch (outcome.kind) {
    case "score":
      return { status: "scored", score: outcome.score };
    case "api_error":
      // The one request the engine refuses: a run with too little in it.
      return { status: outcome.code === "invalid_request" ? "too_short" : "failed" };
    case "unreachable":
      return { status: "offline" };
    case "bad_answer":
      return { status: "failed" };
    case "cancelled":
      return null;
  }
}

/** Asks the API for the score of `run`; `retry` asks again. */
export function useTrackScore(
  apiUrl: string | null,
  run: ScorableRun,
  fetchFn?: typeof fetch,
): { state: ScoreState; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  // The answer, with the question it answers: another run or another try
  // is waiting again.
  const [answer, setAnswer] = useState<{
    run: ScorableRun;
    attempt: number;
    state: ScoreState;
  } | null>(null);

  useEffect(() => {
    if (apiUrl === null) {
      return;
    }
    const stop = new AbortController();
    void requestTrackScore(apiUrl, run, { signal: stop.signal, fetchFn }).then(
      (outcome) => {
        const state = stateOf(outcome);
        if (state !== null) {
          setAnswer({ run, attempt, state });
        }
      },
    );
    return () => stop.abort();
  }, [apiUrl, run, fetchFn, attempt]);

  const state: ScoreState =
    apiUrl === null
      ? { status: "offline" }
      : answer !== null && answer.run === run && answer.attempt === attempt
        ? answer.state
        : { status: "loading" };
  return { state, retry: () => setAttempt((n) => n + 1) };
}

/** "32 min", "1 h 05 min": how long the run took, pauses included. */
export function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/** Whether leaving the screen may forget the run: only once it is judged. */
export function isSettled(state: ScoreState): boolean {
  return state.status === "scored" || state.status === "too_short";
}

export function FinishBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Your run</Text>
      <Text style={styles.message}>Yellow: the route. White: what you ran.</Text>
    </View>
  );
}

type Props = {
  apiUrl: string | null;
  run: ScorableRun;
  /** Leaves the screen; `settled` when the run has its score and can go. */
  onDone: (settled: boolean) => void;
  /** Goes back to the run, when it was stopped and its route is still here. */
  onResume?: () => void;
  fetchFn?: typeof fetch;
};

export function FinishCard({ apiUrl, run, onDone, onResume, fetchFn }: Props) {
  const { state, retry } = useTrackScore(apiUrl, run, fetchFn);
  const facts = `${distanceLabel(run.track.distanceM)} · ${durationLabel(durationMs(run.track))}`;
  return (
    <View style={styles.card}>
      <View style={styles.result} accessibilityLiveRegion="polite">
        {state.status === "scored" ? (
          <View style={styles.row}>
            <Text
              style={styles.score}
              accessibilityLabel={`Score: ${state.score.score} out of 100`}
            >
              {state.score.score}
            </Text>
            <View style={styles.words}>
              <Text style={styles.outOf}>out of 100</Text>
              <Text style={styles.message}>
                {facts} · {Math.round(state.score.covered * 100)}% of the route
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{TITLES[state.status]}</Text>
            <Text style={styles.message}>{facts}</Text>
            {state.status !== "loading" && (
              <Text style={styles.message}>{DETAILS[state.status]}</Text>
            )}
          </>
        )}
      </View>
      <View style={styles.buttons}>
        {(state.status === "offline" || state.status === "failed") && (
          <Pressable style={styles.button} onPress={retry} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        )}
        {onResume && (
          <Pressable
            style={styles.button}
            onPress={onResume}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Keep running</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.button}
          onPress={() => onDone(isSettled(state))}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const TITLES: Record<Exclude<ScoreState["status"], "scored">, string> = {
  loading: "Scoring your run…",
  too_short: "Too short for a score",
  offline: "The score will come later",
  failed: "The score did not arrive",
};

const DETAILS: Record<"too_short" | "offline" | "failed", string> = {
  too_short: "Run more of the route to get one.",
  offline:
    "The app cannot reach the API now. Your run is saved on this phone: open the app again when you are connected.",
  failed: "Something went wrong. Your run is saved on this phone.",
};

const styles = StyleSheet.create({
  banner: {
    flex: 1,
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  bannerText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  card: {
    gap: space.md,
  },
  result: {
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  score: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  words: {
    flex: 1,
  },
  outOf: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  title: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
