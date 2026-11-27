import { useLayoutEffect, useRef } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { StretchReminder } from "../screens/StretchReminder";
import { StretchScreen } from "../stretch/StretchScreen";
import { space } from "../theme/tokens";
import { GymEnd } from "./GymEnd";
import { gymStyles } from "./gymStyles";
import {
  askStretch,
  endStretch,
  forgetStretch,
  startStretch,
  stretchOf,
  useStretchStep,
} from "./gymStretch";
import { useGymOutbox } from "./useGymOutbox";
import { useSignUpAside } from "./useSignUpAside";
import { useWorkout } from "./useWorkout";
import { savable, type Workout } from "./workout";
import { WorkoutScreen } from "./WorkoutScreen";

/** How near now a workout ends with somebody there: «Stop», not the end by
 * itself at its last set after «Still training?» went unanswered. */
export const ASK_STRETCH_WITHIN_MS = 60_000;

function endedNow(workout: Workout): boolean {
  return (
    workout.endedMs !== null && Date.now() - workout.endedMs <= ASK_STRETCH_WITHIN_MS
  );
}

/**
 * A workout at the gym over the whole app (TASK-385 part B), from «Start
 * workout» in «Draw» until «Save» or «Discard»; an app opened again with
 * one under way opens on it. It has its own safe area, as the screens over
 * the Pager do (TASK-366). The workouts saved go to the API from here,
 * those left from before too. Signed out, «Sign up or log in» at its end
 * shows the page of the profile: the workout steps aside, kept, until
 * somebody signs in or the page is left (TASK-453). `fetchFn` is for the
 * tests.
 *
 * As a workout with something to save ends with somebody there, «Remember
 * to stretch» comes before its end (TASK-466 part C2): «Stretch» opens
 * «After gym», «Skip» goes on; what the stretching was goes with the
 * workout at «Save» (gymStretch.ts).
 */
export function GymWorkoutHost({ fetchFn }: { fetchFn?: typeof fetch } = {}) {
  const { workout, nowMs } = useWorkout();
  const { save } = useGymOutbox(fetchFn);
  const { aside, signIn } = useSignUpAside();
  const key = workout?.key ?? null;
  const step = useStretchStep(key);
  // The workout as last seen: the reminder is asked as it ends here, not for
  // one opened again ended already. Before the screen is drawn, so its end
  // never shows first.
  const seen = useRef<{ key: string; ended: boolean } | null>(null);
  useLayoutEffect(() => {
    if (workout === null) {
      seen.current = null;
      forgetStretch();
      return;
    }
    const ended = workout.endedMs !== null;
    const was = seen.current;
    if (
      was !== null &&
      was.key === workout.key &&
      !was.ended &&
      ended &&
      savable(workout) &&
      endedNow(workout)
    ) {
      askStretch(workout.key);
    }
    seen.current = { key: workout.key, ended };
  }, [workout]);
  if (workout === null || key === null) {
    return null;
  }
  let screen;
  if (workout.endedMs === null) {
    screen = <WorkoutScreen key={workout.key} workout={workout} nowMs={nowMs} />;
  } else if (step === "ask") {
    screen = (
      <View style={[gymStyles.screen, styles.ask]} testID="gym-stretch-ask">
        <StretchReminder
          onStretch={() => startStretch(key)}
          onSkip={() => endStretch(key)}
        />
      </View>
    );
  } else if (step === "stretching") {
    screen = (
      <StretchScreen
        routine="afterGym"
        onDone={(done) => endStretch(key, done)}
        onLeave={() => endStretch(key)}
      />
    );
  } else {
    screen = (
      <GymEnd
        workout={workout}
        onSave={(ended, post) => save(ended, post, stretchOf(ended.key))}
        onSignIn={signIn}
      />
    );
  }
  return (
    <Modal
      visible={!aside}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {screen}
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ask: {
    justifyContent: "center",
    padding: space.xl,
  },
});
