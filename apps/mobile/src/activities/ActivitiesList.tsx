import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Activity } from "../api/activities";
import { t, tPlural } from "../i18n";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { waitingText } from "../social/PublicParts";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useUnits } from "../units/useUnits";
import { useActivitiesDoor } from "./activitiesDoor";
import { runFacts, startedLabel, whereAndWhat } from "./activityText";
import { RunDrawing } from "./RunDrawing";

/** The side of a run's drawing in the list. */
const DRAWING = 88;

/**
 * «My activities» in «Profile» (TASK-172): the runs the account recorded,
 * the latest first, a page at a time. A row opens its run on the map;
 * «Delete» asks first. A public run says so (TASK-117).
 */
export function ActivitiesList() {
  const activities = useActivitiesDoor();
  const { publicKeys, refreshMine } = useDrawingsDoor();
  // The run whose «Delete» was tapped, waiting for a yes.
  const [confirming, setConfirming] = useState<string | null>(null);
  const { refresh, clearProblem, list } = activities;
  // As it is on the API now: a run may have been saved or deleted since.
  useEffect(() => {
    clearProblem();
    refresh();
  }, [clearProblem, refresh]);
  // Which runs are public, again with each list that comes.
  useEffect(() => {
    refreshMine();
  }, [list, refreshMine]);

  return (
    <View style={styles.list}>
      {activities.problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {activities.problem}
        </Text>
      )}
      {activities.waiting > 0 && (
        <Text style={styles.message}>
          {tPlural(
            activities.waiting,
            "{count} run is on this phone, waiting for a connection.",
            "{count} runs are on this phone, waiting for a connection.",
          )}
        </Text>
      )}
      {activities.waitingPublic > 0 && (
        <Text style={styles.message}>{waitingText(true)}</Text>
      )}
      {activities.list.length > 0 ? (
        <>
          {activities.list.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isPublic={publicKeys.has(activity.id)}
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
                {t(activities.loadingMore ? "Loading…" : "Show more")}
              </Text>
            </Pressable>
          )}
        </>
      ) : activities.status === "loading" ? (
        <Text style={styles.message}>{t("Loading your activities…")}</Text>
      ) : activities.status === "failed" ? (
        <>
          <Text style={styles.message}>{t("Your activities could not load.")}</Text>
          <Pressable style={styles.button} onPress={refresh} accessibilityRole="button">
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.message}>
          {t("No activities yet. Save a run when you finish it, and it is kept here.")}
        </Text>
      )}
    </View>
  );
}

type RowProps = {
  activity: Activity;
  /** Made public: a drawing in the profile (TASK-117). */
  isPublic: boolean;
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
  isPublic,
  opening,
  confirming,
  onOpen,
  onAsk,
  onKeep,
  onDelete,
}: RowProps) {
  const when = startedLabel(activity.started_at);
  const where = whereAndWhat(activity, activity.route_preview !== null);
  // Written again when «Settings» changes the units (TASK-182).
  useUnits();
  const facts = runFacts(activity);
  return (
    <View style={styles.row} testID="activity-row">
      <Pressable
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={t(
          isPublic
            ? "{when}, {where}, {facts}, public, open on the map"
            : "{when}, {where}, {facts}, open on the map",
          { when, where, facts },
        )}
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
            {opening ? t("Opening…") : facts}
          </Text>
          {isPublic && (
            <Text style={styles.mark} testID="activity-public">
              {t("Public")}
            </Text>
          )}
        </View>
      </Pressable>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {t("Delete this run? It cannot be undone.")}
          </Text>
          <View style={styles.confirmButtons}>
            <Pressable
              style={[styles.button, styles.half]}
              onPress={onKeep}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Keep it")}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.half, styles.danger]}
              onPress={onDelete}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.dangerText]}>
                {t("Delete run")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.quiet}
          onPress={onAsk}
          accessibilityRole="button"
          accessibilityLabel={t("Delete the run of {when}", { when })}
          hitSlop={space.sm}
        >
          <Text style={styles.dangerText}>{t("Delete")}</Text>
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
  // Neutral, as every mark that is not the route's.
  mark: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
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
