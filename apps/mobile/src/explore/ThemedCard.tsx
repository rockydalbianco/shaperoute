import { type RouteResult, type Shape, SHAPES } from "@shaperoute/shared-types";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../i18n";

import type { ExportState } from "../route/useGpxExport";
import type { AnyRouteRequest } from "../route/useRouteRequest";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { distanceLabel, withPoint } from "../units/format";
import { useUnits } from "../units/useUnits";
import { ExploreStart } from "./ExploreStart";
import type { ThemedResult } from "./themedRoutes";
import type { StartView } from "./useStartDirections";
import type { ThemedState } from "./useThemedRoute";

function isShape(value: string): value is Shape {
  return (SHAPES as readonly string[]).includes(value);
}

/** The request and result a drawn route has: what the GPX export sends. */
export function themedGpx(
  result: ThemedResult,
): { request: AnyRouteRequest; result: RouteResult } | null {
  if (!isShape(result.shape)) {
    return null;
  }
  return {
    request: {
      start: result.points[0],
      shape: result.shape,
      distance_m: result.target_m,
      activity: "running",
    },
    result: {
      points: result.points,
      distance_m: result.distance_m,
      similarity: result.similarity,
      shape: result.shape,
      warnings: [],
      // Planned without turn-by-turn: Start asks for them (TASK-145).
      directions: [],
    },
  };
}

/** "Passes by 3 of 5 places", or why none. */
export function passedText(result: ThemedResult): string {
  const passed = result.stops.filter((s) => s.passed).length;
  const found = result.stops.length;
  if (passed === 0) {
    return t(
      "It passes by none of the {found} {theme} found: the shape did not fit near them.",
      {
        found,
        theme: result.theme_label,
      },
    );
  }
  return t("Passes by {passed} of the {found} {theme} found:", {
    passed,
    found,
    theme: result.theme_label,
  });
}

type Props = {
  state: ThemedState;
  exporting: ExportState;
  onExport: () => void;
  onCancel: () => void;
  /** Turn-by-turn along it, the directions asked for first (TASK-145). */
  start: StartView;
  onStart: () => void;
};

/** Under the map: a shape through the places of a theme (TASK-129). */
export function ThemedCard({
  state,
  exporting,
  onExport,
  onCancel,
  start,
  onStart,
}: Props) {
  // Written again when «Settings» changes the units (TASK-182); with a
  // point, as the texts here, still in English.
  const units = useUnits();
  if (state.status === "idle") {
    return null;
  }
  if (state.status === "waiting") {
    return (
      <View style={styles.panel}>
        <Text style={styles.body}>
          Finding the places and drawing the shape through them… This can take a minute.
        </Text>
        <Pressable
          style={styles.secondary}
          onPress={onCancel}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{t("Cancel")}</Text>
        </Pressable>
      </View>
    );
  }
  if (state.status === "failed") {
    return (
      <View style={styles.panel}>
        <Text style={styles.error}>{state.message}</Text>
        <Pressable
          style={styles.secondary}
          onPress={onCancel}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>{t("Back to Explore")}</Text>
        </Pressable>
      </View>
    );
  }
  const { result } = state;
  const passed = result.stops.filter((s) => s.passed);
  return (
    <View style={styles.panel}>
      <View>
        <Text style={styles.result}>
          {distanceLabel(result.distance_m, units, withPoint)}
        </Text>
        <Text style={styles.target}>
          {`${result.shape.replace(/_/g, " ")} · ${result.city ?? "here"} · looks ${Math.round(result.similarity * 100)}% like it`}
        </Text>
      </View>
      <Text style={styles.body}>{passedText(result)}</Text>
      {passed.length > 0 && (
        <Text style={styles.places}>{passed.map((s) => s.name).join(" · ")}</Text>
      )}
      <ExploreStart start={start} onStart={onStart} />
      <Pressable
        style={styles.secondary}
        onPress={onExport}
        disabled={exporting.status === "preparing"}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>
          {exporting.status === "preparing" ? t("Preparing GPX…") : t("Export GPX")}
        </Text>
      </Pressable>
      {exporting.status === "failed" && (
        <Text style={styles.error}>{t("The GPX could not be made. Try again.")}</Text>
      )}
      <Pressable style={styles.secondary} onPress={onCancel} accessibilityRole="button">
        <Text style={styles.secondaryText}>{t("Back to Explore")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.md,
  },
  result: {
    color: color.text,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  target: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  body: {
    color: color.text,
    fontSize: fontSize.body,
  },
  places: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  error: {
    color: color.error,
    fontSize: fontSize.body,
  },
  secondary: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  secondaryText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
