import { Modal } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import type { HealthPhone } from "../health/healthPhone";
import { PoolSwimEnd } from "./PoolSwimEnd";
import { PoolSwimScreen } from "./PoolSwimScreen";
import { usePoolOutbox } from "./usePoolOutbox";
import { usePoolSwim } from "./usePoolSwim";

/**
 * A swim in a pool over the whole app (TASK-400 part B), from «Start swim»
 * in «Draw» until «Save» or «Discard»; an app opened again with one under
 * way opens on it. As the workout at the gym (GymWorkoutHost), with its own
 * safe area. The swims saved go to the API from here, those left from
 * before too. `fetchFn` and `health` are for the tests.
 */
export function PoolSwimHost({
  fetchFn,
  health,
}: { fetchFn?: typeof fetch; health?: HealthPhone | null } = {}) {
  const { swim, nowMs } = usePoolSwim();
  const { save } = usePoolOutbox(fetchFn);
  if (swim === null) {
    return null;
  }
  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={() => {}}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {swim.endedMs === null ? (
          <PoolSwimScreen key={swim.key} swim={swim} nowMs={nowMs} />
        ) : (
          <PoolSwimEnd swim={swim} onSave={save} health={health} />
        )}
      </SafeAreaProvider>
    </Modal>
  );
}
