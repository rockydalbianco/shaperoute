import type { Comment, CommentsPage } from "@shaperoute/shared-types";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

import { sessionEnded } from "../account/messages";
import type { Account } from "../account/useAccount";
import type { AccountOutcome } from "../api/accounts";
import { deleteComment, fetchComments, postComment } from "../api/comments";
import { fetchProfile, profilePhotoUri } from "../api/profiles";

/**
 * The comments under the drawings as the whole app reaches them (TASK-120):
 * a page of a drawing's comments, a comment written, one deleted, and the
 * picture of who wrote it. Every call is null with nobody signed in.
 */
export type CommentsDoor = {
  pageOf: (
    drawingId: string,
    cursor: string | null,
  ) => Promise<AccountOutcome<CommentsPage> | null>;
  write: (drawingId: string, text: string) => Promise<AccountOutcome<Comment> | null>;
  remove: (commentId: string) => Promise<AccountOutcome<null> | null>;
  /** The picture of a profile, asked once per account; null without one. */
  photoOf: (publicId: string) => Promise<string | null>;
};

const NOTHING: CommentsDoor = {
  pageOf: async () => null,
  write: async () => null,
  remove: async () => null,
  photoOf: async () => null,
};

/** Without «Profile» around it (a test of one screen): no comments. */
export const CommentsContext = createContext<CommentsDoor>(NOTHING);

export function useCommentsDoor(): CommentsDoor {
  return useContext(CommentsContext);
}

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The comments in the name of the account, for «Profile» to hand to the app. */
export function useCommentsOf(
  baseUrl: string | null,
  account: Account,
  options: Options = {},
): CommentsDoor {
  const { state, sessionEnded: endSession } = account;
  const token = state.status === "signedIn" ? state.session.token : null;
  const { fetchFn, key } = options;
  // The pictures asked for, by profile: one request each while the app is
  // open. Another token, another list.
  const photos = useRef<{
    token: string | null;
    of: Map<string, Promise<string | null>>;
  }>({ token: null, of: new Map() });

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

  const pageOf = useCallback(
    async (drawingId: string, cursor: string | null) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await fetchComments(baseUrl, token, drawingId, cursor, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  const write = useCallback(
    async (drawingId: string, text: string) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await postComment(baseUrl, token, drawingId, text, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  const remove = useCallback(
    async (commentId: string) => {
      if (token === null || baseUrl === null) {
        return null;
      }
      const outcome = await deleteComment(baseUrl, token, commentId, {
        fetchFn,
        key,
      });
      return checked(token, outcome);
    },
    [baseUrl, checked, fetchFn, key, token],
  );

  const photoOf = useCallback(
    (publicId: string): Promise<string | null> => {
      if (token === null || baseUrl === null) {
        return Promise.resolve(null);
      }
      if (photos.current.token !== token) {
        photos.current = { token, of: new Map() };
      }
      const known = photos.current.of.get(publicId);
      if (known !== undefined) {
        return known;
      }
      // No picture, or none to be had now: the letter, until the app opens again.
      const asked = fetchProfile(baseUrl, token, publicId, { fetchFn, key }).then(
        (outcome) => (outcome.kind === "ok" ? profilePhotoUri(outcome.value) : null),
      );
      photos.current.of.set(publicId, asked);
      return asked;
    },
    [baseUrl, fetchFn, key, token],
  );

  return useMemo(
    () => ({ pageOf, write, remove, photoOf }),
    [pageOf, write, remove, photoOf],
  );
}
