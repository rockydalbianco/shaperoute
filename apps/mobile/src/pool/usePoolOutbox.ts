import { useCallback, useEffect, useRef } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { sendWaitingSleep } from "../activities/sleepOut";
import { savePoolSwimOnApi } from "../api/poolSwims";
import { keepForDrawing, sendWaitingDrawings } from "../social/drawingOutbox";
import { keepOrder } from "../social/drawingOrder";
import { keepPhotos } from "../social/drawingPhotos";
import { useFollowsDoor } from "../social/followsDoor";
import { saveVisibility } from "../social/visibilityChoice";
import { keepPace } from "./poolChoice";
import {
  keepPoolWaiting,
  type PoolKept,
  poolToSend,
  refusePoolWaiting,
  stopPoolWaiting,
} from "./poolOutbox";
import type { PoolHeart as PoolHeartRead } from "./poolHeart";
import { type PoolPost, poolPostPhotos } from "./PoolPostForm";
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
 * again. Its post (TASK-400 part C) goes after it, through the drawings'
 * own file, with its photos and their order, as a workout's
 * (gym/useGymOutbox.ts). `fetchFn` is for the tests.
 */
export function usePoolOutbox(fetchFn?: typeof fetch): {
  save: (
    swim: PoolSwim,
    lengths: number,
    post?: PoolPost,
    heart?: PoolHeartRead | null,
  ) => PoolSaved;
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
    let posts = false;
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
          if (waiting.drawing !== undefined) {
            keepForDrawing({ owner: who, key: waiting.key, ...waiting.drawing });
            posts = true;
          }
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
      if (posts) {
        await sendWaitingDrawings(url, key, who, options);
      }
      // «Sleep last night» of what the API has now (TASK-467 part B2b):
      // nothing waits, and nothing is asked, unless a post shows a night.
      await sendWaitingSleep(url, key, who, options);
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
    (
      swim: PoolSwim,
      lengths: number,
      post?: PoolPost,
      heart: PoolHeartRead | null = null,
    ): PoolSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      // Its heart rate, shown in the post unless turned off (TASK-409 B).
      const request = poolSwimRequest(
        swim,
        lengths,
        heart === null
          ? null
          : {
              avgBpm: heart.avgBpm,
              maxBpm: heart.maxBpm,
              shown: post?.showHeart ?? true,
            },
      );
      if (request === null || swim.endedMs === null) {
        return "nothing";
      }
      const kept = keepPoolWaiting({
        owner: who,
        key: swim.key,
        request,
        ...(post === undefined ? {} : { drawing: post.choice }),
      });
      if (kept === "kept") {
        if (post !== undefined) {
          // The photos take the places of the post's order, as a workout's.
          const { photos, order } = poolPostPhotos(post);
          keepPhotos(who, swim.key, photos);
          if (order !== null) {
            keepOrder(who, swim.key, order);
          }
          saveVisibility(who, post.choice.visibility);
        }
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
