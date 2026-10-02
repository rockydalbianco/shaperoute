import type { LatLon } from "@shaperoute/shared-types";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AskForRoute } from "./AskForRoute";
import { cityKey, useCityExamples } from "./exampleRoutes";
import { CityExamples } from "./CityExamples";
import { CityPicker } from "./ExploreTools";
import { CardMapsCredit, cardWidth, RouteCard } from "./RouteCard";
import { ALL, RouteFilters } from "./RouteFilters";
import type { ThemedRequest } from "./themedRoutes";
import { stillDrawing, useWaited, WhileDrawing } from "./WhileDrawing";

type ListState =
  | { status: "loading" }
  | { status: "done"; routes: RecommendedRoute[] }
  | { status: "failed" };

type Props = {
  apiUrl: string | null;
  /** Where the routes should start near: the start of the first screen. */
  near: LatLon | null;
  /** A way back, when the screen is not a page beside the others
   * (TASK-154): there the names in the header are the way. */
  onBack?: () => void;
  onOpen: (route: RecommendedRoute) => void;
  /** A city searched for (TASK-129): the list and the request start there. */
  city?: Place | null;
  onCity?: (city: Place | null) => void;
  /** The cities chosen last, first among the chips (TASK-134). */
  recent?: Place[];
  /** A shape through the places of a theme (TASK-129). */
  onAsk?: (request: ThemedRequest) => void;
};

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
  recent = [],
  onAsk,
}: Props) {
  // A city searched for takes the place of the start (TASK-129).
  const near = city?.point ?? start;
  const insets = useSafeAreaInsets();
  // What the page has between its side margins: two cards side by side.
  const { width } = useWindowDimensions();
  const contentWidth = width - 2 * space.lg;
  const card = cardWidth(contentWidth);
  // The answer for one start: another start shows "loading" until its own.
  const [answer, setAnswer] = useState<{ key: string; list: ListState } | null>(null);
  const [what, setWhat] = useState(ALL);
  const [km, setKm] = useState(ALL);
  // "Ask for a route" waits closed at the foot of the page (TASK-157).
  const [asking, setAsking] = useState(false);
  const page = useRef<ScrollView>(null);
  const shownAsking = useRef(false);
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
  // A chosen city without recommended routes: examples, drawn at once
  // (TASK-143). They go on while a route is open on the map.
  const examplesCity =
    city !== null && list.status === "done" && routes.length === 0 ? city : null;
  const { examples, retry } = useCityExamples(apiUrl, examplesCity);
  // While they are drawn, drawings of «Feed» to look at (TASK-163).
  const examplesKey = examplesCity === null ? null : cityKey(examplesCity.point);
  const drawing = stillDrawing(examples);
  const waited = useWaited(examplesKey, drawing);

  return (
    <View style={[StyleSheet.absoluteFill, styles.screen]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        {onBack && (
          <Pressable
            style={styles.back}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
        )}
        <View style={styles.titles}>
          <Text style={styles.title}>Best near you</Text>
          <Text style={styles.subtitle}>
            {`Starting within ${NEAR_RADIUS_M / 1000} km of ${city?.label ?? "your start"}`}
          </Text>
        </View>
      </View>
      <ScrollView
        ref={page}
        // Opened, "Ask for a route" is below the fold: the page goes to it.
        onContentSizeChange={() => {
          if (asking && !shownAsking.current) {
            shownAsking.current = true;
            page.current?.scrollToEnd({ animated: true });
          }
        }}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {onCity && (
          <CityPicker apiUrl={apiUrl} city={city} onCity={onCity} recent={recent} />
        )}
        {examplesCity !== null && examples !== null && (
          <CityExamples
            city={examplesCity}
            examples={examples}
            onOpen={onOpen}
            onRetry={retry}
            width={contentWidth}
          />
        )}
        {examplesKey !== null && waited && (
          <WhileDrawing cityKey={examplesKey} drawing={drawing} />
        )}
        {list.status === "done" && routes.length > 0 && (
          <RouteFilters
            filters={[
              { name: "Shape", options: whats, value: what, onChange: setWhat },
              { name: "Distance", options: kms, value: km, onChange: setKm },
            ]}
          />
        )}
        {list.status === "loading" && <Text style={styles.note}>Loading routes…</Text>}
        {list.status === "failed" && (
          <Text style={styles.note}>
            {near === null
              ? "Choose a start first: the routes are the ones near it."
              : "The routes could not load. Check the connection and try again."}
          </Text>
        )}
        {list.status === "done" && routes.length === 0 && examplesCity === null && (
          <Text style={styles.note}>
            No recommended routes near this start yet. Draw one: the best ones will show
            up here.
          </Text>
        )}
        {routes.length > 0 && shown.length === 0 && (
          <Text style={styles.note}>
            No route here is both: change one of the two filters.
          </Text>
        )}
        {/* Above the cards: there it is read without scrolling to their end. */}
        {shown.length > 0 && <CardMapsCredit />}
        {/* The drawing first: two cards side by side (TASK-167). */}
        {shown.length > 0 && (
          <View style={styles.grid}>
            {shown.map((route) => (
              <RouteCard
                key={route.id}
                width={card}
                line={route.preview}
                title={`${capitalised(routeTitle(route))} · ${(route.route_m / 1000).toFixed(1)} km`}
                detail={`${cityName(route.city)} · ${awayText(route.away_m)}`}
                match={route.similarity}
                map
                onPress={() => onOpen(route)}
                accessibilityLabel={`${routeTitle(route)}, ${kmLabel(route.route_m)}, ${awayText(route.away_m)}`}
              />
            ))}
          </View>
        )}
        {/* Under the routes already there, and closed: the page is for looking
            first (TASK-157). */}
        {onAsk &&
          (asking ? (
            <AskForRoute
              city={city}
              where={city?.label ?? "your start"}
              onAsk={(text) => onAsk({ text, centre: near, city: city?.label ?? null })}
            />
          ) : (
            <Pressable
              style={styles.ask}
              onPress={() => setAsking(true)}
              accessibilityRole="button"
            >
              <Text style={styles.askText}>Ask for a route</Text>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
  list: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  note: {
    color: color.textMuted,
    fontSize: fontSize.body,
    paddingVertical: space.lg,
  },
  // Quiet on purpose: a line of text at the foot of the page, not a card.
  ask: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: space.lg,
  },
  askText: {
    color: color.textMuted,
    fontSize: fontSize.body,
    textDecorationLine: "underline",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
});
