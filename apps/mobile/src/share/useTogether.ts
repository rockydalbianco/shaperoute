import type { TogetherPage } from "@shaperoute/shared-types";
import { useEffect, useState } from "react";

import { sessionEnded } from "../account/messages";
import { fetchTogether, hasCompany } from "../api/together";
import { useFollowsDoor } from "../social/followsDoor";
import type { TogetherState } from "./TogetherRow";

/** The post's «Together», as «Edit video» shows it, and the page itself. */
export type Together = { state: TogetherState; page: TogetherPage | null };

const NONE: Together = { state: { kind: "none" }, page: null };

/**
 * The tracks of the people tagged who ran with the author (TASK-417 part
 * D), asked once for a post of the Feed (`drawingId`): only its author
 * receives them. Nothing for a run that is not a post, for somebody else's
 * post, from an API of before or without a connection.
 */
export function useTogether(
  drawingId: string | null,
  options: { fetchFn?: typeof fetch; key?: string | null } = {},
): Together {
  const { apiUrl, account } = useFollowsDoor();
  const { state } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const [answer, setAnswer] = useState<{ asked: string; together: Together } | null>(
    null,
  );
  const { fetchFn, key } = options;

  useEffect(() => {
    if (drawingId === null || apiUrl === null || token === null) {
      return;
    }
    let live = true;
    void fetchTogether(apiUrl, token, drawingId, { fetchFn, key }).then((outcome) => {
      if (!live) {
        return;
      }
      if (outcome.kind === "ok") {
        const page = outcome.value;
        setAnswer({
          asked: drawingId,
          together: hasCompany(page)
            ? { state: { kind: "ready", people: page.people.length }, page }
            : { state: { kind: "alone" }, page: null },
        });
        return;
      }
      if (sessionEnded(outcome)) {
        account.sessionEnded(token);
      }
      setAnswer({ asked: drawingId, together: NONE });
    });
    return () => {
      live = false;
    };
  }, [account, apiUrl, drawingId, fetchFn, key, token]);

  return answer !== null && answer.asked === drawingId ? answer.together : NONE;
}
