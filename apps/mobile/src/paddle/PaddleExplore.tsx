import type { LatLon } from "@shaperoute/shared-types";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PADDLE_EXAMPLES,
  type Example,
  shownExamples,
  useCityExamples,
} from "../explore/exampleRoutes";
import type { RecommendedRoute } from "../explore/recommendedRoutes";
import { CardMapsCredit, cardWidth, RouteCard } from "../explore/RouteCard";
import { shapeLabel } from "../feed/FeedPost";
import { decimal, t, tLater } from "../i18n";
import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { asPlace, WATER_PLACES, type WaterPlace } from "./waterPlaces";

/** Where the examples come from: one of the places, or the start of «Draw»
 * as it was when «Near me» was tapped (null: there was none). Not the start
 * as it moves: each new point would draw the shapes again. */
type Chosen =
  { kind: "place"; place: WaterPlace } | { kind: "near"; point: LatLon | null } | null;

// The choice outlives the page, as the examples do: a route opened on the
// map takes the whole screen, and the page comes back as it was left.
let kept: Chosen = null;

/** For tests: as a new opening of the app. */
export function forgetWaterChoice(): void {
  kept = null;
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
 * cities, the lakes and the beaches of WATER_PLACES, and «Near me». A place
 * chosen has the eight shapes of the run, 2 km on the water from its shore
 * (TASK-227): they come with the app, ready at once; «Near me» draws them
 * as a city's examples. A ready one opens on the map as a route of
 * «Explore». The routes of the runs are not here while «Paddle» is the
 * sport.
 */
export function PaddleExplore({ apiUrl, near, onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [chosen, setChosen] = useState<Chosen>(() => kept);
  const choose = (next: Chosen) => {
    kept = next;
    setChosen(next);
  };
  const place: Place | null =
    chosen === null
      ? null
      : chosen.kind === "place"
        ? asPlace(chosen.place)
        : chosen.point === null
          ? null
          : { label: t("Your start"), point: chosen.point };
  const { examples, retry } = useCityExamples(apiUrl, place, { set: PADDLE_EXAMPLES });
  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Text style={styles.title}>{t("On the water")}</Text>
        <Text style={styles.subtitle}>
          {t("Shapes to paddle, within 1 km of the shore")}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space.lg },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.label}>{t("LAKES AND SEA")}</Text>
          <View style={styles.chips}>
            <PlaceChip
              label={t("Near me")}
              on={chosen?.kind === "near"}
              onPress={() => choose({ kind: "near", point: near })}
            />
            {WATER_PLACES.map((water) => (
              <PlaceChip
                key={water.name}
                label={water.name}
                on={chosen?.kind === "place" && chosen.place.name === water.name}
                onPress={() => choose({ kind: "place", place: water })}
              />
            ))}
          </View>
        </View>
        {chosen === null && (
          <Text style={styles.note}>
            {t(
              "Choose a lake or a beach: eight shapes of 2 km on its water, from the shore.",
            )}
          </Text>
        )}
        {chosen?.kind === "near" && chosen.point === null && (
          <Text style={styles.note}>
            {t(
              "Choose a start in Draw first: the shapes start from the shore nearest to it.",
            )}
          </Text>
        )}
        {chosen !== null && place !== null && examples !== null && (
          <WaterExamples
            title={
              chosen.kind === "place"
                ? `${chosen.place.name} · ${t(chosen.place.from)}`
                : t("Near your start")
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
  onPress,
}: {
  label: string;
  on: boolean;
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
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    justifyContent: "center",
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
