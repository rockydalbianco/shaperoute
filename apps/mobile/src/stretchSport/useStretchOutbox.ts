import { useCallback, useEffect, useRef } from "react";

import { useActivitiesDoor } from "../activities/activitiesDoor";
import { saveStretchSession } from "../api/stretchSessions";
import { gymKey } from "../gym/gymKey";
import { useFollowsDoor } from "../social/followsDoor";
import type { StretchDone } from "../stretch/StretchScreen";
import {
  keepStretchWaiting,
  refuseStretchWaiting,
  type StretchKept,
  stretchRequest,
  stretchToSend,
  stopStretchWaiting,
} from "./stretchOutbox";

/** What saving a session did: kept to send, or nobody signed in, or
 * nothing to keep (no exercise held to its end). */
export type StretchSaved = StretchKept | "signed_out" | "nothing";

/**
 * A stretching session saved as it ends (TASK-475 part B, ADR-0386), as a
 * workout at the gym (gym/useGymOutbox.ts): first into its file on the
 * phone, then to the API, now or when there is a network; once the API has
 * it, «My activities» asks for its list again. A session the API will not
 * take (422, or 409 for a key of a run) stays on the phone and is not sent
 * again. `fetchFn` and `random` are for the tests.
 */
export function useStretchOutbox(
  fetchFn?: typeof fetch,
  random: () => number = Math.random,
): { save: (done: StretchDone) => StretchSaved } {
  const { apiUrl, account } = useFollowsDoor();
  const { owner, refresh } = useActivitiesDoor();
  const token =
    account.state.status === "signedIn" ? account.state.session.token : null;
  const sending = useRef(false);
  const latest = useRef({ apiUrl, token, owner, refresh, fetchFn, random });
  // The latest of each, for a send that waits on the network.
  useEffect(() => {
    latest.current = { apiUrl, token, owner, refresh, fetchFn, random };
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
      for (const waiting of stretchToSend(who)) {
        const outcome = await saveStretchSession(
          url,
          key,
          waiting.key,
          waiting.request,
          options,
        );
        if (outcome.kind === "ok") {
          stopStretchWaiting(who, waiting.key);
          sent = true;
        } else if (
          outcome.kind === "api_error" &&
          (outcome.code === "invalid_request" || outcome.code === "http_error")
        ) {
          refuseStretchWaiting(who, waiting.key, {
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
    (done: StretchDone): StretchSaved => {
      const who = latest.current.owner;
      if (who === null) {
        return "signed_out";
      }
      const request = stretchRequest(done);
      if (request === null) {
        return "nothing";
      }
      const kept = keepStretchWaiting({
        owner: who,
        key: gymKey(done.startedAt, latest.current.random),
        request,
      });
      if (kept === "kept") {
        void send();
      }
      return kept;
    },
    [send],
  );

  return { save };
}
