import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { clockLabel } from "../feed/postSections";
import { t } from "../i18n";
import { MapView } from "../map/MapView";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { distanceLabel, paceLabel } from "../units/format";
import { isOver, useLiveView, type LiveViewState } from "./useLiveView";

/** No update for this long: the page says since when (TASK-424). */
export const QUIET_MS = 60_000;

type Props = {
  shareId: string;
  apiUrl: string;
  token: string;
  /** Whose live it is, for the title. */
  name: string;
  onClose: () => void;
  fetchFn?: typeof fetch;
  apiKey?: string | null;
  /** For the tests: the clock. */
  now?: () => number;
};

/** The line under the numbers: «Updated 10 s ago», «No update since
 * 10:42», «Finished · 42.2 km · 3:28:10», «Live ended»; null before the
 * first answer. Texts approved by the user on 2026-11-12. */
export function viewLine(view: LiveViewState, nowMs: number): string | null {
  if (view.status === null) {
    return null;
  }
  if (isOver(view.status)) {
    return t("Live ended");
  }
  if (view.status === "finished") {
    return t("Finished · {distance} · {time}", {
      distance: distanceLabel(view.stats?.distance_m ?? 0),
      time: clockLabel(view.stats?.duration_s ?? 0),
    });
  }
  const at = view.updatedAt === null ? null : Date.parse(view.updatedAt);
  if (at === null || Number.isNaN(at)) {
    return null;
  }
  const ago = Math.max(0, nowMs - at);
  if (ago >= QUIET_MS) {
    const time = new Date(at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return t("No update since {time}", { time });
  }
  return t("Updated {seconds} s ago", { seconds: Math.round(ago / 1000) });
}

/**
 * A live share in the app (TASK-468 part B1, ADR-0381; the user's choice 2):
 * opened from its card in a conversation, and from the Feed in part B2. The
 * map with the route so far and where the person is now, distance, time
 * and pace, asked again every 10 s (useLiveView). Its heart rate only when
 * its owner turned it on (the API sends none otherwise).
 */
export function LiveViewScreen(props: Props) {
  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Live {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function Live({
  shareId,
  apiUrl,
  token,
  name,
  onClose,
  fetchFn,
  apiKey,
  now = Date.now,
}: Props) {
  const insets = useSafeAreaInsets();
  const api = useMemo(
    () => ({ baseUrl: apiUrl, token, fetchFn, key: apiKey }),
    [apiKey, apiUrl, fetchFn, token],
  );
  const view = useLiveView(api, shareId);
  const [, setMapProblem] = useState<string | null>(null);
  const points = view.points;
  const here = points.length > 0 ? points[points.length - 1] : null;
  const stats = view.stats;
  const line = viewLine(view, now());
  const pace =
    stats === null
      ? null
      : paceLabel(stats.distance_m ?? 0, (stats.duration_s ?? 0) * 1000);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.titleRow}>
        {view.status === "live" && <View style={styles.dot} />}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {name}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={onClose}
          accessibilityRole="button"
          testID="live-view-close"
        >
          <Text style={styles.closeText}>{t("Close")}</Text>
        </Pressable>
      </View>
      <View style={styles.map}>
        {points.length > 0 && (
          <MapView
            // No start marker: the map follows where the person is now.
            start={isOver(view.status) ? points[0] : null}
            route={null}
            track={points}
            following={isOver(view.status) ? null : here}
            onError={setMapProblem}
            style={styles.fill}
          />
        )}
      </View>
      <View style={[styles.numbers, { paddingBottom: insets.bottom + space.md }]}>
        {stats !== null && (
          <View style={styles.row} testID="live-view-numbers">
            <Text style={styles.number}>{distanceLabel(stats.distance_m ?? 0)}</Text>
            <Text style={styles.number}>{clockLabel(stats.duration_s ?? 0)}</Text>
            {pace !== null && <Text style={styles.number}>{pace}</Text>}
            {typeof stats.heart_bpm === "number" && (
              <Text style={styles.number}>{`♥ ${stats.heart_bpm}`}</Text>
            )}
          </View>
        )}
        {line === null ? (
          view.status === null && <Text style={styles.line}>{t("Loading…")}</Text>
        ) : (
          <Text
            style={styles.line}
            accessibilityLiveRegion="polite"
            testID="live-view-line"
          >
            {line}
          </Text>
        )}
      </View>
    </View>
  );
}

const DOT = 10;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: color.error,
  },
  title: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  close: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.borderStrong,
  },
  closeText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  fill: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: color.surface,
  },
  numbers: {
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
  },
  number: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  line: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  pressed: {
    opacity: 0.6,
  },
});
