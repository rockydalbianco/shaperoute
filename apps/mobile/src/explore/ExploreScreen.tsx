import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import {
  cityName,
  fetchRecommended,
  NEAR_RADIUS_M,
  type RecommendedRoute,
  routeTitle,
} from "./recommendedRoutes";
import type { Place } from "../places/photon";
import { AskForRoute, CityPicker } from "./ExploreTools";
import { RouteThumb } from "./RouteThumb";
import type { ThemedRequest } from "./themedRoutes";

type ListState =
  | { status: "loading" }
  | { status: "done"; routes: RecommendedRoute[] }
  | { status: "failed" };

type Props = {
  apiUrl: string | null;
  /** Where the routes should start near: the start of the first screen. */
  near: LatLon | null;
  onBack: () => void;
  onOpen: (route: RecommendedRoute) => void;
  /** A city searched for (TASK-129): the list and the request start there. */
  city?: Place | null;
  onCity?: (city: Place | null) => void;
  /** A shape through the places of a theme (TASK-129). */
  onAsk?: (request: ThemedRequest) => void;
};

const ALL = "all";
const NO_ROUTES: RecommendedRoute[] = [];

/** The chips of one filter: "All" first, then what the list has. */
export function filterOptions(values: string[]): string[] {
  return [ALL, ...Array.from(new Set(values))];
}

/** The routes a filter keeps, in the order the API gave them. */
export function filtered(
  routes: RecommendedRoute[],
  what: string,
  km: string,
): RecommendedRoute[] {
  return routes.filter(
    (r) =>
      (what === ALL || routeTitle(r) === what) &&
      (km === ALL || kmLabel(r.distance_m) === km),
  );
}

export function kmLabel(distanceM: number): string {
  return `${Math.round(distanceM / 1000)} km`;
}

export function awayText(awayM: number): string {
  return awayM < 1000
    ? `${Math.round(awayM / 10) * 10} m away`
    : `${(awayM / 1000).toFixed(1)} km away`;
}

/**
 * "Explore" (TASK-092 variant C, TASK-126): the best routes already planned
 * near the start, by shape or word and by distance. A route opens on the map.
 */
export function ExploreScreen({
  apiUrl,
  near: start,
  onBack,
  onOpen,
  city = null,
  onCity,
  onAsk,
}: Props) {
  // A city searched for takes the place of the start (TASK-129).
  const near = city?.point ?? start;
  const insets = useSafeAreaInsets();
  // The answer for one start: another start shows "loading" until its own.
  const [answer, setAnswer] = useState<{ key: string; list: ListState } | null>(null);
  const [what, setWhat] = useState(ALL);
  const [km, setKm] = useState(ALL);
  const lat = near?.[0];
  const lon = near?.[1];
  const key =
    apiUrl === null || lat === undefined || lon === undefined
      ? null
      : `${apiUrl} ${lat},${lon}`;

  useEffect(() => {
    if (key === null || apiUrl === null || lat === undefined || lon === undefined) {
      return;
    }
    const controller = new AbortController();
    void fetchRecommended(apiUrl, [lat, lon], { signal: controller.signal }).then(
      (outcome) => {
        if (!controller.signal.aborted) {
          setAnswer({
            key,
            list:
              outcome.kind === "routes"
                ? { status: "done", routes: outcome.routes }
                : { status: "failed" },
          });
        }
      },
    );
    return () => controller.abort();
  }, [key, apiUrl, lat, lon]);

  const list: ListState =
    key === null
      ? { status: "failed" }
      : answer?.key === key
        ? answer.list
        : { status: "loading" };
  const routes = useMemo(
    () =>
      answer !== null && answer.key === key && answer.list.status === "done"
        ? answer.list.routes
        : NO_ROUTES,
    [answer, key],
  );
  const whats = useMemo(() => filterOptions(routes.map(routeTitle)), [routes]);
  const kms = useMemo(
    () =>
      filterOptions(
        [...routes]
          .sort((a, b) => a.distance_m - b.distance_m)
          .map((r) => kmLabel(r.distance_m)),
      ),
    [routes],
  );
  const shown = filtered(routes, what, km);

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title}>Best near you</Text>
          <Text style={styles.subtitle}>
            {`Starting within ${NEAR_RADIUS_M / 1000} km of ${city?.label ?? "your start"}`}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {onCity && <CityPicker apiUrl={apiUrl} city={city} onCity={onCity} />}
        {onAsk && (
          <AskForRoute
            where={city?.label ?? "your start"}
            onAsk={(text) => onAsk({ text, centre: near, city: city?.label ?? null })}
          />
        )}
        {list.status === "done" && routes.length > 0 && (
          <View style={styles.filters}>
            <Chips options={whats} value={what} onChange={setWhat} />
            <Chips options={kms} value={km} onChange={setKm} />
          </View>
        )}
        {list.status === "loading" && <Text style={styles.note}>Loading routes…</Text>}
        {list.status === "failed" && (
          <Text style={styles.note}>
            {near === null
              ? "Choose a start first: the routes are the ones near it."
              : "The routes could not load. Check the connection and try again."}
          </Text>
        )}
        {list.status === "done" && routes.length === 0 && (
          <Text style={styles.note}>
            No recommended routes near this start yet. Draw one: the best ones will show
            up here.
          </Text>
        )}
        {shown.map((route) => (
          <Pressable
            key={route.id}
            style={styles.row}
            onPress={() => onOpen(route)}
            accessibilityRole="button"
            accessibilityLabel={`${routeTitle(route)}, ${kmLabel(route.route_m)}, ${awayText(route.away_m)}`}
          >
            <RouteThumb line={route.preview} width={72} height={60} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {`${capitalised(routeTitle(route))} · ${(route.route_m / 1000).toFixed(1)} km`}
              </Text>
              <Text style={styles.rowLine}>
                {`${cityName(route.city)} · ${awayText(route.away_m)}`}
              </Text>
            </View>
            <Text style={styles.match}>{`${Math.round(route.similarity * 100)}%`}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => onChange(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {option === ALL ? "All" : capitalised(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
  back: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  backText: {
    color: color.text,
    fontSize: fontSize.title,
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
  filters: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  chips: {
    flexDirection: "row",
    gap: space.sm,
    paddingRight: space.lg,
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
  },
  list: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
    paddingVertical: space.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    minHeight: 76,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  rowLine: {
    color: color.textMuted,
    fontSize: fontSize.detail,
  },
  match: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    paddingRight: space.xs,
  },
});
