import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { drawingProblem } from "../api/drawings";
import { fetchGymSession, showGymExercises } from "../api/gym";
import { SwitchRow } from "../contest/EnterSwitch";
import { t } from "../i18n";
import { useFollowsDoor } from "../social/followsDoor";
import { PublicLine } from "../social/PublicParts";
import { space } from "../theme/tokens";

type Props = {
  /** The workout's key, as «My activities» has it. */
  gymKey: string;
  disabled?: boolean;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * «Show exercises» on the card of a workout in «My activities» (TASK-385
 * part D, the user's «Visibili, nascondibili»): as the API has it, and
 * changed there at once. Nothing until the API says; a change it did not
 * take goes back, with the words of the drawing's form.
 */
export function ShowExercises({ gymKey, disabled, fetchFn }: Props) {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [shown, setShown] = useState<{ key: string; on: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGymSession(apiUrl, token, gymKey, { fetchFn }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setShown({ key: gymKey, on: outcome.value.show_exercises });
      }
    });
    return () => {
      live = false;
    };
  }, [apiUrl, token, gymKey, fetchFn]);

  if (shown === null || shown.key !== gymKey || apiUrl === null || token === null) {
    return null;
  }
  const was = shown.on;

  function change(on: boolean) {
    if (apiUrl === null || token === null) {
      return;
    }
    setShown({ key: gymKey, on });
    setBusy(true);
    setProblem(null);
    void showGymExercises(apiUrl, token, gymKey, on, { fetchFn }).then((outcome) => {
      setBusy(false);
      if (outcome.kind !== "ok") {
        setShown({ key: gymKey, on: was });
        setProblem(drawingProblem(outcome));
      }
    });
  }

  return (
    <View style={styles.block} testID="show-exercises">
      <SwitchRow
        label={t("Show exercises")}
        on={shown.on}
        onChange={change}
        disabled={disabled === true || busy}
      />
      {problem !== null && <PublicLine text={problem} alert />}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
});
