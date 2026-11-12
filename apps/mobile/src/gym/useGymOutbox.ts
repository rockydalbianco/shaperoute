import { useCallback, useEffect, useRef } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { sendWaitingSleep } from "../activities/sleepOut";
import { saveGymSession, showGymExercises } from "../api/gym";
import { keepForDrawing, sendWaitingDrawings } from "../social/drawingOutbox";
import { keepOrder } from "../social/drawingOrder";
import { keepPhotos } from "../social/drawingPhotos";
import { useFollowsDoor } from "../social/followsDoor";
import { saveVisibility } from "../social/visibilityChoice";
import {
  type GymKept,
  gymToSend,
  keepGymWaiting,
  refuseGymWaiting,
  stopGymWaiting,
} from "./gymOutbox";
import { type GymPost, postPhotos } from "./GymPostForm";
import { sessionRequest, type Workout } from "./workout";

/** What «Save» did with a workout: as a run's, or nobody signed in, or
 * nothing to save. */
export type GymSaved = GymKept | "signed_out" | "nothing";

/**
 * «Save» of a workout at the gym (TASK-385 part B): first into its file on
 * the phone, then to the API, now or when there is a network; once the API
 * has it, «My activities» asks for its list again. A workout the API will
 * not take (422, or 409 for a key of a run) stays on the phone and is not
 * sent again. Its post (TASK-385 part D) goes after it: «Show exercises»
 * turned off first, then the drawing's choice with its photos and their
 * order, through the drawings' own file. `fetchFn` is for the tests.
 */
export function useGymOutbox(fetchFn?: typeof fetch): {
  save: (workout: Workout, post?: GymPost) => GymSaved;
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
      for (const waiting of gymToSend(who)) {
        const outcome = await saveGymSession(
          url,
          key,
          waiting.key,
          waiting.request,
          options,
        );
        if (outcome.kind === "ok") {
          // Hidden before anybody sees the post: with no network it waits,
          // and the workout is sent again, the same.
          if (waiting.show === false) {
            const hidden = await showGymExercises(
              url,
              key,
              waiting.key,
              false,
              options,
            );
            if (hidden.kind === "unreachable" || hidden.kind === "bad_answer") {
              break;
            }
          }
          if (waiting.drawing !== undefined) {
            keepForDrawing({ owner: who, key: waiting.key, ...waiting.drawing });
            posts = true;
          }
          stopGymWaiting(who, waiting.key);
          sent = true;
        } else if (
          outcome.kind === "api_error" &&
          (outcome.code === "invalid_request" || outcome.code === "http_error")
        ) {
          refuseGymWaiting(who, waiting.key, {
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
    (workout: Workout, post?: GymPost): GymSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      const request = sessionRequest(workout);
      if (request === null) {
        return "nothing";
      }
      const kept = keepGymWaiting({
        owner: who,
        key: workout.key,
        request,
        ...(post === undefined
          ? {}
          : { drawing: post.choice, ...(post.show ? {} : { show: false }) }),
      });
      if (kept === "kept") {
        if (post !== undefined) {
          // The photos take the places of the post's order, as a run's.
          const { photos, order } = postPhotos(post);
          keepPhotos(who, workout.key, photos);
          if (order !== null) {
            keepOrder(who, workout.key, order);
          }
          saveVisibility(who, post.choice.visibility);
        }
        void send();
      }
      return kept;
    },
    [send],
  );

  return { save };
}
