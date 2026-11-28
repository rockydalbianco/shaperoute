import type { GroupOuting, LatLon } from "@shaperoute/shared-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { personPhotoUri } from "../api/people";
import { RouteThumb } from "../explore/RouteThumb";
import { knownPoint } from "../groups/groupText";
import { t, tPlural } from "../i18n";
import { appLanguage } from "../i18n/language";
import { Avatar } from "../profile/Avatar";
import { useFollowsDoor } from "../social/followsDoor";
import { findProfile } from "../sports";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { Tap } from "../ui/Tap";
import { GROUP_RUN_GLYPH } from "./CreateGroupRunButton";
import { distanceLabel } from "../units/format";
import { openGroupRunPage } from "./groupRunDoor";
import { fetchGroupRuns, withoutRoute } from "./groupRunsApi";

/** The width of a card of the row: two and a bit on a phone's screen. */
export const GROUP_RUN_CARD_WIDTH = 168;
const THUMB_HEIGHT = 72;
const FACE = 20;

type Options = {
  fetchFn?: typeof fetch;
  key?: string | null;
  /** Where the phone was last, without asking: for the tests. */
  point?: () => Promise<LatLon | null>;
};

export type GroupRunsShown = {
  /** Those to show; empty: no row. */
  runs: GroupOuting[];
  /** Asks the API again: with the pull of «Feed». */
  refresh: () => void;
};

const NONE: GroupOuting[] = [];

/**
 * The group runs of the Feed's row (TASK-309 part B2, docs/EVENTI.md §5):
 * asked once per account when «Feed» is on the screen (`active`), and again
 * with each pull. The phone's point goes rounded to about a kilometre, and
 * only when the app may read it already (the user's choice 4 of
 * 2026-11-26): no permission is asked for. With an API of before (404),
 * without a network or without an account, none.
 */
export function useGroupRuns(active: boolean, options: Options = {}): GroupRunsShown {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const { fetchFn, key, point = knownPoint } = options;
  // The row of one token: another account does not see it.
  const [answer, setAnswer] = useState<{ token: string; runs: GroupOuting[] } | null>(
    null,
  );
  const asked = useRef<string | null>(null);
  const latest = useRef(0);

  const ask = useCallback(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    asked.current = token;
    const request = ++latest.current;
    void point()
      .catch(() => null)
      .then((near) => fetchGroupRuns(apiUrl, token, near, { fetchFn, key }))
      .then((outcome) => {
        if (request !== latest.current) {
          return;
        }
        if (outcome.kind === "ok") {
          setAnswer({ token, runs: outcome.value.group_runs });
        } else if (outcome.kind === "api_error" || outcome.kind === "bad_answer") {
          // An API of before, or an answer it would not give: no row.
          setAnswer({ token, runs: NONE });
        }
        // Without a network the row stays as it was.
      });
  }, [apiUrl, fetchFn, key, point, token]);

  useEffect(() => {
    if (active && token !== null && asked.current !== token) {
      ask();
    }
  }, [active, ask, token]);

  const runs = answer !== null && answer.token === token ? answer.runs : NONE;
  return useMemo(() => ({ runs, refresh: ask }), [ask, runs]);
}

/**
 * The row «Group runs» at the top of «Feed», under «Live» (the user's
 * choice 1): small cards that scroll sideways, the nearest in time first.
 * Each has the shape's line (choice 2, no map), its title, day and time in
 * the phone's time, the km and how many go with their first faces; those of
 * one's own and those one goes to have the yellow edge and «You're going»
 * (choice 3). A touch opens the group run's page. Nothing without one.
 */
export function GroupRunsRow({ runs }: { runs: readonly GroupOuting[] }) {
  if (runs.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="group-runs-row">
      <Text style={styles.heading} accessibilityRole="header">
        {t("Group runs")}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {runs.map((run) => (
          <GroupRunTile key={run.id} run={run} />
        ))}
      </ScrollView>
    </View>
  );
}

/** «Fri 27 Nov · 14:00» in the phone's time and the app's language: no
 * year, which a group run within 60 days does not need, for a small card. */
export function whenLabel(startsAt: string, locale: string = appLanguage()): string {
  const when = new Date(startsAt);
  if (Number.isNaN(when.getTime())) {
    return "";
  }
  const day = when.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const two = (n: number) => String(n).padStart(2, "0");
  return `${day} · ${two(when.getHours())}:${two(when.getMinutes())}`;
}

/** «You're going · 3» on one's own and those one goes to; «3 going» else. */
export function goingLine(run: Pick<GroupOuting, "going" | "i_am_going">): string {
  const count = tPlural(run.going, "1 going", "{count} going");
  return run.i_am_going ? `${t("You're going")} · ${run.going}` : count;
}

/** One card of the row; the page of a group lays them out two by two
 * (TASK-495 part C2), at `width`. */
export function GroupRunTile({
  run,
  width = GROUP_RUN_CARD_WIDTH,
}: {
  run: GroupOuting;
  width?: number;
}) {
  const when = whenLabel(run.starts_at);
  // An outing without a route (TASK-495 part C2, the user's choice Q3 of
  // 2026-11-27): its sport's icon in place of the line, its «Destination»
  // in place of the km.
  const free = withoutRoute(run);
  const km = free || run.distance_m === null ? "" : distanceLabel(run.distance_m);
  const where = free ? (run.destination ?? "") : km;
  const going = goingLine(run);
  const inner = width - 2 * space.md;
  return (
    <Tap
      style={[styles.card, { width }, run.i_am_going && styles.mine]}
      onPress={() => openGroupRunPage(run.id)}
      accessibilityRole="button"
      accessibilityLabel={`${run.title}, ${when}, ${where}, ${going}`}
      testID={`group-runs-card-${run.id}`}
    >
      {run.preview.length >= 2 ? (
        <RouteThumb line={run.preview} width={inner} height={THUMB_HEIGHT} />
      ) : (
        <SportIcon activity={run.activity} />
      )}
      <Text style={styles.title} numberOfLines={2}>
        {run.title}
      </Text>
      {free && (
        <Text
          style={styles.facts}
          numberOfLines={1}
          testID={`group-runs-destination-${run.id}`}
        >
          {run.destination}
        </Text>
      )}
      <Text style={styles.facts} numberOfLines={1}>
        {when}
      </Text>
      {!free && km !== "" && (
        <Text style={styles.facts} numberOfLines={1}>
          {km}
        </Text>
      )}
      <View style={styles.going}>
        <View style={styles.faces}>
          {run.faces.slice(0, 3).map((person, i) => (
            <View
              key={person.public_id}
              style={[styles.face, i > 0 && styles.faceOver]}
            >
              <Avatar
                name={person.username}
                photo={personPhotoUri(person)}
                size={FACE}
              />
            </View>
          ))}
        </View>
        <Text
          style={[styles.facts, run.i_am_going && styles.mineText]}
          numberOfLines={1}
          testID={`group-runs-going-${run.id}`}
        >
          {going}
        </Text>
      </View>
    </Tap>
  );
}

/** The sport of an outing without a route, where the line would be: as
 * tall as the line, the emoji of its profile (the app has no icons). */
export function SportIcon({ activity }: { activity: string }) {
  const profile = findProfile(activity);
  return (
    <View style={styles.icon} testID="group-run-sport-icon">
      <Text style={styles.iconText} accessibilityElementsHidden>
        {profile?.emoji ?? GROUP_RUN_GLYPH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    height: THUMB_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: THUMB_HEIGHT / 2,
  },
  section: {
    gap: space.sm,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  row: {
    gap: space.sm,
  },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  mine: {
    borderColor: color.accent,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  facts: {
    flexShrink: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  mineText: {
    color: color.accent,
    fontWeight: fontWeight.semibold,
  },
  going: {
    // At the foot of the card, whatever the title's lines.
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  faces: {
    flexDirection: "row",
  },
  face: {
    borderRadius: FACE / 2,
    borderWidth: 1,
    borderColor: color.surface,
  },
  faceOver: {
    marginLeft: -FACE / 3,
  },
});
