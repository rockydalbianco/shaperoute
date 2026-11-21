import type { LiveItem, RunActivity } from "@shaperoute/shared-types";
import { useMemo, useState, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";

import { clockLabel } from "../feed/postSections";
import { t } from "../i18n";
import { activityName } from "../social/PublicParts";
import { useFollowsDoor } from "../social/followsDoor";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { runControl, subscribeRunControl } from "../navigation/runControl";
import { distanceLabel } from "../units/format";
import { startPlannedLive } from "./liveShareStore";
import { LiveViewScreen } from "./LiveViewScreen";
import { PlanLiveSheet } from "./PlanLiveSheet";
import { useLives } from "./useLives";

/** Going on, paused, or finished this hour: its card opens the live. */
export function isGoing(live: LiveItem): boolean {
  return live.share_id !== null && live.state !== "planned" && live.state !== "ended";
}

/** The card's line (texts approved by the user on 2026-11-12): «LIVE ·
 * Run · 3.2 km», «Finished · 42.2 km · 3:28:10», «Live · Sat 09:00 ·
 * Milano Marathon». */
export function liveLine(live: LiveItem, locale?: string): string {
  if (live.state === "finished") {
    return t("Finished · {distance} · {time}", {
      distance: distanceLabel(live.distance_m ?? 0),
      time: clockLabel(live.duration_s ?? 0),
    });
  }
  if (isGoing(live)) {
    return t("LIVE · {sport} · {distance}", {
      sport: activityName(live.activity as RunActivity),
      distance: distanceLabel(live.distance_m ?? 0),
    });
  }
  const at = live.starts_at === null ? null : new Date(live.starts_at);
  return t("Live · {day} {time} · {title}", {
    day: at === null ? "" : at.toLocaleDateString(locale, { weekday: "short" }),
    time:
      at === null
        ? ""
        : at.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    title: live.title ?? "",
  });
}

/**
 * The «Live» row at the top of the Feed (TASK-468 part B2a, ADR-0381): one's
 * own lives and those of the accounts one follows (the user's choice 7),
 * the going on first. A card going on opens the live in the app; a planned
 * one offers «Remind me» (the push comes with part A2b). Cards one above the
 * other: a row that scrolls sideways would fight the swipe between the
 * Feed's tabs. Above them «Plan a live» (part B2b1, the user's choice 9),
 * and «Start live» on one's own planned live while a recording goes on.
 * Nothing without an account.
 */
export function LivesRow({
  active = true,
  fetchFn,
  apiKey,
}: {
  active?: boolean;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
}) {
  const { apiUrl, account } = useFollowsDoor();
  const session = account.state.status === "signedIn" ? account.state.session : null;
  const token = session?.token ?? null;
  const me = session?.user.public_id ?? null;
  const api = useMemo(
    () =>
      !active || apiUrl === null || token === null
        ? null
        : { baseUrl: apiUrl, token, fetchFn, key: apiKey },
    [active, apiKey, apiUrl, fetchFn, token],
  );
  const { lives, remind, refresh } = useLives(api);
  const [watching, setWatching] = useState<LiveItem | null>(null);
  const [planning, setPlanning] = useState(false);
  // «Start live» on one's own planned live only while a recording goes on
  // (TASK-468 part B2b1): its share sends that recording's points.
  const recording = useSyncExternalStore(
    subscribeRunControl,
    () => runControl().phase !== "idle",
  );

  if (api === null || apiUrl === null || token === null) {
    return null;
  }
  const start = (live: LiveItem) => {
    if (live.planned_live_id !== null) {
      void startPlannedLive(api, live.planned_live_id).then(refresh);
    }
  };
  return (
    <View style={styles.row} testID="lives-row">
      {/* The user's choice 9: «Plan a live» in the Feed, above its lives. */}
      <Tap
        style={styles.plan}
        onPress={() => setPlanning(true)}
        accessibilityRole="button"
        testID="lives-plan"
      >
        <Text style={styles.planText}>{t("Plan a live")}</Text>
        <Text style={styles.planText}>›</Text>
      </Tap>
      {lives.map((live) => {
        const going = isGoing(live);
        const mine = live.owner.public_id === me;
        return (
          <View key={live.id} style={styles.card}>
            <Tap
              style={styles.main}
              onPress={going ? () => setWatching(live) : undefined}
              disabled={!going}
              accessibilityRole={going ? "button" : undefined}
              accessibilityLabel={`${live.owner.username}, ${liveLine(live)}`}
              testID={`lives-card-${live.id}`}
            >
              <View style={styles.title}>
                {live.state === "live" && <View style={styles.dot} />}
                <Text style={styles.name} numberOfLines={1}>
                  {live.owner.username}
                </Text>
              </View>
              <Text style={styles.line} numberOfLines={1}>
                {liveLine(live)}
              </Text>
            </Tap>
            {mine && live.can_start && recording && (
              <Tap
                style={[styles.remind, styles.reminded]}
                onPress={() => start(live)}
                accessibilityRole="button"
                testID={`lives-start-${live.id}`}
              >
                <Text style={[styles.remindText, styles.remindedText]}>
                  {t("Start live")}
                </Text>
              </Tap>
            )}
            {live.state === "planned" && !mine && (
              <Tap
                style={[styles.remind, live.reminded && styles.reminded]}
                onPress={() => remind(live, !live.reminded)}
                accessibilityRole="button"
                accessibilityState={{ selected: live.reminded }}
                accessibilityHint={t("We'll notify you when it starts.")}
                testID={`lives-remind-${live.id}`}
              >
                <Text style={[styles.remindText, live.reminded && styles.remindedText]}>
                  {t("Remind me")}
                </Text>
              </Tap>
            )}
          </View>
        );
      })}
      {planning && (
        <PlanLiveSheet
          api={api}
          onClose={() => setPlanning(false)}
          onPlanned={refresh}
        />
      )}
      {watching !== null && watching.share_id !== null && (
        <LiveViewScreen
          shareId={watching.share_id}
          name={watching.owner.username}
          apiUrl={apiUrl}
          token={token}
          fetchFn={fetchFn}
          apiKey={apiKey}
          onClose={() => setWatching(null)}
        />
      )}
    </View>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
  },
  plan: {
    minHeight: MIN_TAP_SIZE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
  },
  planText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.hairline,
    backgroundColor: color.surface,
  },
  main: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingVertical: space.sm,
  },
  title: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.error,
  },
  name: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  remind: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  reminded: {
    borderColor: color.text,
    backgroundColor: color.text,
  },
  remindText: {
    color: color.text,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  remindedText: {
    color: color.background,
  },
});
