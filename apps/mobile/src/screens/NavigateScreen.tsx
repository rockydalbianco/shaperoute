import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type Navigation, remainingM, upcoming } from "../navigation/navigator";
import { ARROWS, distanceLabel, instruction, thenText } from "../navigation/phrases";
import { compassPoint, headingDeg, share } from "../navigation/runStats";
import { emptyTrack, type Track } from "../navigation/trackRecorder";
import type { NavigationState } from "../navigation/useNavigation";
import { usePocketMode } from "../navigation/usePocketMode";
import {
  color,
  fontSize,
  fontWeight,
  MIN_TAP_SIZE,
  radius,
  space,
} from "../theme/tokens";
import { confirmPocketMode, PocketScreen } from "./PocketScreen";
import { RunPanel } from "./RunPanel";

/**
 * Navigation over the map (TASK-049): the next turn at the top, big enough
 * to read while running, and under the map the numbers of the run and the
 * way out (TASK-164). Voice and vibration say the same (useNavigation).
 */

/** The share of the route that is run, 0 to 1. */
function doneOf(navigation: Navigation): number {
  return share(navigation.alongM, navigation.along[navigation.along.length - 1] ?? 0);
}

export function NavigationBanner({ state }: { state: NavigationState }) {
  const track = state.status === "following" ? state.track : null;
  const heading = useMemo(() => (track ? headingDeg(track) : null), [track]);
  if (state.status === "denied") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>
          Location is off for Sgrava: allow it in Settings to navigate.
        </Text>
      </View>
    );
  }
  if (state.status === "starting") {
    return (
      <View style={styles.banner}>
        <Text style={styles.message}>Finding your position…</Text>
      </View>
    );
  }
  const { navigation } = state;
  if (navigation.arrived) {
    return (
      <View style={styles.banner}>
        <Text style={styles.instruction}>You have arrived.</Text>
      </View>
    );
  }
  return (
    <View style={styles.top}>
      <NextTurn navigation={navigation} />
      {/* How much of the drawing is done, and which way the runner heads. */}
      <View style={styles.chips}>
        <Text
          style={styles.chip}
        >{`${Math.round(doneOf(navigation) * 100)}% drawn`}</Text>
        {heading !== null && (
          <Text
            style={styles.chip}
            accessibilityLabel={`Heading ${compassPoint(heading)}`}
          >
            {compassPoint(heading)}
          </Text>
        )}
      </View>
    </View>
  );
}

function NextTurn({ navigation }: { navigation: Navigation }) {
  if (navigation.offRoute) {
    return (
      <View style={[styles.box, styles.off]}>
        <Text style={styles.instruction}>Off the route</Text>
        <Text style={styles.message}>Head back to the yellow line.</Text>
      </View>
    );
  }
  const next = upcoming(navigation);
  if (next === null) {
    return (
      <View style={styles.box}>
        <Text style={styles.instruction}>Follow the route to the end.</Text>
      </View>
    );
  }
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.arrow} accessibilityElementsHidden>
          {ARROWS[next.direction.turn]}
        </Text>
        <View style={styles.words}>
          <Text style={styles.distance}>{distanceLabel(next.inM)}</Text>
          <Text style={styles.instruction}>{instruction(next.direction)}</Text>
        </View>
      </View>
      {next.then.length > 0 && (
        <Text style={styles.message}>{thenText(next.then)}</Text>
      )}
    </View>
  );
}

/** No line yet: one track, so the panel is not told again of nothing. */
const NO_TRACK = emptyTrack();

export function NavigationCard({
  navigation,
  track = NO_TRACK,
  onStop,
}: {
  navigation: Navigation | null;
  /** The line run so far, for the numbers (TASK-164). */
  track?: Track;
  onStop: () => void;
}) {
  // Pocket mode only while there is a route to follow: arriving ends it.
  const following = navigation !== null && !navigation.arrived;
  const pocket = usePocketMode(following);
  return (
    <View style={styles.card}>
      <RunPanel
        track={track}
        ticking={following && track.fixes.length > 0}
        route={
          navigation
            ? { remainingM: remainingM(navigation), done: doneOf(navigation) }
            : undefined
        }
      />
      <View style={styles.buttons}>
        {following && (
          <Pressable
            style={styles.stop}
            onPress={() => confirmPocketMode(pocket.enter)}
            accessibilityRole="button"
            accessibilityLabel="Pocket mode"
          >
            <Text style={styles.stopText}>Pocket</Text>
          </Pressable>
        )}
        <Pressable style={styles.stop} onPress={onStop} accessibilityRole="button">
          {/* Both end the run and show its score (TASK-113). */}
          <Text style={styles.stopText}>{navigation?.arrived ? "Finish" : "Stop"}</Text>
        </Pressable>
      </View>
      <PocketScreen on={pocket.on} onExit={pocket.exit} />
    </View>
  );
}

const box = {
  gap: space.xs,
  padding: space.md,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: color.borderStrong,
  backgroundColor: color.surfaceRaised,
} as const;

const styles = StyleSheet.create({
  // Alone at the top of the map: it takes the width the way back leaves.
  banner: {
    ...box,
    flex: 1,
  },
  // The turn, and under it what the map alone does not say.
  top: {
    flex: 1,
    gap: space.sm,
  },
  box,
  off: {
    borderColor: color.warning,
  },
  chips: {
    flexDirection: "row",
    gap: space.sm,
  },
  chip: {
    overflow: "hidden",
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    color: color.text,
    fontSize: fontSize.detail,
    fontWeight: fontWeight.semibold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  arrow: {
    color: color.accent,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  words: {
    flex: 1,
  },
  distance: {
    color: color.accent,
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
  },
  instruction: {
    color: color.text,
    fontSize: fontSize.input,
    fontWeight: fontWeight.semibold,
  },
  message: {
    color: color.textMuted,
    fontSize: fontSize.small,
  },
  card: {
    gap: space.md,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  stop: {
    flex: 1,
    minHeight: MIN_TAP_SIZE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surfaceRaised,
  },
  stopText: {
    color: color.text,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
