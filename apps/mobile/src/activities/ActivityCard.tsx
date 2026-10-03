import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ActivityDetail } from "../api/activities";
import { t } from "../i18n";
import { PublicRow } from "../social/PublicRow";
import { StravaActivityRow } from "../strava/StravaActivityRow";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { runFacts, startedLabel, whereAndWhat } from "./activityText";

type Props = {
  activity: ActivityDetail;
  /** Back to «My activities» in «Profile». */
  onList: () => void;
  /** The run goes, for good: asked for after a yes on the card. */
  onDelete: () => void;
};

/**
 * A run of «My activities» on the map (TASK-172), under it: when and where
 * it was, how far and how fast, its score when it has one. The map shows it
 * as the end of a run does: the route yellow, what was run light. «Public»
 * and its title make it a drawing in the profile (TASK-117). With Strava
 * connected, «Send to Strava» or «View on Strava» (TASK-187).
 */
export function ActivityCard({ activity, onList, onDelete }: Props) {
  // «Delete» asks first, on the card itself.
  const [confirming, setConfirming] = useState(false);
  const withRoute = activity.points !== null;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.words}>
          <Text style={styles.when}>{startedLabel(activity.started_at)}</Text>
          <Text style={styles.message}>{whereAndWhat(activity, withRoute)}</Text>
        </View>
        {activity.score !== null && (
          <View
            style={styles.scoreBox}
            accessible
            accessibilityLabel={t("Score: {score} out of 100", {
              score: activity.score,
            })}
          >
            <Text style={styles.score}>{activity.score}</Text>
            <Text style={styles.message}>{t("out of 100")}</Text>
          </View>
        )}
      </View>
      <Text style={styles.facts}>{runFacts(activity)}</Text>
      <Text style={styles.message}>
        {t(
          withRoute
            ? "Yellow: the route. White: what you ran."
            : "White: what you ran.",
        )}
      </Text>
      {!confirming && <PublicRow activityKey={activity.id} />}
      {!confirming && <StravaActivityRow activity={activity} />}
      {confirming ? (
        <>
          <Text style={styles.confirmText}>
            {t("Delete this run? It cannot be undone.")}
          </Text>
          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              onPress={() => setConfirming(false)}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t("Keep it")}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.danger]}
              onPress={onDelete}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, styles.dangerText]}>
                {t("Delete run")}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={styles.buttons}>
          <Pressable
            style={styles.button}
            onPress={() => setConfirming(true)}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, styles.dangerText]}>{t("Delete")}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={onList} accessibilityRole="button">
            <Text style={styles.buttonText}>{t("Back to the list")}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  words: {
    flex: 1,
    gap: 2,
  },
  when: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  scoreBox: {
    alignItems: "flex-end",
  },
  // Not the yellow: that is the route's and the main action's (ADR-0046).
  score: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  facts: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  confirmText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.sm,
    paddingTop: space.xs,
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
  danger: {
    borderColor: color.error,
  },
  dangerText: {
    color: color.error,
  },
});
