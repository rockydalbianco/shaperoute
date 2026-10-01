import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { EXAMPLE_DISTANCE_M, type Example } from "./exampleRoutes";
import { cityShort } from "./presets";
import type { RecommendedRoute } from "./recommendedRoutes";
import { RouteThumb } from "./RouteThumb";

type Props = {
  city: Place;
  examples: Example[];
  onOpen: (route: RecommendedRoute) => void;
  onRetry: () => void;
};

const STATUS: Record<"waiting" | "drawing", string> = {
  waiting: "Next",
  drawing: "Drawing…",
};

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Examples for a city without recommended routes (TASK-143): one card per
 * shape, filled when its route arrives; a ready one opens on the map.
 */
export function CityExamples({ city, examples, onOpen, onRetry }: Props) {
  const failed = examples.filter((e) => e.status === "failed");
  const messages = Array.from(new Set(failed.map((e) => e.message)));
  return (
    <View style={styles.section}>
      <Text
        style={styles.label}
      >{`EXAMPLES IN ${cityShort(city.label).toUpperCase()}`}</Text>
      <Text style={styles.note}>
        {`No recommended routes here yet: three shapes of ${EXAMPLE_DISTANCE_M / 1000} km from the centre, drawn now.`}
      </Text>
      {examples.map((example) => {
        const name = capitalised(example.shape);
        if (example.status === "ready") {
          const { route } = example;
          return (
            <Pressable
              key={example.shape}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => onOpen(route)}
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${(route.route_m / 1000).toFixed(1)} km`}
            >
              <RouteThumb line={route.preview} width={72} height={60} />
              <Text style={styles.rowTitle}>
                {`${name} · ${(route.route_m / 1000).toFixed(1)} km`}
              </Text>
              <Text
                style={styles.match}
              >{`${Math.round(route.similarity * 100)}%`}</Text>
            </Pressable>
          );
        }
        return (
          <View key={example.shape} style={styles.row}>
            <View style={styles.thumb} />
            <Text style={styles.rowTitle}>{name}</Text>
            <Text style={styles.status}>
              {example.status === "failed" ? "Not drawn" : STATUS[example.status]}
            </Text>
          </View>
        );
      })}
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
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: fontSize.small,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
  // As a row of "Best near you", inside the section.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    minHeight: 76,
    borderRadius: radius.md,
    backgroundColor: color.surfaceRaised,
  },
  thumb: {
    width: 72,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: color.surface,
  },
  rowTitle: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  match: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    paddingRight: space.xs,
  },
  status: {
    color: color.textMuted,
    fontSize: fontSize.detail,
    paddingRight: space.xs,
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
