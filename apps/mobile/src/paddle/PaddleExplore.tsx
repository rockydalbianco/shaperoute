import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Example, shownExamples, useCityExamples } from "../explore/exampleRoutes";
import type { RecommendedRoute } from "../explore/recommendedRoutes";
import { CardMapsCredit, cardWidth, RouteCard } from "../explore/RouteCard";
import { shapeLabel } from "../feed/FeedPost";
import { decimal, t, tLater } from "../i18n";
import { HeartBadge } from "../intro/HeartBadge";
import { metresBetween } from "../map/coordinates";
import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  byName,
  examplesAt,
  nearestSpot,
  searchSpots,
  type SpotAway,
  SPOTS_SHOWN,
  SUGGESTIONS_SHOWN,
  USUAL_DISTANCE_M,
  WATER_SPOTS,
  type WaterSpot,
} from "./waterSpots";

/** Where the examples come from: a spot chosen, or «Near me», from the
 * start of «Draw» as it was when «Near me» began (null: there was none).
 * Not the start as it moves: each new point would draw the shapes again. */
type Chosen =
  { kind: "spot"; spot: WaterSpot } | { kind: "near"; point: LatLon | null } | null;

// The choice outlives the page, as the examples do: a route opened on the
// map takes the whole screen, and the page comes back as it was left.
let kept: Chosen = null;
// The start «Near me» began from before anything was chosen (TASK-233).
let firstStart: LatLon | null = null;

/** For tests: as a new opening of the app. */
export function forgetWaterChoice(): void {
  kept = null;
  firstStart = null;
}

/** The position mark of «Near me», as the run's (ExploreTools). */
const MARK_SIZE = 12;

function awayText(awayM: number): string {
  return t("{km} km away", { km: decimal(awayM / 1000) });
}

const STATUS: Record<"waiting" | "drawing", string> = {
  waiting: tLater("Next"),
  drawing: tLater("Drawing…"),
};

type Props = {
  apiUrl: string | null;
  /** The start of «Draw», for «Near me». */
  near: LatLon | null;
  onOpen: (route: RecommendedRoute) => void;
};

/**
 * «Explore» with «Paddle» (TASK-191, the user's choice): in place of the
 * cities, the lakes and the beaches. As the run's «Explore» (TASK-233, the
 * user's request): «Near me» is on until a place is chosen, and shows the
 * lake nearest the start of «Draw»; then the places nearest, to tap, and
 * every lake of the list by name. A place has the eight shapes of the run
 * on the water from its shore, 2 km or less on a small lake: those of the
 * places chosen by hand come with the app (TASK-227), the others are drawn
 * as a city's examples. A ready one opens on the map as a route of
 * «Explore». The routes of the runs are not here while «Paddle» is the
 * sport.
 */
export function PaddleExplore({ apiUrl, near, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [chosen, setChosen] = useState<Chosen>(() => kept);
  const [started, setStarted] = useState<LatLon | null>(() => firstStart ?? near);
  if (started === null && near !== null) {
    // The start came after the page: «Near me» begins from it.
    setStarted(near);
  }
  useEffect(() => {
    if (started !== null) {
      firstStart = started;
    }
  }, [started]);
  const [query, setQuery] = useState("");
  const choose = (next: Chosen) => {
    Keyboard.dismiss();
    setQuery("");
    kept = next;
    setChosen(next);
  };
  // Nothing chosen yet: «Near me», when there is a start to be near.
  const shown: Chosen =
    chosen ?? (started === null ? null : { kind: "near", point: started });
  const here = shown?.kind === "near" ? shown.point : null;
  const nearby = here === null ? null : nearestSpot(WATER_SPOTS, here);
  const spot = shown?.kind === "spot" ? shown.spot : (nearby?.spot ?? null);
  const place: Place | null =
    spot !== null
      ? { label: spot.name, point: spot.point }
      : here !== null
        ? { label: t("Your start"), point: here }
        : null;
  const { examples, retry } = useCityExamples(apiUrl, place, {
    set: examplesAt(spot?.distance_m ?? USUAL_DISTANCE_M),
  });
  // To tap: the places nearest the start, or those chosen by hand without
  // one. The lake of «Near me» is under «Near me»; a place found by name is
  // the first, so that what is on is always in sight.
  const nearName = started === null ? null : nearestSpot(WATER_SPOTS, started);
  const offered = byName(WATER_SPOTS, near)
    .filter(
      ({ spot: s }) =>
        (near !== null || s.from !== undefined) && s.name !== nearName?.spot.name,
    )
    .slice(0, SPOTS_SHOWN);
  const chips: WaterSpot[] = [
    ...(shown?.kind === "spot" && !offered.some(({ spot: s }) => s.name === spot?.name)
      ? [shown.spot]
      : []),
    ...offered.map(({ spot: s }) => s),
  ];
  const typed = query.trim();
  const suggestions =
    typed.length < 2
      ? null
      : searchSpots(WATER_SPOTS, typed, near).slice(0, SUGGESTIONS_SHOWN);
  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.titles}>
          <Text style={styles.title}>{t("On the water")}</Text>
          <Text style={styles.subtitle}>
            {t("Shapes to paddle, within 1 km of the shore")}
          </Text>
        </View>
        {/* The sign of Sgrava, as in the run's «Explore» (TASK-222). */}
        <HeartBadge size={MIN_TAP_SIZE} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>{t("LAKES AND SEA")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              <PlaceChip
                label={t("Near me")}
                on={shown?.kind === "near"}
                here
                onPress={() => choose({ kind: "near", point: near })}
              />
              {chips.map((water) => (
                <PlaceChip
                  key={water.name}
                  label={water.name}
                  on={shown?.kind === "spot" && shown.spot.name === water.name}
                  onPress={() => choose({ kind: "spot", spot: water })}
                />
              ))}
            </View>
          </ScrollView>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t("Type a lake or a beach")}
            placeholderTextColor={color.textFaint}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (suggestions !== null && suggestions.length > 0) {
                choose({ kind: "spot", spot: suggestions[0].spot });
              }
            }}
            keyboardAppearance="dark"
            autoCorrect={false}
            accessibilityLabel={t("Type a lake or a beach")}
          />
          {suggestions?.map((found) => (
            <Pressable
              key={found.spot.name}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
              onPress={() => choose({ kind: "spot", spot: found.spot })}
              accessibilityRole="button"
              accessibilityLabel={found.spot.name}
            >
              <Text style={styles.choiceText} numberOfLines={1}>
                {found.spot.name}
              </Text>
              {whereText(found) !== null && (
                <Text style={styles.choiceDetail} numberOfLines={1}>
                  {whereText(found)}
                </Text>
              )}
            </Pressable>
          ))}
          {suggestions !== null && suggestions.length === 0 && (
            <Text style={styles.hint}>
              {t("No lake or beach matches “{typed}”.", { typed })}
            </Text>
          )}
        </View>
        {shown === null && (
          <Text style={styles.note}>
            {t("Choose a lake or a beach: eight shapes on its water, from the shore.")}
          </Text>
        )}
        {shown?.kind === "near" && shown.point === null && (
          <Text style={styles.note}>
            {t(
              "Choose a start in Draw first: the shapes start from the shore nearest to it.",
            )}
          </Text>
        )}
        {place !== null && examples !== null && (
          <WaterExamples
            title={
              spot === null
                ? t("Near your start")
                : [
                    spot.name,
                    whereText({
                      spot,
                      away_m: near === null ? null : metresBetween(near, spot.point),
                    }),
                  ]
                    .filter((part) => part !== null)
                    .join(" · ")
            }
            examples={examples}
            onOpen={onOpen}
            onRetry={retry}
            width={width - 2 * space.lg}
          />
        )}
      </ScrollView>
    </View>
  );
}

/** Where a spot is: the shore a place chosen by hand starts from, else how
 * far it is; nothing without a start to measure from. */
function whereText({ spot, away_m }: SpotAway): string | null {
  if (spot.from !== undefined) {
    return t(spot.from);
  }
  return away_m === null ? null : awayText(away_m);
}

/** One card per shape, filled when its route arrives (as CityExamples). */
function WaterExamples({
  title,
  examples,
  onOpen,
  onRetry,
  width,
}: {
  title: string;
  examples: Example[];
  onOpen: (route: RecommendedRoute) => void;
  onRetry: () => void;
  width: number;
}) {
  // Two cards side by side inside the section.
  const card = cardWidth(width - 2 * space.md);
  // The shapes after the first ones only once they come (as CityExamples).
  const shown = shownExamples(examples);
  const failed = shown.filter((e) => e.status === "failed");
  const messages = Array.from(new Set(failed.map((e) => e.message)));
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{title.toUpperCase()}</Text>
      <View style={styles.grid}>
        {shown.map((example) => {
          const name = shapeLabel(example.shape);
          if (example.status === "ready") {
            const { route } = example;
            const km = decimal(route.route_m / 1000);
            return (
              <RouteCard
                key={example.shape}
                width={card}
                line={route.preview}
                gaps={route.gaps}
                title={`${name} · ${km} km`}
                detail={t("On the water")}
                map
                onPress={() => onOpen(route)}
                accessibilityLabel={t("{shape}, {km} km, on the water", {
                  shape: name,
                  km,
                })}
              />
            );
          }
          return (
            <RouteCard
              key={example.shape}
              width={card}
              line={null}
              title={name}
              detail={
                example.status === "failed" ? t("Not drawn") : t(STATUS[example.status])
              }
            />
          );
        })}
      </View>
      {shown.some((e) => e.status === "ready") && <CardMapsCredit />}
      {messages.map((message) => (
        <Text key={message} style={styles.error}>
          {message}
        </Text>
      ))}
      {failed.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          onPress={onRetry}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>{t("Try again")}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** A place to choose, as the cities' chips of «Explore» (ExploreTools). */
function PlaceChip({
  label,
  on,
  here = false,
  onPress,
}: {
  label: string;
  on: boolean;
  /** The start, not a place: a position mark before the name. */
  here?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        on && styles.chipOn,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      {here && (
        <View style={[styles.mark, on && styles.markOn]}>
          <View style={[styles.markDot, on && styles.markDotOn]} />
        </View>
      )}
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  titles: {
    flex: 1,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  subtitle: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  list: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  section: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  label: {
    color: color.textMuted,
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1.2,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
    paddingVertical: space.lg,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
  hint: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  chips: {
    flexDirection: "row",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  chipOn: {
    backgroundColor: color.text,
    borderColor: color.text,
  },
  chipText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  chipTextOn: {
    color: color.background,
    fontWeight: fontWeight.semibold,
  },
  // «You are here», drawn: a ring and its centre, in the text's colour.
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    borderWidth: 2,
    borderColor: color.text,
    alignItems: "center",
    justifyContent: "center",
  },
  markOn: {
    borderColor: color.background,
  },
  markDot: {
    width: MARK_SIZE / 3,
    height: MARK_SIZE / 3,
    borderRadius: MARK_SIZE / 6,
    backgroundColor: color.text,
  },
  markDotOn: {
    backgroundColor: color.background,
  },
  input: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
    color: color.text,
    fontSize: fontSize.input,
  },
  choice: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  choiceText: {
    color: color.text,
    fontSize: fontSize.body,
  },
  choiceDetail: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  pressed: {
    opacity: 0.6,
  },
  retry: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  retryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
