import type { GameMe } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { decimal, t } from "../i18n";
import { useLanguage } from "../i18n/useLanguage";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { useBackCloses } from "../ui/backLayers";
import { Tap } from "../ui/Tap";
import { inUnits } from "../units/format";
import { useUnits } from "../units/useUnits";
import { type RequestedChallenge, useRequestedChallenge } from "./challengeDoor";
import { ChallengesTab } from "./ChallengesTab";
import { CollectionList } from "./CollectionList";
import { CollectionPage } from "./CollectionPage";
import { collectionRows, hasCollections } from "./collections";
import { useGameCatalog } from "./gameCatalog";
import { ShapeCard } from "./ShapeCard";
import { PlayTabs } from "./PlayTabs";
import { PrizesPage } from "./PrizesPage";
import { SlideIn } from "./SlideIn";
import { useGameMe } from "./useGameMe";

type Props = {
  /** The page is on screen: the account's game is asked for. */
  active: boolean;
  /** «Sign in to collect shapes.» touched: the way to the account. */
  onSignIn: () => void;
  /** The fake fetch of the tests. */
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  /** The clock of a challenge's countdown; the tests give theirs. */
  now?: () => number;
};

/** The two tabs of the page (TASK-296 part D). */
export type PlayTab = "collection" | "challenges";

const COLUMNS = 2;

/**
 * «Play» (TASK-296 parts B and D, ADR-0255; docs/GIOCO.md §9): two tabs.
 * «Collection»: the shapes of the API's catalog in a grid, the unlocked
 * ones in the yellow with their day, the others in grey with what they ask
 * and how far along the account is. Without an account the shapes are
 * shown as they are, with the way to sign in above them. «Challenges»: the
 * account's teams and their challenges (`ChallengesTab`); a challenge's
 * notification touched opens the page on it. The page exists only while
 * the API has the game (`gameCatalog`): the app shows it then. A catalog
 * in collections (TASK-423 part D) shows «Collection» as the list of them,
 * each opening its own page; an older API's, the one grid.
 */
export function PlayScreen({ active, onSignIn, fetchFn, apiKey, now }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const units = useUnits();
  const language = useLanguage();
  const catalog = useGameCatalog();
  const [tab, setTab] = useState<PlayTab>("collection");
  // The collection whose page is open; null: the list of them.
  const [openId, setOpenId] = useState<string | null>(null);
  // «Prizes» open over the collections (TASK-423 part E).
  const [prizesOpen, setPrizesOpen] = useState(false);
  // A page of the collections was opened since «Play» came up: the list
  // then comes back from the left.
  const [visited, setVisited] = useState(false);
  if ((prizesOpen || openId !== null) && !visited) {
    setVisited(true);
  }
  // A challenge asked for from outside (a notification): its tab, once
  // per request; the tab opens the challenge itself.
  const requested = useRequestedChallenge();
  const [seen, setSeen] = useState<RequestedChallenge | null>(null);
  if (requested !== null && requested !== seen) {
    setSeen(requested);
    setTab("challenges");
  }
  const collection = tab === "collection";
  const { shown, refresh } = useGameMe(active && collection, { fetchFn, key: apiKey });
  const cardWidth = (width - space.md * (COLUMNS + 1)) / COLUMNS;
  const me: GameMe | null = shown.status === "ready" ? shown.me : null;
  const states = new Map(me?.shapes.map((state) => [state.id, state]) ?? []);
  const rows =
    catalog !== null && hasCollections(catalog)
      ? collectionRows(catalog, states)
      : null;
  const opened = rows?.find((row) => row.collection.id === openId) ?? null;
  // Android's «back» is the «←» of the page on screen.
  const prizesShown =
    active && collection && catalog !== null && prizesOpen && me !== null;
  useBackCloses(prizesShown, () => setPrizesOpen(false));
  useBackCloses(
    active && collection && catalog !== null && !prizesShown && opened !== null,
    () => setOpenId(null),
  );
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + space.lg },
      ]}
      keyboardShouldPersistTaps="handled"
      testID="play-screen"
    >
      <PlayTabs
        options={[
          { value: "collection", label: t("Collection") },
          { value: "challenges", label: t("Challenges") },
        ]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />
      {!collection && (
        <ChallengesTab
          active={active}
          onSignIn={onSignIn}
          fetchFn={fetchFn}
          apiKey={apiKey}
          now={now}
        />
      )}
      {collection && shown.status === "off" && (
        <Tap
          style={styles.notice}
          onPress={onSignIn}
          accessibilityRole="button"
          testID="play-sign-in"
        >
          <Text style={styles.noticeText}>{t("Sign in to collect shapes.")}</Text>
        </Tap>
      )}
      {collection && shown.status === "loading" && (
        <ActivityIndicator color={color.textMuted} style={styles.wait} />
      )}
      {collection && shown.status === "failed" && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{shown.problem}</Text>
          <Tap
            style={styles.retry}
            onPress={refresh}
            accessibilityRole="button"
            testID="play-retry"
          >
            <Text style={styles.retryText}>{t("Try again")}</Text>
          </Tap>
        </View>
      )}
      {collection && me !== null && (
        <Text style={styles.totals} testID="play-totals">
          {t("{distance} counted so far", {
            distance: `${decimal(inUnits(me.counted_m, units))} ${units}`,
          })}
        </Text>
      )}
      {collection &&
        (catalog === null ? (
          <Text style={styles.noticeText}>
            {t("The game is not available right now.")}
          </Text>
        ) : prizesOpen && me !== null ? (
          <SlideIn key="prizes" from="right">
            <PrizesPage
              active={active}
              catalog={catalog}
              units={units}
              language={language}
              onBack={() => setPrizesOpen(false)}
              fetchFn={fetchFn}
              apiKey={apiKey}
            />
          </SlideIn>
        ) : opened !== null ? (
          <SlideIn key={`collection-${opened.collection.id}`} from="right">
            <CollectionPage
              row={opened}
              shapes={catalog.shapes}
              states={states}
              me={me}
              cardWidth={cardWidth}
              units={units}
              language={language}
              onBack={() => setOpenId(null)}
            />
          </SlideIn>
        ) : rows !== null ? (
          // Back on the list: it comes from the left (TASK-423, the motion).
          <SlideIn key="collections" from={visited ? "left" : "right"}>
            {me !== null && (
              <Tap
                style={styles.prizes}
                onPress={() => setPrizesOpen(true)}
                accessibilityRole="button"
                testID="play-prizes"
              >
                <Text style={styles.prizesText}>{t("Prizes")}</Text>
                <Text style={styles.prizesLine} numberOfLines={1}>
                  {t("Frames, titles and badges")}
                </Text>
                <Text style={styles.arrow}>›</Text>
              </Tap>
            )}
            <CollectionList rows={rows} language={language} onOpen={setOpenId} />
          </SlideIn>
        ) : (
          <View style={styles.grid}>
            {catalog.shapes.map((shape) => (
              <ShapeCard
                key={shape.id}
                shape={shape}
                shapes={catalog.shapes}
                state={states.get(shape.id) ?? null}
                me={me}
                width={cardWidth}
                units={units}
                language={language}
              />
            ))}
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: color.background,
  },
  prizes: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  prizesText: {
    color: color.accent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  prizesLine: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  arrow: {
    color: color.textMuted,
    fontSize: fontSize.title,
  },
  content: {
    padding: space.md,
    gap: space.md,
  },
  // On the page's background the track wants a surface to show.
  tabs: {
    backgroundColor: color.surface,
  },
  notice: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    gap: space.sm,
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
  },
  noticeText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  wait: {
    marginVertical: space.sm,
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
  totals: {
    color: color.textMuted,
    fontSize: fontSize.label,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
});
