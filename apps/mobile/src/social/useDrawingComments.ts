import type { Comment } from "@shaperoute/shared-types";
import { useCallback, useEffect, useState } from "react";

import { commentProblem } from "../api/comments";
import { useCommentsDoor } from "./commentsDoor";

/** The comments of one drawing as its card and its sheet show them. */
export type DrawingComments = {
  /** `off`: nobody signed in, or an API without comments: no button. */
  status: "loading" | "ready" | "failed" | "off";
  comments: Comment[];
  /** How many the drawing has, also those of pages not asked for yet. */
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
   * sheet says in an alert (ADR-0176); the words stay to be changed.
   */
  send: (text: string) => Promise<Sent>;
  remove: (commentId: string) => void;
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

  useEffect(() => {
    let live = true;
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
    async (text: string): Promise<Sent> => {
      const asked = drawingId;
      setSending(true);
      setSendProblem(null);
      const outcome = await door.write(asked, text);
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
      // The newest goes at the end: shown now only when the end is shown.
      update(asked, (was) => ({
        ...was,
        comments: was.next === null ? [...was.comments, added] : was.comments,
        total: was.total + 1,
      }));
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
          update(asked, (was) => ({
            ...was,
            comments: was.comments.filter((c) => c.id !== commentId),
            total: Math.max(0, was.total - 1),
          }));
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
  };
}
