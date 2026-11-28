import * as Sharing from "expo-sharing";
import { type ReactElement, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { RunVideo } from "../share/RunVideo";
import { type VideoOutcome, videoProblem } from "../share/videoFile";
import type { VideoScene } from "../share/videoScene";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import {
  ROUTINE_VIDEO_FILE,
  type RoutineVideo,
  routineVideoScene,
} from "./routineVideo";

/**
 * «Export video» on a stretching category's page (TASK-520 part F,
 * ADR-0415; the user's choices of 2026-11-27): the routine on the page as a
 * vertical video, made on the phone and handed to the share sheet. Nothing
 * is published and nothing leaves the phone unless the person shares it.
 *
 * The video is made as a run's is (`share/RunVideo.tsx`): a hidden page
 * draws and encodes the pictures of `routineVideoScene`, with no map, no
 * animal and no music to wait for. The words are the run's video's own.
 *
 * Two pieces for the page to place: `layer`, the hidden page while a video
 * is made, to mount first, at the page's top corner, under everything else
 * (a page out of sight may get nothing drawn on a phone); and `pill`, the
 * button, with what went wrong under it.
 */
export function useRoutineVideo(routine: RoutineVideo): {
  layer: ReactElement | null;
  pill: ReactElement;
} {
  const [scene, setScene] = useState<VideoScene | null>(null);
  const [made, setMade] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  // One video at a time, however quick the second press.
  const asked = useRef(false);

  async function exportVideo() {
    if (asked.current) {
      return;
    }
    asked.current = true;
    setProblem(null);
    if (!(await Sharing.isAvailableAsync())) {
      asked.current = false;
      setProblem(videoProblem("no_sharing"));
      return;
    }
    setMade(0);
    setScene(routineVideoScene(routine));
  }

  function ended(outcome: VideoOutcome) {
    asked.current = false;
    setScene(null);
    setProblem(videoProblem(outcome));
  }

  const busy = scene !== null;
  const label = busy
    ? t("Making the video… {percent}%", { percent: Math.round(made * 100) })
    : t("Export video");
  return {
    layer: busy ? (
      <RunVideo
        scene={scene}
        fallback={scene}
        music={null}
        fileName={ROUTINE_VIDEO_FILE}
        onProgress={setMade}
        onEnd={ended}
      />
    ) : null,
    pill: (
      <View style={styles.column}>
        <Tap
          style={[styles.pill, busy && styles.busy]}
          onPress={() => void exportVideo()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ busy, disabled: busy }}
          testID="stretch-video"
        >
          <Text style={styles.text}>{label}</Text>
        </Tap>
        {problem !== null && (
          <Text style={styles.problem} accessibilityRole="alert">
            {problem}
          </Text>
        )}
      </View>
    ),
  };
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: "flex-start",
    gap: space.xs,
  },
  pill: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  busy: {
    opacity: 0.7,
  },
  text: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
});
