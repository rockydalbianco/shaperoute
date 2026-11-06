import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { clockLabel } from "../navigation/freeRun";
import { color, font } from "../theme/tokens";
import { metresLabel } from "./PoolDraw";
import { pacePer100S } from "./poolSwim";
import { usePoolFigures } from "./usePoolFigures";

type Props = {
  /** The post of a swim in a pool. */
  drawingId: string;
  metres: number;
  durationS: number;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * The lengths, the pool and the pace /100 m of a post of a swim in a pool,
 * in its card (TASK-400 part C), as a workout at the gym has its exercises
 * (GymDetail). Nothing shows while they come or when the API does not
 * give them.
 */
export function PoolFigures({ drawingId, metres, durationS, fetchFn }: Props) {
  const figures = usePoolFigures(drawingId, { fetchFn });
  if (figures === null) {
    return null;
  }
  const pace = pacePer100S(durationS, metres);
  return (
    <View testID="pool-figures">
      <Text style={styles.line}>
        {`${t("Lengths")}: ${figures.lengths} × ${metresLabel(figures.pool_length_m)}`}
      </Text>
      {pace !== null && (
        <Text
          style={styles.line}
        >{`${t("Pace /100 m")}: ${clockLabel(pace * 1000)}`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    ...font.body,
    color: color.text,
  },
});
