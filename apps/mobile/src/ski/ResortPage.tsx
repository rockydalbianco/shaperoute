import {
  PISTE_DIFFICULTIES,
  type PisteDifficulty,
  type SkiResort,
} from "@shaperoute/shared-types";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t, tLater } from "../i18n";
import { color, font, fontWeight, MIN_TAP_SIZE, radius, space } from "../theme/tokens";
import { useBackCloses } from "../ui/backLayers";
import { distanceLabel, METRES_PER_KM } from "../units/format";
import type { Units } from "../units/units";
import { useUnits } from "../units/useUnits";
import { ResortPosts } from "./ResortPosts";
import { ResortSnow } from "./ResortSnow";
import { altitudeLabel, ResortWeather } from "./ResortWeather";
import { useFollowedResorts } from "./useFollowedResorts";

/** In English: shown with `t()`. The difficulties, from the easiest. */
export const DIFFICULTY_LABELS: Readonly<Record<PisteDifficulty, string>> = {
  novice: tLater("Novice"),
  easy: tLater("Easy"),
  intermediate: tLater("Intermediate"),
  advanced: tLater("Advanced"),
  expert: tLater("Expert"),
  freeride: tLater("Freeride"),
};

/** "1.200–2.500 m"; one altitude when there is one; null for none. */
export function elevationsLabel(resort: SkiResort, units: Units): string | null {
  const { min_elevation_m: low, max_elevation_m: high } = resort;
  if (low !== null && high !== null && low !== high) {
    const [from, to] = [altitudeLabel(low, units), altitudeLabel(high, units)];
    // The unit once, at the end.
    return `${from.replace(/ (m|ft)$/, "")}–${to}`;
  }
  const one = low ?? high;
  return one === null ? null : altitudeLabel(one, units);
}

/** The website, when it is one a browser opens. */
export function websiteOf(resort: SkiResort): string | null {
  return resort.website !== null && /^https?:\/\//i.test(resort.website)
    ? resort.website
    : null;
}

type Props = {
  resort: SkiResort;
  apiUrl: string | null;
  onBack: () => void;
  /** A post of the resort opened: the search gives way to the map. */
  onLeave?: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
};

/**
 * A ski resort from the tab «Ski» (TASK-406 part C, ADR-0338): its name and
 * region, lifts, km of pistes by difficulty, altitudes and website, the
 * weather at its base and top, and whom the data comes from. Over the
 * search, which «Back» shows again as it was.
 */
export function ResortPage({
  resort,
  apiUrl,
  onBack,
  onLeave,
  fetchFn,
  apiKey,
}: Props) {
  const insets = useSafeAreaInsets();
  // Android's «back» is «‹ Back»: the search again, not another tab.
  useBackCloses(true, onBack);
  // «Your resorts» (part D3): the same «Follow» as the members'.
  const { isFollowed, toggle } = useFollowedResorts();
  const following = isFollowed(resort.id);
  const units = useUnits();
  const elevations = elevationsLabel(resort, units);
  const website = websiteOf(resort);
  const difficulties = PISTE_DIFFICULTIES.filter(
    (key) => (resort.piste_km_by_difficulty[key] ?? 0) > 0,
  );
  return (
    <View style={[styles.page, { paddingTop: insets.top }]} testID="resort-page">
      <Pressable
        style={styles.back}
        onPress={onBack}
        accessibilityRole="button"
        testID="resort-back"
      >
        <Text style={styles.backText}>{`‹ ${t("Back")}`}</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <Text style={styles.name} accessibilityRole="header">
          {resort.name}
        </Text>
        {resort.region !== null && <Text style={styles.region}>{resort.region}</Text>}
        <Pressable
          style={[styles.follow, following && styles.following]}
          onPress={() => toggle(resort)}
          accessibilityRole="button"
          accessibilityState={{ selected: following }}
          testID="resort-follow"
        >
          <Text style={[styles.followText, following && styles.followingText]}>
            {t(following ? "Following" : "Follow")}
          </Text>
        </Pressable>
        <View style={styles.facts}>
          <Fact
            label={t("Lifts@@resort")}
            value={String(resort.lifts)}
            testID="lifts"
          />
          <Fact
            label={t("Pistes")}
            value={distanceLabel(resort.piste_km * METRES_PER_KM, units)}
            testID="pistes"
          />
          {elevations !== null && (
            <Fact label="" value={elevations} testID="elevations" />
          )}
        </View>
        {difficulties.length > 0 && (
          <View style={styles.card} testID="difficulties">
            {difficulties.map((key) => (
              <View key={key} style={styles.line}>
                <Text style={styles.lineLabel}>{t(DIFFICULTY_LABELS[key])}</Text>
                <Text style={styles.lineValue}>
                  {distanceLabel(
                    resort.piste_km_by_difficulty[key] * METRES_PER_KM,
                    units,
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
        {website !== null && (
          <Pressable
            style={styles.website}
            onPress={() => void Linking.openURL(website)}
            accessibilityRole="link"
            testID="resort-website"
          >
            <Text style={styles.websiteText}>{t("Website")}</Text>
          </Pressable>
        )}
        <ResortWeather
          resortId={resort.id}
          apiUrl={apiUrl}
          fetchFn={fetchFn}
          apiKey={apiKey}
        />
        <ResortSnow resortId={resort.id} />
        <ResortPosts resortId={resort.id} onLeave={onLeave} />
        <Text style={styles.credits}>
          {t(
            "Weather: MET Norway (CC BY 4.0) · Resorts: OpenSkiMap.org, © OpenStreetMap contributors",
          )}
        </Text>
      </ScrollView>
    </View>
  );
}

function Fact({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID: string;
}) {
  return (
    <View style={styles.fact} testID={testID}>
      <Text style={styles.factValue}>{value}</Text>
      {label !== "" && <Text style={styles.factLabel}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.background,
  },
  back: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    alignSelf: "flex-start",
  },
  backText: {
    ...font.body,
    color: color.text,
  },
  follow: {
    minHeight: MIN_TAP_SIZE,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.text,
    backgroundColor: color.text,
  },
  following: {
    borderColor: color.borderStrong,
    backgroundColor: "transparent",
  },
  followText: {
    ...font.body,
    fontWeight: fontWeight.semibold,
    color: color.surface,
  },
  followingText: {
    color: color.text,
  },
  body: {
    gap: space.md,
    paddingHorizontal: space.lg,
  },
  name: {
    ...font.title,
    color: color.text,
  },
  region: {
    ...font.body,
    color: color.textMuted,
    marginTop: -space.sm,
  },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
  },
  fact: {
    gap: space.xs,
  },
  factValue: {
    ...font.heading,
    color: color.text,
  },
  factLabel: {
    ...font.small,
    color: color.textMuted,
  },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lineLabel: {
    ...font.small,
    color: color.textMuted,
  },
  lineValue: {
    ...font.small,
    color: color.text,
    fontWeight: fontWeight.semibold,
  },
  website: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  websiteText: {
    ...font.body,
    color: color.accent,
    fontWeight: fontWeight.semibold,
  },
  credits: {
    ...font.detail,
    color: color.textFaint,
  },
});
