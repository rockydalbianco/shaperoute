import type { Drawing } from "@shaperoute/shared-types";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { dayLabel } from "../activities/activityText";
import { t } from "../i18n";
import { durationText } from "../route/runTime";
import { useDrawingsDoor } from "../social/drawingsDoor";
import { useFollowsDoor } from "../social/followsDoor";
import { color, font, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { distanceLabel } from "../units/format";
import { useUnits } from "../units/useUnits";
import { Hairline } from "../ui/Hairline";
import { Tap } from "../ui/Tap";
import { SkiDayPage } from "./SkiDayPage";
import { SkiSeason } from "./SkiSeason";

/** How many pages of the profile one ask reads at most, looking for days
 * of skiing among the other posts. */
export const PAGES_PER_ASK = 5;

/** The days of skiing among `drawings`, in their order. */
export function skiDaysOf(drawings: readonly Drawing[]): Drawing[] {
  return drawings.filter((drawing) => drawing.activity === "skiing");
}

type Read = {
  /** The account they are of: another's are not these. */
  owner: string;
  days: Drawing[];
  /** The cursor of the next page of the profile; null at the last. */
  next: string | null;
};

type Props = {
  /** No account: a touch on «Log in» goes to «Profile». */
  onLogIn: () => void;
};

/**
 * «Days», the second page of the ski mode (TASK-429 part A, ADR-0357): the
 * account's own days of skiing, the latest first, with the day, the town,
 * the kilometres and the time. They are the posts of the profile with the
 * activity `skiing`. Over them the season (part C, `SkiSeason`); a touch
 * opens the day with «Summary · Map · Runs» (part C, `SkiDayPage`).
 */
export function SkiDaysPage({ onLogIn }: Props) {
  const { account } = useFollowsDoor();
  const { pageOf } = useDrawingsDoor();
  const [opened, setOpened] = useState<Drawing | null>(null);
  const units = useUnits();
  const owner =
    account.state.status === "signedIn"
      ? (account.state.session.user.public_id ?? null)
      : null;
  const [read, setRead] = useState<Read | null>(null);
  const [asking, setAsking] = useState(false);

  /** Reads pages from `cursor` until it finds a day, or PAGES_PER_ASK. */
  const ask = useCallback(
    async (of: string, cursor: string | null): Promise<Read | null> => {
      const days: Drawing[] = [];
      let next = cursor;
      for (let page = 0; page < PAGES_PER_ASK; page += 1) {
        const outcome = await pageOf(of, next);
        if (outcome === null || outcome.kind !== "ok") {
          return page === 0 ? null : { owner: of, days, next };
        }
        days.push(...skiDaysOf(outcome.value.drawings));
        next = outcome.value.next;
        if (next === null || days.length > 0) {
          break;
        }
      }
      return { owner: of, days, next };
    },
    [pageOf],
  );

  useEffect(() => {
    if (owner === null) {
      return;
    }
    let live = true;
    void ask(owner, null).then((first) => {
      if (live && first !== null) {
        setRead(first);
      }
    });
    return () => {
      live = false;
    };
  }, [ask, owner]);

  const shown = read !== null && read.owner === owner ? read : null;

  function more() {
    if (shown === null || shown.next === null || asking) {
      return;
    }
    const was = shown;
    setAsking(true);
    void ask(was.owner, was.next).then((page) => {
      setAsking(false);
      if (page === null) {
        return;
      }
      setRead((now) => {
        if (now === null || now.owner !== was.owner) {
          return now;
        }
        // A day already shown is not shown twice.
        const seen = new Set(now.days.map((day) => day.id));
        return {
          owner: now.owner,
          days: [...now.days, ...page.days.filter((day) => !seen.has(day.id))],
          next: page.next,
        };
      });
    });
  }

  return (
    <View style={styles.page}>
      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {t("Days@@ski")}
        </Text>
        {owner !== null && <SkiSeason />}
        {owner === null ? (
          <View style={styles.empty}>
            <Text style={styles.line}>{t("Log in to see your days.")}</Text>
            <Tap
              style={styles.button}
              onPress={onLogIn}
              accessibilityRole="button"
              testID="ski-days-log-in"
            >
              <Text style={styles.buttonText}>{t("Log in")}</Text>
            </Tap>
          </View>
        ) : shown === null ? null : shown.days.length === 0 && shown.next === null ? (
          <Text style={[styles.line, styles.empty]}>
            {t("No days on the snow yet.")}
          </Text>
        ) : (
          <>
            <Text style={styles.label} accessibilityRole="header">
              {t("Your days")}
            </Text>
            <View style={styles.card}>
              {shown.days.map((day, at) => (
                <View key={day.id}>
                  {at > 0 && <Hairline style={styles.inset} />}
                  <Tap
                    style={styles.row}
                    onPress={() => setOpened(day)}
                    accessibilityRole="button"
                    testID={`ski-day-${day.id}`}
                  >
                    <Text style={styles.day}>
                      {day.place === null
                        ? dayLabel(day.started_at)
                        : `${dayLabel(day.started_at)} · ${day.place}`}
                    </Text>
                    <Text style={styles.numbers}>
                      {`${distanceLabel(day.distance_m, units)} · ${durationText(day.duration_s)}`}
                    </Text>
                  </Tap>
                </View>
              ))}
            </View>
            {shown.next !== null && (
              <Tap
                style={styles.button}
                onPress={more}
                disabled={asking}
                accessibilityRole="button"
                accessibilityState={{ disabled: asking, busy: asking }}
                testID="ski-days-more"
              >
                <Text style={styles.buttonText}>
                  {t(asking ? "Loading…" : "Show more")}
                </Text>
              </Tap>
            )}
          </>
        )}
      </ScrollView>
      {opened !== null && <SkiDayPage day={opened} onBack={() => setOpened(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  title: {
    ...font.title,
    color: color.text,
  },
  label: {
    ...font.label,
    color: color.textMuted,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  inset: {
    marginHorizontal: space.md,
  },
  row: {
    minHeight: MIN_TAP_SIZE + space.md,
    justifyContent: "center",
    gap: space.xs / 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  day: {
    ...font.body,
    color: color.text,
  },
  numbers: {
    ...font.small,
    color: color.textMuted,
  },
  empty: {
    gap: space.md,
    paddingTop: space.md,
  },
  line: {
    ...font.body,
    color: color.textMuted,
  },
  button: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  buttonText: {
    ...font.body,
    color: color.text,
  },
});
