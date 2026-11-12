import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t, tPlural } from "../i18n";
import { AddPastActivity } from "../imports/AddPastActivity";
import { WatchRunCard } from "../watch/WatchRunCard";
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
import { Tap } from "../ui/Tap";
import { runDistanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import { type RefusedRun, useActivitiesDoor } from "./activitiesDoor";
import {
  ActivityCalendarSheet,
  activityCalendarTitle,
  CalendarIcon,
} from "./ActivityCalendar";
import { ActivityRow } from "./ActivityRow";
import { startedLabel } from "./activityText";

/**
 * «My activities» in «Profile» (TASK-172): the runs the account recorded,
 * the latest first, a page at a time, each a row (ActivityRow.tsx). Over
 * them, the runs of this phone the API will not take, with its reason and
 * «Discard» (TASK-257); over all, «Add past activity» (TASK-312), and over
 * that «Calendar», the calendar of every sport of the profile (TASK-462).
 */
export function ActivitiesList() {
  const activities = useActivitiesDoor();
  const { publicKeys, postTitles, refreshMine } = useDrawingsDoor();
  // The refused run whose «Discard» was tapped, waiting for a yes.
  const [confirming, setConfirming] = useState<string | null>(null);
  // The calendar of every sport (TASK-462), the same as the profile's.
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { refresh, clearProblem, list } = activities;
  // The refused ones are not waiting for a connection: they have rows.
  const waiting = activities.waiting - activities.refused.length;
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
      {activities.list.length > 0 && (
        <>
          <Tap
            style={styles.button}
            onPress={() => setCalendarOpen(true)}
            accessibilityRole="button"
            testID="activities-calendar"
          >
            <View style={styles.named}>
              <CalendarIcon />
              <Text style={styles.buttonText}>{activityCalendarTitle()}</Text>
            </View>
          </Tap>
          <ActivityCalendarSheet
            visible={calendarOpen}
            onClose={() => setCalendarOpen(false)}
          />
        </>
      )}
      <WatchRunCard />
      <AddPastActivity />
      {activities.problem !== null && (
        <Text style={styles.problem} accessibilityRole="alert">
          {activities.problem}
        </Text>
      )}
      {activities.refused.map((run) => (
        <RefusedRow
          key={run.id}
          run={run}
          confirming={confirming === run.id}
          onRetry={() => activities.retry(run.id)}
          onAsk={() => setConfirming(run.id)}
          onKeep={() => setConfirming(null)}
          onDiscard={() => {
            setConfirming(null);
            activities.discard(run.id);
          }}
        />
      ))}
      {waiting > 0 && (
        <Text style={styles.message}>
          {tPlural(
            waiting,
            "{count} run is on this phone, waiting for a connection.",
            "{count} runs are on this phone, waiting for a connection.",
          )}
        </Text>
      )}
      {activities.waitingPublic > 0 && (
        <Text style={styles.message}>{waitingText("everyone")}</Text>
      )}
      {activities.list.length > 0 ? (
        <>
          {activities.list.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              isPublic={publicKeys.has(activity.id)}
              title={postTitles?.get(activity.id) ?? null}
              opening={activities.opening === activity.id}
              onOpen={() => activities.open(activity)}
              onDelete={() => activities.remove(activity.id)}
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

type RefusedProps = {
  run: RefusedRun;
  /** «Discard» was tapped: the row asks before the run goes. */
  confirming: boolean;
  onRetry: () => void;
  onAsk: () => void;
  onKeep: () => void;
  onDiscard: () => void;
};

/** A run of this phone the API will not take (TASK-257): when, how far,
 * why, and what to do with it. */
function RefusedRow({
  run,
  confirming,
  onRetry,
  onAsk,
  onKeep,
  onDiscard,
}: RefusedProps) {
  // Written again when «Settings» changes the units (TASK-182).
  useUnits();
  const when = startedLabel(run.startedAt) || t("Run");
  return (
    <View style={[styles.row, styles.refused]} testID="refused-run">
      <View style={styles.words}>
        <Text style={styles.when} numberOfLines={1}>
          {when}
        </Text>
        <Text style={styles.facts} numberOfLines={1}>
          {runDistanceLabel(run.distanceM)}
        </Text>
        <Text style={styles.reason}>
          {t("The server could not take this run: {message}", { message: run.message })}
        </Text>
      </View>
      {confirming ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>
            {t("Discard this run? It will not be saved.")}
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
              onPress={onDiscard}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.dangerText]}>
                {t("Discard run")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.confirmButtons}>
          <Pressable
            style={[styles.button, styles.half]}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={t("Send the run of {when} again", { when })}
          >
            <Text style={styles.buttonText}>{t("Try again")}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.half]}
            onPress={onAsk}
            accessibilityRole="button"
            accessibilityLabel={t("Discard the run of {when}", { when })}
          >
            <Text style={[styles.buttonText, styles.dangerText]}>{t("Discard")}</Text>
          </Pressable>
        </View>
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
  // Marked by its border, as a problem is (the yellow is the route's).
  refused: {
    borderColor: color.error,
  },
  reason: {
    color: color.text,
    fontSize: fontSize.small,
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
  // Not yellow: that is the route's (docs/UI.md, «Il tema»).
  facts: {
    color: color.text,
    fontSize: fontSize.small,
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
  named: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
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
