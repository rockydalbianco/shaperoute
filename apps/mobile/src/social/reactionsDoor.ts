import type {
  ReactionKind,
  ReactionResult,
  ReactionsSummary,
} from "@shaperoute/shared-types";
import { createContext, useCallback, useContext, useMemo } from "react";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import { deleteReaction, fetchReactions, putReaction } from "../api/reactions";

/**
 * The reactions under the drawings as the whole app reaches them
 * (TASK-119): those of a drawing, one left, one's own taken away. Every
 * call is null with nobody signed in.
 */
export type ReactionsDoor = {
  of: (drawingId: string) => Promise<AccountOutcome<ReactionsSummary> | null>;
  /** With `comment` only for the super like, which needs it. */
  leave: (
    drawingId: string,
    kind: ReactionKind,
    comment: string | null,
  ) => Promise<AccountOutcome<ReactionResult> | null>;
  remove: (drawingId: string) => Promise<AccountOutcome<ReactionsSummary> | null>;
};

const NOTHING: ReactionsDoor = {
  of: async () => null,
  leave: async () => null,
  remove: async () => null,
};

/** Without «Profile» around it (a test of one screen): no reactions. */
export const ReactionsContext = createContext<ReactionsDoor>(NOTHING);

export function useReactionsDoor(): ReactionsDoor {
  return useContext(ReactionsContext);
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The reactions in the name of the account, for «Profile» to hand to the app. */
export function useReactionsOf(
  baseUrl: string | null,
  account: Account,
  options: Options = {},
): ReactionsDoor {
  const { state, sessionEnded: endSession } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const { fetchFn, key } = options;

  /** Ends the session the API says is over. */
  const checked = useCallback(
    <T>(asking: string, outcome: AccountOutcome<T>): AccountOutcome<T> => {
      if (sessionEnded(outcome)) {
        endSession(asking);
      }
      return outcome;
    },
    [endSession],
  );

  const of = useCallback(
    async (drawingId: string) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await fetchReactions(baseUrl, token, drawingId, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  const leave = useCallback(
    async (drawingId: string, kind: ReactionKind, comment: string | null) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await putReaction(baseUrl, token, drawingId, kind, comment, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  const remove = useCallback(
    async (drawingId: string) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await deleteReaction(baseUrl, token, drawingId, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  return useMemo(() => ({ of, leave, remove }), [of, leave, remove]);
}
