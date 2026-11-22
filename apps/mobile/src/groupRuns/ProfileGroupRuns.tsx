import type { GroupRun, ProfileGroupRuns as Runs } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { sessionEnded } from "../account/messages";
import { startedLabel } from "../activities/activityText";
import { t, tPlural } from "../i18n";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { openGroupRunPage } from "./groupRunDoor";
import { fetchProfileGroupRuns } from "./groupRunsApi";

type Props = {
  apiUrl: string;
  token: string;
  publicId: string;
  onSessionEnded: (token: string) => void;
  /** For the tests: the fake fetch. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * The group runs of a profile (TASK-309 part B, docs/EVENTI.md §7): those
 * coming, the nearest first, then «Past». A touch opens the page. Nothing at
 * all when there are none, and from an API of before (404).
 */
export function ProfileGroupRuns({
  apiUrl,
  token,
  publicId,
  onSessionEnded,
  fetchFn,
  apiKey,
}: Props) {
  const asked = `${token} ${publicId}`;
  // The group runs of one profile, asked with one token.
  const [answer, setAnswer] = useState<{ asked: string; runs: Runs } | null>(null);

  useEffect(() => {
    let live = true;
    void fetchProfileGroupRuns(apiUrl, token, publicId, { fetchFn, key: apiKey }).then(
      (outcome) => {
        if (!live) {
          return;
        }
        if (outcome.kind === "ok") {
          setAnswer({ asked, runs: outcome.value });
        } else if (sessionEnded(outcome)) {
          onSessionEnded(token);
        }
      },
    );
    return () => {
      live = false;
    };
  }, [apiKey, apiUrl, asked, fetchFn, onSessionEnded, publicId, token]);

  const runs = answer?.asked === asked ? answer.runs : null;
  if (runs === null || (runs.upcoming.length === 0 && runs.past.length === 0)) {
    return null;
  }
  return (
    <View style={styles.section} testID="profile-group-runs">
      <Text style={styles.heading} accessibilityRole="header">
        {t("Group runs")}
      </Text>
      {runs.upcoming.map((run) => (
        <GroupRunCard key={run.id} run={run} />
      ))}
      {runs.past.length > 0 && (
        <>
          <Text style={styles.subheading}>{t("Past")}</Text>
          {runs.past.map((run) => (
            <GroupRunCard key={run.id} run={run} />
          ))}
        </>
      )}
    </View>
  );
}

/** A group run in a list: its title, when, how many go. */
export function GroupRunCard({ run }: { run: GroupRun }) {
  return (
    <Tap
      style={styles.card}
      onPress={() => openGroupRunPage(run.id)}
      accessibilityRole="button"
      testID={`group-run-card-${run.id}`}
    >
      <Text style={styles.title} numberOfLines={1}>
        {run.title}
      </Text>
      <Text style={styles.facts} numberOfLines={1}>
        {startedLabel(run.starts_at)} · {tPlural(run.going, "1 going", "{count} going")}
      </Text>
    </Tap>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.sm,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  subheading: {
    color: color.textMuted,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    marginTop: space.sm,
  },
  card: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  facts: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
