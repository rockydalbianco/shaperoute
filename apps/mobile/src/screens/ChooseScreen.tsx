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

import { PlaceSearch } from "../places/PlaceSearch";
import type { Place } from "../places/photon";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

type Props = {
  /** Where the route will start, in words (UI.md, «La partenza»). */
  status: string;
  /** Location refused: offer the Settings. */
  denied: boolean;
  /** No position: offer the search. */
  noPosition: boolean;
  onMyPosition: () => void;
  onPlace: (place: Place) => void;
  mapError: string | null;
  /** Shape and distance (RouteChoice). */
  children: ReactNode;
  /** "Draw route", kept at the foot of the screen. */
  footer: ReactNode;
};

/**
 * The first screen (TASK-051): where from, what to draw, how far. The map
 * waits underneath, already loading.
 */
export function ChooseScreen({
  status,
  denied,
  noPosition,
  onMyPosition,
  onPlace,
  mapError,
  children,
  footer,
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
          <Text style={styles.title}>Sgrava</Text>
          <Pressable
            style={styles.button}
            onPress={onMyPosition}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>My position</Text>
          </Pressable>
        </View>
        <View style={styles.startCard}>
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
          {noPosition && <PlaceSearch onSelect={onPlace} />}
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
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  startCard: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
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
  // A secondary control: the yellow belongs to "Draw route" alone.
  button: {
    minHeight: MIN_TAP_SIZE,
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  buttonText: {
    color: color.text,
    fontWeight: fontWeight.bold,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
    backgroundColor: color.background,
  },
});
