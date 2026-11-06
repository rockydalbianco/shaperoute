import { useCallback, useEffect, useRef } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { savePoolSwimOnApi } from "../api/poolSwims";
import { useFollowsDoor } from "../social/followsDoor";
import { keepPace } from "./poolChoice";
import {
  keepPoolWaiting,
  type PoolKept,
  poolToSend,
  refusePoolWaiting,
  stopPoolWaiting,
} from "./poolOutbox";
import {
  activeMs,
  pacePer100S,
  poolMetres,
  poolSwimRequest,
  type PoolSwim,
} from "./poolSwim";

/** What «Save» did with a swim: as a workout's, or nobody signed in, or
 * nothing to save (lengths the API would refuse). */
export type PoolSaved = PoolKept | "signed_out" | "nothing";

/**
 * «Save» of a swim in a pool (TASK-400 part B): first into its file on the
 * phone, then to the API, now or when there is a network; once the API has
 * it, «My activities» asks for its list again. A swim the API will not take
 * (422, or 409 for a key of a run) stays on the phone and is not sent
 * again. As the workouts at the gym (gym/useGymOutbox.ts), without a post
 * (TASK-400 part C). `fetchFn` is for the tests.
 */
export function usePoolOutbox(fetchFn?: typeof fetch): {
  save: (swim: PoolSwim, lengths: number) => PoolSaved;
} {
  const { apiUrl, account } = useFollowsDoor();
  const { owner, refresh } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const sending = useRef(false);
  const latest = useRef({ apiUrl, token, owner, refresh, fetchFn });
  // The latest of each, for a send that waits on the network.
  useEffect(() => {
    latest.current = { apiUrl, token, owner, refresh, fetchFn };
  });

  const send = useCallback(async () => {
    const { apiUrl: url, token: key, owner: who } = latest.current;
    if (sending.current || url === null || key === null || who === null) {
      return;
    }
    sending.current = true;
    let sent = false;
    const options = { fetchFn: latest.current.fetchFn };
    try {
      for (const waiting of poolToSend(who)) {
        const outcome = await savePoolSwimOnApi(
          url,
          key,
          waiting.key,
          waiting.request,
          options,
        );
        if (outcome.kind === "ok") {
          stopPoolWaiting(who, waiting.key);
          sent = true;
        } else if (
          outcome.kind === "api_error" &&
          (outcome.code === "invalid_request" || outcome.code === "http_error")
        ) {
          refusePoolWaiting(who, waiting.key, {
            code: outcome.code,
            message: outcome.message,
          });
        } else {
          // No network, or the API is away: they wait for the next time.
          break;
        }
      }
    } finally {
      sending.current = false;
      if (sent) {
        latest.current.refresh();
      }
    }
  }, []);

  // Those left from before go as soon as somebody is signed in.
  useEffect(() => {
    void send();
  }, [send, token, owner]);

  const save = useCallback(
    (swim: PoolSwim, lengths: number): PoolSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      const request = poolSwimRequest(swim, lengths);
      if (request === null || swim.endedMs === null) {
        return "nothing";
      }
      const kept = keepPoolWaiting({ owner: who, key: swim.key, request });
      if (kept === "kept") {
        // The next estimate of «How many lengths?» goes by it.
        const pace = pacePer100S(
          activeMs(swim, swim.endedMs) / 1000,
          poolMetres(lengths, swim.poolLengthM),
        );
        if (pace !== null) {
          keepPace(pace);
        }
        void send();
      }
      return kept;
    },
    [send],
  );

  return { save };
}
