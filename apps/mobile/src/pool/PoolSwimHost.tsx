import { Modal } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import type { HealthPhone } from "../health/healthPhone";
import { useSignUpAside } from "../gym/useSignUpAside";
import type { HeartReader } from "../health/heartSamples";
import { PoolSwimEnd } from "./PoolSwimEnd";
import { PoolSwimScreen } from "./PoolSwimScreen";
import { usePoolOutbox } from "./usePoolOutbox";
import { usePoolSwim } from "./usePoolSwim";

/**
 * A swim in a pool over the whole app (TASK-400 part B), from «Start swim»
 * in «Draw» until «Save» or «Discard»; an app opened again with one under
 * way opens on it. As the workout at the gym (GymWorkoutHost), with its own
 * safe area. The swims saved go to the API from here, those left from
 * before too. Signed out, «Sign up or log in» at its end shows the page of
 * the profile, the swim aside and kept, as the workout does (TASK-453).
 * `fetchFn`, `health` and `heart` are for the tests.
 */
export function PoolSwimHost({
  fetchFn,
  health,
  heart,
}: {
  fetchFn?: typeof fetch;
  health?: HealthPhone | null;
  heart?: HeartReader | null;
} = {}) {
  const { swim, nowMs } = usePoolSwim();
  const { save } = usePoolOutbox(fetchFn);
  const { aside, signIn } = useSignUpAside();
  if (swim === null) {
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
        {swim.endedMs === null ? (
          <PoolSwimScreen key={swim.key} swim={swim} nowMs={nowMs} />
        ) : (
          <PoolSwimEnd
            swim={swim}
            onSave={save}
            onSignIn={signIn}
            health={health}
            heart={heart}
          />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}
