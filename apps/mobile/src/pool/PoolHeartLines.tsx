import { Pressable, StyleSheet, Text, View } from "react-native";

import { gymStyles } from "../gym/gymStyles";
import { t, tLater } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { space } from "../theme/tokens";
import type { PoolHeartState } from "./usePoolHeart";

/** The zones as «Heart rate zones» names them (TASK-374, approved). */
const ZONE_NAMES: readonly string[] = [
  tLater("Zone 1 Recovery"),
  tLater("Zone 2 Endurance"),
  tLater("Zone 3 Tempo"),
  tLater("Zone 4 Threshold"),
  tLater("Zone 5 Max"),
];

/**
 * The heart rate at the end of a swim in a pool (TASK-409 part B), under
 * its figures: the button «Add heart rate from Apple Health» until the user
 * adds it once; then the average, the time in each zone and where they come
 * from; a line when the watch wrote nothing. Without Apple Health, nothing.
 */
export function PoolHeartLines({
  state,
  onAdd,
}: {
  state: PoolHeartState;
  onAdd: () => void;
}) {
  if (state.kind === "absent" || state.kind === "reading") {
    return null;
  }
  if (state.kind === "ask") {
    return (
      <Pressable
        style={gymStyles.button}
        onPress={onAdd}
        accessibilityRole="button"
        testID="pool-heart-add"
      >
        <Text style={gymStyles.buttonText}>
          {t("Add heart rate from Apple Health")}
        </Text>
      </Pressable>
    );
  }
  if (state.kind === "none") {
    return (
      <Text style={gymStyles.muted} testID="pool-heart-none">
        {t("No heart rate from your watch for this swim.")}
      </Text>
    );
  }
  const { heart } = state;
  return (
    <View style={styles.heart} testID="pool-heart">
      <Text style={gymStyles.text} testID="pool-heart-avg">
        {`${t("Avg heart rate")}: ${heart.avgBpm} bpm`}
      </Text>
      {heart.zoneS !== null && (
        <View style={styles.zones}>
          <Text style={gymStyles.text}>{t("Time in zones")}</Text>
          {heart.zoneS.map((seconds, i) => (
            <Text
              key={ZONE_NAMES[i]}
              style={gymStyles.muted}
              testID={`pool-zone-${i + 1}`}
            >
              {`${t(ZONE_NAMES[i])} · ${clockLabel(seconds * 1000)}`}
            </Text>
          ))}
        </View>
      )}
      <Text style={gymStyles.muted}>{t("From your watch, via Apple Health")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heart: {
    gap: space.xs,
  },
  zones: {
    gap: space.xs,
  },
});
