import { StyleSheet, View } from "react-native";

import { t } from "../i18n";
import { space } from "../theme/tokens";
import { ConnectWithStrava, StravaLine, StravaSwitch } from "./StravaParts";
import type { StravaState } from "./useStrava";

type Props = {
  strava: StravaState;
  /** The switch: the run goes to Strava with «Save». */
  send: boolean;
  onSend: (on: boolean) => void;
};

/**
 * «Send to Strava» at the end of a run (TASK-187), over «Save» and
 * «Discard»: nothing when the API has no Strava; «Connect with Strava»
 * before the athlete is connected; then the switch. The activity on Strava
 * takes the run's «Title» as its name (TASK-117), and from the drawing its
 * description and what it was, Run, Ride or StandUpPaddling (TASK-208);
 * the photos never go, Strava's API takes none.
 */
export function StravaRunEnd({ strava, send, onSend }: Props) {
  const { status, busy, problem } = strava;
  if (!status.available) {
    return null;
  }
  if (!status.connected) {
    return (
      <View style={styles.block}>
        <ConnectWithStrava busy={busy === "connecting"} onPress={strava.connect} />
        <StravaLine
          text={problem ?? t("Connect Strava, and Save sends your runs there too.")}
          alert={problem !== null}
        />
      </View>
    );
  }
  return (
    <View style={styles.block}>
      <StravaSwitch on={send} onChange={onSend} />
      {send && status.athlete !== null && (
        <StravaLine
          text={t("To {athlete}'s Strava, with Save.", { athlete: status.athlete })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
});
