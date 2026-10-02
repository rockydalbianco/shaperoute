import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

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
import { CardMapsCredit, cardWidth, RouteCard } from "./RouteCard";

type Props = {
  city: Place;
  examples: Example[];
  onOpen: (route: RecommendedRoute) => void;
  onRetry: () => void;
  /** How wide the section is; without it, the window less the page's margins. */
  width?: number;
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
export function CityExamples({ city, examples, onOpen, onRetry, width }: Props) {
  const window = useWindowDimensions();
  // Two cards side by side inside the section, as in «Best near you».
  const card = cardWidth((width ?? window.width - 2 * space.lg) - 2 * space.md);
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
      <View style={styles.grid}>
        {examples.map((example) => {
          const name = capitalised(example.shape);
          if (example.status === "ready") {
            const { route } = example;
            const km = (route.route_m / 1000).toFixed(1);
            return (
              <RouteCard
                key={example.shape}
                width={card}
                line={route.preview}
                title={`${name} · ${km} km`}
                detail={route.city}
                match={route.similarity}
                map
                onPress={() => onOpen(route)}
                accessibilityLabel={`${name}, ${km} km`}
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
                example.status === "failed" ? "Not drawn" : STATUS[example.status]
              }
            />
          );
        })}
      </View>
      {examples.some((e) => e.status === "ready") && <CardMapsCredit />}
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
  // As the cards of "Best near you", inside the section.
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
