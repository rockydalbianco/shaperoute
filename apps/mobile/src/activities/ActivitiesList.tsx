import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Activity } from "../api/activities";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useActivitiesDoor } from "./activitiesDoor";
import { runFacts, startedLabel, whereAndWhat } from "./activityText";
import { RunDrawing } from "./RunDrawing";

/** The side of a run's drawing in the list. */
const DRAWING = 88;

/**
 * «My activities» in «Profile» (TASK-172): the runs the account recorded,
 * the latest first, a page at a time. A row opens its run on the map;
 * «Delete» asks first.
 */
export function ActivitiesList() {
  const activities = useActivitiesDoor();
  // The run whose «Delete» was tapped, waiting for a yes.
  const [confirming, setConfirming] = useState<string | null>(null);
  const { refresh, clearProblem } = activities;
  // As it is on the API now: a run may have been saved or deleted since.
  useEffect(() => {
    clearProblem();
    refresh();
  }, [clearProblem, refresh]);

  return (
    <View style={styles.list}>
      {activities.problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {activities.problem}
        </Text>
      )}
      {activities.waiting > 0 && (
        <Text style={styles.message}>
          {activities.waiting === 1
            ? "1 run is on this phone, waiting for a connection."
            : `${activities.waiting} runs are on this phone, waiting for a connection.`}
        </Text>
      )}
      {activities.list.length > 0 ? (
        <>
          {activities.list.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              opening={activities.opening === activity.id}
              confirming={confirming === activity.id}
              onOpen={() => activities.open(activity)}
              onAsk={() => setConfirming(activity.id)}
              onKeep={() => setConfirming(null)}
              onDelete={() => {
                setConfirming(null);
                activities.remove(activity.id);
              }}
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
                {activities.loadingMore ? "Loading…" : "Show more"}
              </Text>
            </Pressable>
          )}
        </>
      ) : activities.status === "loading" ? (
        <Text style={styles.message}>Loading your activities…</Text>
      ) : activities.status === "failed" ? (
        <>
          <Text style={styles.message}>Your activities could not load.</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.message}>
          No activities yet. Your runs are saved here when you finish them.
        </Text>
      )}
    </View>
  );
}

type RowProps = {
  activity: Activity;
  /** Its run is being fetched whole, for the map. */
  opening: boolean;
  /** «Delete» was tapped: the row asks before the run goes. */
  confirming: boolean;
  onOpen: () => void;
  onAsk: () => void;
  onKeep: () => void;
  onDelete: () => void;
};

function ActivityRow({
  activity,
  opening,
  confirming,
  onOpen,
  onAsk,
  onKeep,
  onDelete,
}: RowProps) {
  const when = startedLabel(activity.started_at);
  const where = whereAndWhat(activity, activity.route_preview !== null);
  const facts = runFacts(activity);
  return (
    <View style={styles.row} testID="activity-row">
      <Pressable
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${when}, ${where}, ${facts}, open on the map`}
      >
        <RunDrawing
          route={activity.route_preview}
          track={activity.track_preview}
          width={DRAWING}
          height={DRAWING}
        />
        <View style={styles.words}>
          <Text style={styles.when} numberOfLines={1}>
            {when}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {where}
          </Text>
          <Text style={styles.facts} numberOfLines={1}>
            {opening ? "Opening…" : facts}
          </Text>
          {activity.score !== null && (
            <Text
              style={styles.detail}
              accessibilityLabel={`Score: ${activity.score} out of 100`}
            >
              {`Score ${activity.score}`}
            </Text>
          )}
        </View>
      </Pressable>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Delete this run? It cannot be undone.</Text>
          <View style={styles.confirmButtons}>
            <Pressable
              style={[styles.button, styles.half]}
              onPress={onKeep}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Keep it</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.half, styles.danger]}
              onPress={onDelete}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.dangerText]}>Delete run</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.quiet}
          onPress={onAsk}
          accessibilityRole="button"
          accessibilityLabel={`Delete the run of ${when}`}
          hitSlop={space.sm}
        >
          <Text style={styles.dangerText}>Delete</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
  row: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  open: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  pressed: {
    opacity: 0.6,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  when: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  detail: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  facts: {
    color: color.text,
    fontSize: fontSize.small,
  },
  quiet: {
    alignSelf: "flex-end",
    minHeight: MIN_TAP_SIZE - space.md,
    justifyContent: "center",
  },
  confirm: {
    gap: space.sm,
  },
  confirmText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: space.sm,
  },
  half: {
    flex: 1,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.body,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  danger: {
    borderColor: color.error,
  },
  dangerText: {
    color: color.error,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  busy: {
    opacity: 0.6,
  },
});
