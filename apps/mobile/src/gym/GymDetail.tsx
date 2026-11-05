import { ExerciseList } from "./ExerciseList";
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
 * (part D). Nothing shows while they come, when its owner hides them (404)
 * or when the API does not give them.
 */
export function GymDetail({ drawingId, fetchFn }: Props) {
  const exercises = useGymExercises(drawingId, { fetchFn });
  if (exercises === null) {
    return null;
  }
  return <ExerciseList exercises={exercises} />;
}
