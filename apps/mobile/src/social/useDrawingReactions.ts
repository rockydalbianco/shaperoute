import type { ReactionKind, ReactionsSummary } from "@shaperoute/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import { commentProblem } from "../api/comments";
import { reactionNotSaved } from "../api/reactions";
import { type EmojiKind, withMine } from "./reactionKinds";
import { useReactionsDoor } from "./reactionsDoor";

/** The reactions of one drawing as its card shows them. */
export type DrawingReactions = {
  /** `off`: nobody signed in, or an API without reactions: nothing shows. */
  status: "loading" | "ready" | "off";
  counts: ReactionsSummary["counts"];
  total: number;
  /** The reaction of who looks; null without one. */
  mine: ReactionKind | null;
  /** Why the last reaction came back as it was; null when it stayed. */
  problem: string | null;
  /**
   * Leaves an emoji in place of one's own, or takes it away when it is
   * one's own already. Shown at once, and back as it was if the API
   * refuses.
   */
  choose: (kind: EmojiKind) => void;
  /** Takes one's own away, whichever it is. */
  remove: () => void;
  /** True while a super like and its comment are on their way. */
  sending: boolean;
  /** Why the last super like did not go; null when it did. */
  sendProblem: string | null;
  /**
   * The super like with its comment. Never shown before the API keeps it:
   * the comment can be refused. `rejected`: a negative comment, which the
   * sheet says in an alert (ADR-0176).
   */
  superLike: (comment: string) => Promise<SuperLiked>;
  /** Forgets why the last super like did not go: the sheet opens clean. */
  forgetSendProblem: () => void;
};

/** What came of a super like. */
export type SuperLiked = "sent" | "rejected" | "failed";

const NO_COUNTS: ReactionsSummary["counts"] = {
  super_like: 0,
  fire: 0,
  clap: 0,
  strong: 0,
  laugh: 0,
  wow: 0,
};

type Shown = { status: DrawingReactions["status"]; summary: ReactionsSummary };

const LOADING: Shown = {
  status: "loading",
  summary: { counts: NO_COUNTS, total: 0, mine: null },
};

/** The reactions of `drawingId`, and the ways to leave one. */
export function useDrawingReactions(drawingId: string): DrawingReactions {
  const door = useReactionsDoor();
  // The answer for one drawing: another's is not this one's.
  const [answer, setAnswer] = useState<{ asked: string; shown: Shown } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendProblem, setSendProblem] = useState<string | null>(null);
  // One change at a time: the next waits for the API's answer to this one.
  const changing = useRef(false);

  useEffect(() => {
    let live = true;
    void door.of(drawingId).then((outcome) => {
      if (!live) {
        return;
      }
      // Nobody signed in, an API from before reactions, a drawing gone
      // private, no connection: nothing to show.
      const shown: Shown =
        outcome !== null && outcome.kind === "ok"
          ? { status: "ready", summary: outcome.value }
          : { ...LOADING, status: "off" };
      setAnswer({ asked: drawingId, shown });
    });
    return () => {
      live = false;
    };
  }, [door, drawingId]);

  const shown = answer !== null && answer.asked === drawingId ? answer.shown : LOADING;
  const ready = shown.status === "ready";
  const { summary } = shown;

  /** `next` in place of what is shown, if it is still this drawing's. */
  const show = useCallback(
    (asked: string, next: ReactionsSummary) =>
      setAnswer((was) =>
        was === null || was.asked !== asked || was.shown.status !== "ready"
          ? was
          : { asked, shown: { status: "ready", summary: next } },
      ),
    [],
  );

  /** One's own becomes `kind` (null: none), at once; back if the API refuses. */
  const change = useCallback(
    (kind: EmojiKind | null) => {
      if (!ready || changing.current || summary.mine === kind) {
        return;
      }
      const asked = drawingId;
      const before = summary;
      changing.current = true;
      setProblem(null);
      show(asked, withMine(before, kind));
      const answered =
        kind === null
          ? door.remove(asked)
          : door.leave(asked, kind, null).then((outcome) =>
              // Only the reactions of the answer: an emoji has no comment.
              outcome !== null && outcome.kind === "ok"
                ? { kind: "ok" as const, value: outcome.value.reactions }
                : outcome,
            );
      void answered.then((outcome) => {
        changing.current = false;
        if (outcome !== null && outcome.kind === "ok") {
          show(asked, outcome.value);
        } else {
          show(asked, before);
          setProblem(reactionNotSaved());
        }
      });
    },
    [door, drawingId, ready, show, summary],
  );

  const mine = summary.mine;
  const choose = useCallback(
    // One's own again takes it away.
    (kind: EmojiKind) => change(mine === kind ? null : kind),
    [change, mine],
  );
  const remove = useCallback(() => change(null), [change]);

  const superLike = useCallback(
    async (comment: string): Promise<SuperLiked> => {
      if (!ready || changing.current) {
        return "failed";
      }
      const asked = drawingId;
      changing.current = true;
      setSending(true);
      setSendProblem(null);
      setProblem(null);
      const outcome = await door.leave(asked, "super_like", comment);
      changing.current = false;
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
      show(asked, outcome.value.reactions);
      return "sent";
    },
    [door, drawingId, ready, show],
  );

  const forgetSendProblem = useCallback(() => setSendProblem(null), []);

  return {
    status: shown.status,
    counts: summary.counts,
    total: summary.total,
    mine,
    problem,
    choose,
    remove,
    sending,
    sendProblem,
    superLike,
    forgetSendProblem,
  };
}
