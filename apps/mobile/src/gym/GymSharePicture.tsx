import { forwardRef, useEffect, useState } from "react";
import { View } from "react-native";

import type { GymSet } from "@shaperoute/shared-types";

import { fetchGymSession } from "../api/gym";
import { useBody } from "../body/useBody";
import { useLanguage } from "../i18n/useLanguage";
import { useFollowsDoor } from "../social/followsDoor";
import { gymKcal, gymKcalLabel } from "./gymKcal";
import { GymTile } from "./GymTile";
import { mainExercises } from "./mainExercises";

type Props = {
  /** The workout's key; null before «Save». */
  gymKey: string | null;
  durationS: number;
  width: number;
  height: number;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * The picture shared of a workout at the gym (TASK-385 part D, the user's
 * «Prima foto, se no riquadro»): its yellow tile, with the main exercises
 * and the energy (part C) once the API gives them to its owner, as they
 * were logged. The ref is the
 * View the picture is taken of, as PostImage's.
 */
export const GymSharePicture = forwardRef<View, Props>(function GymSharePicture(
  { gymKey, durationS, width, height, fetchFn },
  ref,
) {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const language = useLanguage();
  const body = useBody();
  const [sets, setSets] = useState<GymSet[] | null>(null);
  useEffect(() => {
    if (gymKey === null || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchGymSession(apiUrl, token, gymKey, { fetchFn }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setSets(outcome.value.sets);
      }
    });
    return () => {
      live = false;
    };
  }, [gymKey, apiUrl, token, fetchFn]);
  const names = sets === null ? [] : mainExercises(sets, language);
  const kcal =
    sets === null
      ? null
      : gymKcalLabel(gymKcal(sets, durationS, body, new Date().getFullYear()));
  return (
    // Android draws a View it can fold away into its parent: the picture
    // would come out empty.
    <View ref={ref} collapsable={false} testID="gym-share-picture">
      <GymTile
        width={width}
        height={height}
        durationS={durationS}
        exercises={names}
        kcal={kcal}
      />
    </View>
  );
});
