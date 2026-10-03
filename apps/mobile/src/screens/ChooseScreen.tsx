import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeartBadge } from "../intro/HeartBadge";
import { PlaceSearch } from "../places/PlaceSearch";
import type { LatLon } from "@shaperoute/shared-types";

import type { Place } from "../places/photon";
import type { StartMode } from "../location/startMode";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { Segmented } from "./Segmented";

/** "My position" also asks the GPS again, as the old button did, so it works
 * after the permission is given in Settings. */
const START_MODES = [
  { value: "gps", label: "My position" },
  { value: "place", label: "Another place" },
] as const;

/** The heart beside the name: as tall as the title's letters and a little more. */
const BADGE_SIZE = 32;

type Props = {
  /** Where the route will start, in words (UI.md, «La partenza»). */
  status: string;
  /** Location refused: offer the Settings. */
  denied: boolean;
  /** Start from the GPS, or from a place searched for (TASK-054). */
  mode: StartMode;
  onMode: (mode: StartMode) => void;
  /** Show the search: another place was asked for, or there is no GPS. */
  searching: boolean;
  onPlace: (place: Place) => void;
  /** The GPS position when known: the search prefers places around it. */
  near: LatLon | null;
  mapError: string | null;
  /** Shape and distance (RouteChoice). */
  children: ReactNode;
  /** "Draw route", kept at the foot of the screen. */
  footer: ReactNode;
  /** Starts a run without a route, the track only (TASK-149). */
  onRun?: () => void;
  /** Its button's words: «Bike» has its own (TASK-190). */
  runLabel?: string;
};

/**
 * The first screen (TASK-051): where from, what to draw, how far. The map
 * waits underneath, already loading.
 */
export function ChooseScreen({
  status,
  denied,
  mode,
  onMode,
  searching,
  onPlace,
  near,
  mapError,
  children,
  footer,
  onRun,
  runLabel = "Run without a route",
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    // The km field is low on the screen: the content shrinks so the keyboard
    // does not cover it.
    <KeyboardAvoidingView
      style={[StyleSheet.absoluteFill, styles.screen]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <View style={styles.brand}>
            {/* The heart of the launch on its yellow, as a logo (TASK-221). */}
            <HeartBadge size={BADGE_SIZE} />
            <Text style={styles.title}>Sgrava</Text>
          </View>
          <View style={styles.titleButtons}>
            {onRun && (
              <Pressable
                style={styles.run}
                onPress={onRun}
                accessibilityRole="button"
                accessibilityLabel={runLabel}
              >
                {/* The whole of it: "Run" alone read as running the route
                    drawn below (TASK-158). */}
                <Text style={styles.runText}>{runLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <View style={styles.startCard}>
          <Text style={styles.label}>START</Text>
          <Segmented options={START_MODES} value={mode} onChange={onMode} />
          <Text style={styles.status}>{status}</Text>
          {denied && (
            <Pressable
              style={styles.linkButton}
              onPress={() => void Linking.openSettings()}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Open Settings</Text>
            </Pressable>
          )}
          {searching && <PlaceSearch onSelect={onPlace} near={near} />}
        </View>
        {mapError && <MapError reason={mapError} />}
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm }]}>
        {footer}
      </View>
    </KeyboardAvoidingView>
  );
}

/** The map page could not load (UI.md, «Quando la mappa non si carica»). */
export function MapError({ reason }: { reason: string }) {
  return (
    <Text style={styles.error}>
      The map could not load ({reason}). Check the connection and reopen the app.
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.background,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  titleButtons: {
    flexDirection: "row",
    gap: space.sm,
  },
  // Yellow, the user's choice (TASK-220, ADR-0183): the one control yellow
  // without being the route's. Dark text on it, as on every yellow.
  run: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    justifyContent: "center",
    backgroundColor: color.accent,
  },
  runText: {
    color: color.onAccent,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  startCard: {
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
  status: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  linkButton: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  // Not yellow: that is the route's. Underlined, so it still reads as a link.
  link: {
    color: color.text,
    fontWeight: fontWeight.bold,
    textDecorationLine: "underline",
  },
  error: {
    color: color.error,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
});
