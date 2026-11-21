import type { Comment, CommentReactionKind } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { commentProblem } from "../api/comments";
import { reactionNotSaved } from "../api/reactions";
import { useCommentsDoor } from "./commentsDoor";
import {
  withMoreReplies,
  withMyReaction,
  withoutComment,
  withReactions,
  withReply,
} from "./commentThreads";

/** The comments of one drawing as its card and its sheet show them. */
export type DrawingComments = {
  /** `off`: nobody signed in, or an API without comments: no button. */
  status: "loading" | "ready" | "failed" | "off";
  /** The comments, each with the replies shown under it (TASK-454). */
  comments: Comment[];
  /** How many the drawing has, replies too, also on pages not asked for yet. */
  total: number;
  /** True while there are older pages to ask for: «Show more». */
  more: boolean;
  /** Why the list did not come; null when it did. */
  problem: string | null;
  sending: boolean;
  /** Why the last comment did not go, or the last delete; null when it did. */
  sendProblem: string | null;
  reload: () => void;
  showMore: () => void;
  /**
   * `sent`: the field empties. `rejected`: a negative comment, which the
   * sheet says in an alert (ADR-0176); the words stay to be changed. With
   * `replyTo`, a comment or a reply, the words go under its comment.
   */
  send: (text: string, replyTo?: Comment) => Promise<Sent>;
  /** A comment takes its replies along; a reply goes alone. */
  remove: (commentId: string) => void;
  /** The app reaches the replies and the reactions (TASK-454 part C); a
   * comment offers them when the API sent its own too (`hasThreads`). */
  threads: boolean;
  /** The next replies of a comment: «View N more replies». */
  showReplies: (commentId: string) => void;
  /**
   * One's own reaction to a comment or a reply becomes `kind`, or goes when
   * it is `kind` already. Shown at once, and back as it was, with
   * `sendProblem`, if the API refuses.
   */
  react: (comment: Comment, kind: CommentReactionKind) => void;
};

/** What came of a comment written. */
export type Sent = "sent" | "rejected" | "failed";

type Shown = {
  status: DrawingComments["status"];
  comments: Comment[];
  total: number;
  next: string | null;
  problem: string | null;
};

const LOADING: Shown = {
  status: "loading",
  comments: [],
  total: 0,
  next: null,
  problem: null,
};

/** The comments of `drawingId`, the oldest first, a page at a time. */
export function useDrawingComments(drawingId: string): DrawingComments {
  const door = useCommentsDoor();
  // The answer for one drawing: another's is not this one's.
  const [answer, setAnswer] = useState<{ asked: string; shown: Shown } | null>(null);
  // «Try again», or a comment gone from another phone, asks once more.
  const [tries, setTries] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  // Where the replies of each comment go on, by comment: the `next` of the
  // last page asked for. A list asked again starts each from the beginning.
  const repliesNext = useRef(new Map<string, string | null>());
  // One reaction at a time: the next waits for the API's answer to this one.
  const reacting = useRef(false);

  useEffect(() => {
    let live = true;
    repliesNext.current = new Map();
    void door.pageOf(drawingId, null).then((outcome) => {
      if (!live) {
        return;
      }
      let shown: Shown;
      if (outcome === null) {
        shown = { ...LOADING, status: "off" };
      } else if (outcome.kind === "ok") {
        const { comments, next, total } = outcome.value;
        shown = { status: "ready", comments, next, total, problem: null };
      } else if (outcome.kind === "api_error" && outcome.code === "http_error") {
        // An API from before comments, or a drawing gone private: nothing to show.
        shown = { ...LOADING, status: "off" };
      } else {
        shown = { ...LOADING, status: "failed", problem: commentProblem(outcome) };
      }
      setAnswer({ asked: drawingId, shown });
    });
    return () => {
      live = false;
    };
  }, [door, drawingId, tries]);

  const shown = answer !== null && answer.asked === drawingId ? answer.shown : LOADING;

  /** `change` on what is shown, if it is still this drawing's list. */
  const update = useCallback(
    (asked: string, change: (was: Shown) => Shown) =>
      setAnswer((was) =>
        was === null || was.asked !== asked || was.shown.status !== "ready"
          ? was
          : { asked, shown: change(was.shown) },
      ),
    [],
  );

  const reload = useCallback(() => {
    setAnswer(null);
    setTries((n) => n + 1);
  }, []);

  const next = shown.status === "ready" ? shown.next : null;
  const showMore = useCallback(() => {
    if (next === null) {
      return;
    }
    const asked = drawingId;
    void door.pageOf(asked, next).then((outcome) => {
      if (outcome === null) {
        return;
      }
      if (outcome.kind !== "ok") {
        setSendProblem(commentProblem(outcome));
        return;
      }
      const page = outcome.value;
      update(asked, (was) => {
        // One written here meanwhile may come again in the page: once.
        const seen = new Set(was.comments.map((c) => c.id));
        return {
          ...was,
          comments: [...was.comments, ...page.comments.filter((c) => !seen.has(c.id))],
          next: page.next,
          total: page.total,
        };
      });
    });
  }, [door, drawingId, next, update]);

  const send = useCallback(
    async (text: string, replyTo?: Comment): Promise<Sent> => {
      const asked = drawingId;
      setSending(true);
      setSendProblem(null);
      const outcome =
        replyTo === undefined
          ? await door.write(asked, text)
          : await door.write(asked, text, replyTo.id);
      setSending(false);
      if (outcome === null) {
        return "failed";
      }
      if (outcome.kind === "api_error" && outcome.code === "comment_rejected") {
        return "rejected";
      }
      if (outcome.kind !== "ok") {
        setSendProblem(commentProblem(outcome));
        return "failed";
      }
      const added = outcome.value;
      update(asked, (was) => {
        // A reply goes under its comment, wherever that is in the list.
        const under = withReply(was.comments, added);
        if (under !== null) {
          return { ...was, comments: under, total: was.total + 1 };
        }
        // A comment is the newest: shown now only when the end is shown. A
        // reply whose comment is on a page not asked for comes with it.
        const atEnd = was.next === null && (added.parent_id ?? null) === null;
        return {
          ...was,
          comments: atEnd ? [...was.comments, added] : was.comments,
          total: was.total + 1,
        };
      });
      return "sent";
    },
    [door, drawingId, update],
  );

  const remove = useCallback(
    (commentId: string) => {
      const asked = drawingId;
      setSendProblem(null);
      void door.remove(commentId).then((outcome) => {
        if (outcome === null) {
          return;
        }
        if (outcome.kind === "ok") {
          update(asked, (was) => {
            const { comments, gone } = withoutComment(was.comments, commentId);
            // Its replies went with it, shown or not.
            return {
              ...was,
              comments,
              total: Math.max(0, was.total - Math.max(1, gone)),
            };
          });
        } else if (outcome.kind === "api_error" && outcome.code === "http_error") {
          // Already gone, or no longer ours to delete: the list as it is now.
          reload();
        } else {
          setSendProblem(commentProblem(outcome));
        }
      });
    },
    [door, drawingId, reload, update],
  );

  const { threads } = door;
  const showReplies = useCallback(
    (commentId: string) => {
      if (threads === undefined) {
        return;
      }
      const asked = drawingId;
      const cursors = repliesNext.current;
      void threads
        .repliesOf(commentId, cursors.get(commentId) ?? null)
        .then((outcome) => {
          if (outcome === null) {
            return;
          }
          if (outcome.kind !== "ok") {
            setSendProblem(commentProblem(outcome));
            return;
          }
          const page = outcome.value;
          cursors.set(commentId, page.next);
          update(asked, (was) => ({
            ...was,
            comments: withMoreReplies(
              was.comments,
              commentId,
              page.comments,
              page.total,
            ),
          }));
        });
    },
    [drawingId, threads, update],
  );

  const react = useCallback(
    (comment: Comment, kind: CommentReactionKind) => {
      const before = comment.reactions;
      if (threads === undefined || before === undefined || reacting.current) {
        return;
      }
      const asked = drawingId;
      // One's own again takes it away.
      const mine = before.mine === kind ? null : kind;
      const show = (reactions: typeof before) =>
        update(asked, (was) => ({
          ...was,
          comments: withReactions(was.comments, comment.id, reactions),
        }));
      reacting.current = true;
      setSendProblem(null);
      show(withMyReaction(before, mine));
      void threads.react(comment.id, mine).then((outcome) => {
        reacting.current = false;
        if (outcome !== null && outcome.kind === "ok") {
          // What the API counts is what stays.
          show(outcome.value);
        } else {
          show(before);
          setSendProblem(reactionNotSaved());
        }
      });
    },
    [drawingId, threads, update],
  );

  return {
    status: shown.status,
    comments: shown.comments,
    total: shown.total,
    more: shown.status === "ready" && shown.next !== null,
    problem: shown.problem,
    sending,
    sendProblem,
    reload,
    showMore,
    send,
    remove,
    threads: threads !== undefined,
    showReplies,
    react,
  };
}
