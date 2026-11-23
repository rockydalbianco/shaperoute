import { useEffect } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { runFacts, startedLabel, whereAndWhat } from "../activities/activityText";
import { RunDrawing } from "../activities/RunDrawing";
import { isTrackless } from "../activities/snow";
import { type Activity, isImported } from "../api/activities";
import { GymTile } from "../gym/GymTile";
import { t } from "../i18n";
import { ImportedMark } from "../imports/ImportedMark";
import { clockLabel } from "../navigation/freeRun";
import { isPoolSwimRun, PoolTile } from "../pool/PoolTile";
import { useDrawingsDoor } from "../social/drawingsDoor";
import type { PickPhoto } from "../social/PublicParts";
import { PublicRow } from "../social/PublicRow";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { useUnits } from "../units/useUnits";

/** The side of an activity's drawing in the list. */
const DRAWING = 64;

/** How much of the screen the form of the post may take in the sheet. */
export const PAST_FORM_SHARE = 0.6;

type Props = {
  /** The activity whose post is open; null: the list. The sheet keeps it,
   * so its «‹» goes back to the list first. */
  chosen: Activity | null;
  onChoose: (activity: Activity) => void;
  /** «Done» under the form: the sheet closes. */
  onDone: () => void;
  /** The fakes of the tests. */
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
};

/**
 * «Already recorded» in the Feed's «+» (TASK-481 part F, ADR-0390): the
 * activities of «My activities» that others do not see yet, the latest
 * first, and for the one chosen the form of «Edit post» (PublicRow, as the
 * card of the activity has it; the user's choice of 2026-11-23). An
 * activity becomes a post as it does there: «Everyone» or «Followers» in
 * «Who can see it», kept at once, or with the next network. Nothing new on
 * the API.
 */
export function PastActivityPost({ chosen, onChoose, onDone, pick, fetchFn }: Props) {
  if (chosen !== null) {
    return (
      <PastActivityForm
        activity={chosen}
        onDone={onDone}
        pick={pick}
        fetchFn={fetchFn}
      />
    );
  }
  return <PastActivityList onChoose={onChoose} />;
}

function PastActivityList({ onChoose }: { onChoose: (activity: Activity) => void }) {
  const activities = useActivitiesDoor();
  const { publicKeys, refreshMine } = useDrawingsDoor();
  const { refresh, clearProblem, list } = activities;
  // As it is on the API now, as «My activities» asks when it shows.
  useEffect(() => {
    clearProblem();
    refresh();
  }, [clearProblem, refresh]);
  // Which of them others see, again with each list that comes: back from a
  // form, the activity just posted leaves the list.
  useEffect(() => {
    refreshMine();
  }, [list, refreshMine]);
  // Written again when «Settings» changes the units.
  useUnits();
  const left = list.filter((activity) => !publicKeys.has(activity.id));

  if (list.length === 0) {
    if (activities.status === "loading") {
      return <Text style={styles.message}>{t("Loading your activities…")}</Text>;
    }
    if (activities.status === "failed") {
      return (
        <View style={styles.list}>
          <Text style={styles.message}>{t("Your activities could not load.")}</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <Text style={styles.message}>
        {t("No activities yet. Save a run when you finish it, and it is kept here.")}
      </Text>
    );
  }
  return (
    <View style={styles.list} testID="past-activity-list">
      {activities.problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {activities.problem}
        </Text>
      )}
      <Text style={styles.message}>
        {left.length === 0 && !activities.more
          ? t("All your activities are in the Feed already.")
          : t("Your activities not in the Feed yet, the latest first.")}
      </Text>
      {left.map((activity) => (
        <PastActivityRow
          key={activity.id}
          activity={activity}
          onPress={() => onChoose(activity)}
        />
      ))}
      {activities.more && (
        <Pressable
          style={[styles.button, activities.loadingMore && styles.busy]}
          onPress={activities.loadMore}
          disabled={activities.loadingMore}
          accessibilityRole="button"
          accessibilityState={{
            disabled: activities.loadingMore,
            busy: activities.loadingMore,
          }}
        >
          <Text style={styles.buttonText}>
            {t(activities.loadingMore ? "Loading…" : "Show more")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/** What says an activity: when, where and what, then how far and how fast
 * (a workout at the gym: its time), as a row of «My activities». */
function wordsOf(activity: Activity): { when: string; where: string; facts: string } {
  const pool = isPoolSwimRun(activity);
  return {
    when: startedLabel(activity.started_at),
    where:
      pool && activity.place === null
        ? t("Pool swim")
        : whereAndWhat(activity, activity.route_preview !== null),
    facts: isTrackless(activity.activity)
      ? clockLabel(activity.duration_s * 1000)
      : runFacts(activity),
  };
}

/** An activity of the list: as a row of «My activities», without its «…». */
function PastActivityRow({
  activity,
  onPress,
}: {
  activity: Activity;
  onPress: () => void;
}) {
  const { when, where, facts } = wordsOf(activity);
  return (
    <Tap
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${when}, ${where}, ${facts}`}
      testID="past-activity"
    >
      {isTrackless(activity.activity) ? (
        <GymTile width={DRAWING} height={DRAWING} />
      ) : isPoolSwimRun(activity) ? (
        <PoolTile width={DRAWING} height={DRAWING} />
      ) : (
        <RunDrawing
          route={activity.route_preview}
          track={activity.track_preview}
          width={DRAWING}
          height={DRAWING}
          rotationDeg={activity.rotation_deg}
        />
      )}
      <View style={styles.words}>
        <Text style={styles.heading} numberOfLines={1}>
          {when}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {where}
        </Text>
        <Text style={styles.facts} numberOfLines={1}>
          {facts}
        </Text>
        {isImported(activity) && <ImportedMark />}
      </View>
    </Tap>
  );
}

function PastActivityForm({
  activity,
  onDone,
  pick,
  fetchFn,
}: {
  activity: Activity;
  onDone: () => void;
  pick?: PickPhoto;
  fetchFn?: typeof fetch;
}) {
  const { when, where } = wordsOf(activity);
  // What is being typed goes first, as «Done» of «Edit post» does.
  function done() {
    Keyboard.dismiss();
    onDone();
  }
  return (
    <View style={styles.card} testID="past-activity-form">
      <Text style={styles.heading} numberOfLines={1}>
        {`${when} · ${where}`}
      </Text>
      <Text style={styles.message}>
        {t("Choose «Everyone» or «Followers» and it goes in the Feed.")}
      </Text>
      <PublicRow
        activityKey={activity.id}
        imported={isImported(activity)}
        track={activity.track_preview}
        rotationDeg={activity.rotation_deg ?? null}
        formShare={PAST_FORM_SHARE}
        pick={pick}
        fetchFn={fetchFn}
      />
      <Tap style={styles.button} onPress={done} accessibilityRole="button">
        <Text style={styles.buttonText}>{t("Done")}</Text>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  // As a row of «My activities» (ActivityRow.tsx).
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  facts: {
    color: color.text,
    fontSize: fontSize.small,
  },
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  // As «Show more» of «My activities».
  button: {
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  busy: {
    opacity: 0.6,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
