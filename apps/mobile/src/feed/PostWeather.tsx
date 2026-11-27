import { StyleSheet, Text, View } from "react-native";

import { color, font, space } from "../theme/tokens";

type Props = {
  /** MET Norway's symbol as a sign ("⛅"); "" for none. */
  sign: string;
  /** "14°". */
  temperature: string;
  /** "Wind 12 km/h"; null for none. */
  wind: string | null;
  /** What VoiceOver says of the card. */
  label: string;
};

/**
 * The weather of a post (TASK-410 part E): the sky and the temperature large,
 * the wind under them, as MET Norway gave them for the hour of the end. The
 * credit to MET Norway is in «About» (the user's choice E2), not here.
 */
export function PostWeather({ sign, temperature, wind, label }: Props) {
  return (
    <View style={styles.box} accessible accessibilityLabel={label}>
      <View style={styles.sky}>
        {sign !== "" && <Text style={styles.big}>{sign}</Text>}
        <Text style={styles.big}>{temperature}</Text>
      </View>
      {wind !== null && <Text style={styles.wind}>{wind}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.xs,
  },
  sky: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  big: {
    ...font.title,
    color: color.text,
  },
  wind: {
    ...font.body,
    color: color.textMuted,
  },
});
