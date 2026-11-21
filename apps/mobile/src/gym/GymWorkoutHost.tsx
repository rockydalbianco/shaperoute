import { Modal } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { GymEnd } from "./GymEnd";
import { useGymOutbox } from "./useGymOutbox";
import { useSignUpAside } from "./useSignUpAside";
import { useWorkout } from "./useWorkout";
import { WorkoutScreen } from "./WorkoutScreen";

/**
 * A workout at the gym over the whole app (TASK-385 part B), from «Start
 * workout» in «Draw» until «Save» or «Discard»; an app opened again with
 * one under way opens on it. It has its own safe area, as the screens over
 * the Pager do (TASK-366). The workouts saved go to the API from here,
 * those left from before too. Signed out, «Sign up or log in» at its end
 * shows the page of the profile: the workout steps aside, kept, until
 * somebody signs in or the page is left (TASK-453). `fetchFn` is for the
 * tests.
 */
export function GymWorkoutHost({ fetchFn }: { fetchFn?: typeof fetch } = {}) {
  const { workout, nowMs } = useWorkout();
  const { save } = useGymOutbox(fetchFn);
  const { aside, signIn } = useSignUpAside();
  if (workout === null) {
    return null;
  }
  return (
    <Modal
      visible={!aside}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {workout.endedMs === null ? (
          <WorkoutScreen key={workout.key} workout={workout} nowMs={nowMs} />
        ) : (
          <GymEnd workout={workout} onSave={save} onSignIn={signIn} />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}
