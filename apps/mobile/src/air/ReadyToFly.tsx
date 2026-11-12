import { StyleSheet, Text, View } from "react-native";

import { SwitchRow } from "../contest/EnterSwitch";
import { t } from "../i18n";
import { color, fontSize, fontWeight, radius, space } from "../theme/tokens";
import { setLiveAtStart, useLiveAtStart } from "./liveAtStart";
import { GPS_READY_M, type GpsState, gpsLine } from "./useGpsAccuracy";

type Props = {
  gps: GpsState;
  /** Somebody is signed in: a live link can be made. */
  signedIn: boolean;
};

/**
 * «Ready to fly» under «Record your flight» (TASK-305 part R5b): how good
 * the GPS is now, and «Share live at start», always in sight before the
 * start as the user chose (ADR-0352 «precisazione»). Without an account no
 * switch: a link needs one.
 */
export function ReadyToFly({ gps, signedIn }: Props) {
  const live = useLiveAtStart();
  const line = gpsLine(gps);
  const ready = gps.kind === "fix" && gps.accuracyM <= GPS_READY_M;
  if (line === null && !signedIn) {
    return null;
  }
  return (
    <View style={styles.box} testID="ready-to-fly">
      <Text style={styles.title} accessibilityRole="header">
        {t("Ready to fly")}
      </Text>
      {line !== null && (
        <View style={styles.gps}>
          <View
            style={[styles.dot, ready && styles.dotReady]}
            importantForAccessibility="no"
          />
          <Text style={styles.line} testID="ready-gps">
            {line}
          </Text>
        </View>
      )}
      {signedIn && (
        <>
          <SwitchRow
            label={t("Share live at start")}
            on={live}
            onChange={(on) => setLiveAtStart(on)}
          />
          <Text style={styles.muted}>
            {t(
              "When the countdown ends, MuW makes the link and opens the share sheet.",
            )}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  title: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  gps: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  // Not the colour alone: the words say ready or weak.
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.textFaint,
  },
  dotReady: {
    backgroundColor: color.accent,
  },
  line: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.body,
  },
  muted: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
});
