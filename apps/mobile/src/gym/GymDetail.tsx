import { StyleSheet, View } from "react-native";

import { space } from "../theme/tokens";
import { ExerciseList } from "./ExerciseList";
import { NewLevels } from "./NewLevels";
import { useGymExercises } from "./useGymExercises";

type Props = {
  /** The post of a workout at the gym. */
  drawingId: string;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * The exercises on the post of a workout at the gym, in its card (TASK-385
 * B0, ADR-0327), as a day of skiing has its lifts and pistes: asked of the
 * API with the account's token, once for the tile in the Feed and the card
 * (part D), with the levels it reached first (part E). Nothing shows while
 * they come, when its owner hides them (404) or when the API does not give
 * them.
 */
export function GymDetail({ drawingId, fetchFn }: Props) {
  const exercises = useGymExercises(drawingId, { fetchFn });
  if (exercises === null) {
    return null;
  }
  return (
    <View style={styles.detail}>
      <NewLevels exercises={exercises} />
      <ExerciseList exercises={exercises} />
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    gap: space.md,
  },
});
