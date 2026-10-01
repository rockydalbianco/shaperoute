import { type ReactNode, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ExportState } from "../route/useGpxExport";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";

/**
 * "Run with Strava" (TASK-135, ADR-0106): the best flow Strava officially
 * supports. Its API cannot create a route (routes are read-only there), and
 * nothing documented starts a recording or a navigation from another app:
 * so the route goes to Strava as a GPX the user imports in Strava's own
 * route builder, then follows from the Strava app. No account is linked,
 * no token kept, nothing is sent to Strava by this app.
 */

/** Strava's route builder, where a GPX is imported as a route. */
export const STRAVA_ROUTE_BUILDER = "https://www.strava.com/maps/create";
/** Strava: the app when installed (universal link), else the site. */
export const STRAVA_HOME = "https://www.strava.com/";

type Props = {
  exporting: ExportState;
  /** The app's own GPX export, as "Export GPX". */
  onExport: () => void;
  /** Injected in tests. */
  openUrl?: (url: string) => Promise<unknown>;
};

export function RunWithStrava({
  exporting,
  onExport,
  openUrl = Linking.openURL,
}: Props) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function go(url: string) {
    setFailed(null);
    try {
      await openUrl(url);
    } catch {
      setFailed(url);
    }
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Run with Strava</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent}>
            <Text style={styles.title}>Run this route with Strava</Text>
            <Text style={styles.body}>
              Strava does not let other apps add routes for you. In three steps you
              import it yourself and follow it in the Strava app. Nothing is sent to
              Strava until you upload the file there.
            </Text>

            <Step number={1} title="Save the route as a GPX file">
              <Text style={styles.body}>
                Save it to Files, or keep it where you can find it on this phone or a
                computer.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={onExport}
                disabled={exporting.status === "preparing"}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>
                  {exporting.status === "preparing" ? "Preparing GPX…" : "Save GPX"}
                </Text>
              </Pressable>
              {exporting.status === "failed" && (
                <Text style={styles.error}>The GPX could not be made. Try again.</Text>
              )}
            </Step>

            <Step number={2} title="Import it in Strava's route builder">
              <Text style={styles.body}>
                Sign in, tap the upload button, choose the GPX file, then save the
                route.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={() => void go(STRAVA_ROUTE_BUILDER)}
                accessibilityRole="link"
              >
                <Text style={styles.secondaryText}>Open Strava route builder</Text>
              </Pressable>
            </Step>

            <Step number={3} title="Follow it in the Strava app">
              <Text style={styles.body}>
                Record → Add Route → choose this route → Start. Strava guides you along
                it.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                onPress={() => void go(STRAVA_HOME)}
                accessibilityRole="link"
              >
                <Text style={styles.secondaryText}>Open Strava</Text>
              </Pressable>
            </Step>

            {failed !== null && (
              <Text style={styles.error}>
                {`Strava could not be opened. In a browser, go to ${failed}`}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{`${number}. ${title}`}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: color.background,
  },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
  },
  // The sheet ends above the home bar of any phone.
  sheetContent: {
    padding: space.lg,
    paddingBottom: space.xxl * 2,
    gap: space.lg,
  },
  title: {
    color: color.text,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  body: {
    color: color.textMuted,
    fontSize: fontSize.body,
  },
  step: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.background,
  },
  stepTitle: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  error: {
    color: color.error,
    fontSize: fontSize.small,
  },
  secondary: {
    minHeight: MIN_TAP_SIZE,
    paddingHorizontal: space.md,
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
  close: {
    minHeight: MIN_TAP_SIZE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: color.border,
  },
  pressed: {
    opacity: 0.6,
  },
});
