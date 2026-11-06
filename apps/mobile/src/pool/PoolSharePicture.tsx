import type { PoolSwimFigures } from "@shaperoute/shared-types";
import { forwardRef, useEffect, useState } from "react";
import { View } from "react-native";

import { fetchPoolSwim } from "../api/poolSwims";
import { useFollowsDoor } from "../social/followsDoor";
import { PoolTile } from "./PoolTile";

type Props = {
  /** The swim's key; null before «Save», or for a post of the Feed. */
  poolKey: string | null;
  durationS: number;
  metres: number;
  width: number;
  height: number;
  /** For the tests: the API asked with this instead of `fetch`. */
  fetchFn?: typeof fetch;
};

/**
 * The picture shared of a swim in a pool (TASK-400 part C): its yellow
 * tile with the metres, the time and the pace, and the lengths and the
 * pool once the API gives them to its owner. As a workout's
 * (GymSharePicture); the ref is the View the picture is taken of.
 */
export const PoolSharePicture = forwardRef<View, Props>(function PoolSharePicture(
  { poolKey, durationS, metres, width, height, fetchFn },
  ref,
) {
  const { apiUrl, account } = useFollowsDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const [figures, setFigures] = useState<PoolSwimFigures | null>(null);
  useEffect(() => {
    if (poolKey === null || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchPoolSwim(apiUrl, token, poolKey, { fetchFn }).then((outcome) => {
      if (live && outcome.kind === "ok") {
        setFigures({
          pool_length_m: outcome.value.pool_length_m,
          lengths: outcome.value.lengths,
        });
      }
    });
    return () => {
      live = false;
    };
  }, [poolKey, apiUrl, token, fetchFn]);
  return (
    // Android draws a View it can fold away into its parent: the picture
    // would come out empty.
    <View ref={ref} collapsable={false} testID="pool-share-picture">
      <PoolTile
        width={width}
        height={height}
        durationS={durationS}
        metres={metres}
        figures={figures}
      />
    </View>
  );
});
