import type {
  GameCatalog,
  GamePrizesShown,
  GamePrizeState,
} from "@shaperoute/shared-types";
import { GAME_SHOWN_BADGES_MAX } from "@shaperoute/shared-types";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { selectionFeel } from "../haptics/haptics";
import { t } from "../i18n";
import type { Language } from "../i18n/languages";
import {
  color,
  fontSize,
  fontWeight,
  gamePrize,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Tap } from "../ui/Tap";
import type { Units } from "../units/units";
import { collectionNameIn } from "./collections";
import { ProfileFrame } from "./ProfileFrame";
import { badgeName, frameName, prizeAlong, prizeNeed, titleName } from "./prizesText";
import { usePrizes } from "./usePrizes";

type Props = {
  /** On screen: the prizes are asked for. */
  active: boolean;
  catalog: GameCatalog;
  units: Units;
  language: Language;
  /** «←»: back to the collections. */
  onBack: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

const FRAME_SIDE = 64;
const FRAMES_PER_ROW = 3;

/**
 * «Prizes» (TASK-423 part E, docs/GIOCO.md §5.4): the frames of the
 * collections, the titles and the badges, each reached or not with what it
 * asks and how far along the account is, and the editions it holds. A
 * prize got, touched, goes on the public profile or off it (TASK-423 E2b):
 * one frame, one title, up to 3 badges; nothing until the runner chooses.
 */
export function PrizesPage({
  active,
  catalog,
  units,
  language,
  onBack,
  fetchFn,
  apiKey,
}: Props) {
  const { shown, refresh, show } = usePrizes(active, { fetchFn, key: apiKey });
  const prizes = shown.status === "ready" ? shown.prizes : null;
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /** What the profile shows (TASK-423 E2b): a prize got, touched, goes on
   * it or off it; one frame, one title, up to 3 badges. */
  async function choose(next: GamePrizesShown) {
    selectionFeel();
    setSaving(true);
    setProblem(null);
    const done = await show(next);
    setSaving(false);
    if (!done.ok) {
      setProblem(done.problem);
    }
  }
  const chosen = prizes?.shown ?? null;
  const toggleFrame = (id: string) =>
    chosen !== null &&
    void choose({ ...chosen, frame: chosen.frame === id ? null : id });
  const toggleTitle = (id: string) =>
    chosen !== null &&
    void choose({ ...chosen, title: chosen.title === id ? null : id });
  const toggleBadge = (id: string) => {
    if (chosen === null) {
      return;
    }
    if (chosen.badges.includes(id)) {
      void choose({ ...chosen, badges: chosen.badges.filter((each) => each !== id) });
    } else if (chosen.badges.length >= GAME_SHOWN_BADGES_MAX) {
      setProblem(
        t("Your profile shows up to {count} badges.", { count: GAME_SHOWN_BADGES_MAX }),
      );
    } else {
      void choose({ ...chosen, badges: [...chosen.badges, id] });
    }
  };
  return (
    <View style={styles.page} testID="prizes-page">
      <View style={styles.header}>
        <Tap
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t("Back")}
          testID="prizes-back"
        >
          <Text style={styles.backText}>←</Text>
        </Tap>
        <Text style={styles.title} accessibilityRole="header">
          {t("Prizes")}
        </Text>
      </View>
      {shown.status === "loading" && (
        <ActivityIndicator color={color.textMuted} style={styles.wait} />
      )}
      {shown.status === "none" && (
        <Text style={styles.muted} testID="prizes-none">
          {t("Prizes are not on this server yet.")}
        </Text>
      )}
      {shown.status === "failed" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{shown.problem}</Text>
          <Tap
            style={styles.retry}
            onPress={refresh}
            accessibilityRole="button"
            testID="prizes-retry"
          >
            <Text style={styles.retryText}>{t("Try again")}</Text>
          </Tap>
        </View>
      )}
      {prizes !== null && (
        <>
          <View style={styles.editions} testID="prizes-editions">
            <Text style={[styles.edition, { color: gamePrize.silver }]}>
              {t("Silver editions: {count}", { count: prizes.editions.silver })}
            </Text>
            <Text style={[styles.edition, { color: gamePrize.gold }]}>
              {t("Gold editions: {count}", { count: prizes.editions.gold })}
            </Text>
          </View>

          <View style={styles.notice} testID="prizes-profile">
            <Text style={styles.noticeText}>
              {t(
                "Touch a prize you have to show it on your profile. Nothing is shown until you choose.",
              )}
            </Text>
            {saving && <ActivityIndicator color={color.textMuted} />}
            {problem !== null && (
              <Text style={styles.problem} accessibilityLiveRegion="polite">
                {problem}
              </Text>
            )}
          </View>

          <Text style={styles.heading}>{t("Frames")}</Text>
          <Text style={styles.muted}>
            {t("Complete a collection to earn its frame.")}
          </Text>
          <View style={styles.frames}>
            {prizes.frames.map((frame) => {
              const collection = catalog.collections?.find((c) => c.id === frame.id);
              const shapes = catalog.shapes.filter((s) => s.collection === frame.id);
              const hardest = shapes.at(-1);
              const name =
                collection === undefined
                  ? frame.id
                  : collectionNameIn(collection, language);
              return (
                <Tap
                  key={frame.id}
                  style={[styles.frame, chosen?.frame === frame.id && styles.chosen]}
                  onPress={() => toggleFrame(frame.id)}
                  disabled={!frame.got || saving}
                  accessibilityRole={frame.got ? "button" : undefined}
                  accessibilityState={{ selected: chosen?.frame === frame.id }}
                  accessibilityLabel={`${frameName(name)}, ${
                    frame.got ? t("Earned") : `${frame.unlocked} / ${frame.total}`
                  }`}
                  testID={`prize-frame-${frame.id}`}
                >
                  <ProfileFrame
                    collection={frame.id}
                    outline={hardest?.outline ?? []}
                    size={FRAME_SIDE}
                    got={frame.got}
                  />
                  <Text style={styles.frameName} numberOfLines={2}>
                    {name}
                  </Text>
                  <Text style={styles.small}>
                    {chosen?.frame === frame.id
                      ? t("On your profile")
                      : frame.got
                        ? t("Earned")
                        : `${frame.unlocked} / ${frame.total}`}
                  </Text>
                </Tap>
              );
            })}
          </View>

          <Text style={styles.heading}>{t("Titles")}</Text>
          {prizes.titles.map((state) => (
            <PrizeRow
              key={state.id}
              state={state}
              name={titleName(state.id)}
              units={units}
              onProfile={chosen?.title === state.id}
              disabled={saving}
              onPress={() => toggleTitle(state.id)}
            />
          ))}

          <Text style={styles.heading}>{t("Badges")}</Text>
          {prizes.badges.map((state) => (
            <PrizeRow
              key={state.id}
              state={state}
              name={badgeName(state.id)}
              units={units}
              onProfile={chosen?.badges.includes(state.id) ?? false}
              disabled={saving}
              onPress={() => toggleBadge(state.id)}
            />
          ))}
        </>
      )}
    </View>
  );
}

const BAR_HEIGHT = 6;

function PrizeRow({
  state,
  name,
  units,
  onProfile,
  disabled,
  onPress,
}: {
  state: GamePrizeState;
  name: string;
  units: Units;
  /** Shown on the public profile (TASK-423 E2b). */
  onProfile: boolean;
  disabled: boolean;
  /** A prize got, touched: on the profile or off it. */
  onPress: () => void;
}) {
  const need = prizeNeed(state, units);
  const along = onProfile
    ? t("On your profile")
    : state.got
      ? t("Earned")
      : prizeAlong(state, units);
  const share = state.target > 0 ? Math.min(1, state.value / state.target) : 0;
  return (
    <Tap
      style={[styles.row, !state.got && styles.rowLocked, onProfile && styles.chosen]}
      onPress={onPress}
      disabled={!state.got || disabled}
      accessibilityRole={state.got ? "button" : undefined}
      accessibilityState={{ selected: onProfile }}
      accessibilityLabel={[name, need, along].filter((part) => part !== "").join(", ")}
      testID={`prize-${state.id}`}
    >
      <View style={styles.line}>
        <Text style={[styles.name, state.got && styles.got]} numberOfLines={1}>
          {name}
        </Text>
        {along !== "" && <Text style={styles.small}>{along}</Text>}
      </View>
      {need !== "" && <Text style={styles.muted}>{need}</Text>}
      {!state.got && state.target > 1 && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: space.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  wait: {
    marginVertical: space.sm,
  },
  notice: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.sm,
  },
  noticeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  retry: {
    alignSelf: "flex-start",
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
  },
  retryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  editions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  edition: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
  heading: {
    marginTop: space.md,
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  small: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
  },
  frames: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  frame: {
    width: `${Math.floor(100 / FRAMES_PER_ROW) - 4}%`,
    alignItems: "center",
    gap: space.xs,
  },
  frameName: {
    color: color.text,
    fontSize: fontSize.label,
    fontWeight: fontWeight.bold,
    textAlign: "center",
  },
  row: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.xs,
  },
  chosen: {
    borderWidth: 1,
    borderColor: color.accent,
  },
  problem: {
    color: color.error,
    fontSize: fontSize.small,
  },
  rowLocked: {
    opacity: 0.85,
  },
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  got: {
    color: color.accent,
  },
  track: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: color.accent,
  },
});
