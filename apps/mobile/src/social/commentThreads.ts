import {
  COMMENT_REACTION_KINDS,
  type Comment,
  type CommentReactionKind,
  type CommentReactions,
} from "@shaperoute/shared-types";

/**
 * The comments of a drawing with their replies (TASK-454 part C, ADR-0377),
 * as the list the sheet shows: a comment, and under it its replies, one
 * level deep, the oldest first. Nothing here asks the API or draws: what the
 * list becomes when a reply is written, more replies come, a comment goes or
 * a reaction changes.
 */

/** No reaction of any kind: a comment nobody reacted to. */
export const NO_COMMENT_REACTIONS: CommentReactions = {
  counts: { fire: 0, clap: 0, strong: 0, laugh: 0, wow: 0 },
  total: 0,
  mine: null,
};

/**
 * The comment came from an API with the replies: «Reply» and the reactions
 * are offered on it. An API from before sends neither field.
 */
export function hasThreads(comment: Comment): boolean {
  return comment.reactions !== undefined;
}

/** The replies of a comment that are in the list now. */
export function shownReplies(comment: Comment): Comment[] {
  return comment.replies ?? [];
}

/** How many replies the comment has, shown or not. */
export function replyCount(comment: Comment): number {
  return Math.max(comment.reply_count ?? 0, shownReplies(comment).length);
}

/** How many replies of the comment are still to ask for. */
export function hiddenReplies(comment: Comment): number {
  return replyCount(comment) - shownReplies(comment).length;
}

/** The oldest first; at the same instant, by id, as the API orders them. */
function byTime(a: Comment, b: Comment): number {
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** `more` among `replies`, each once, the oldest first. */
function merged(replies: Comment[], more: Comment[]): Comment[] {
  const seen = new Set(replies.map((reply) => reply.id));
  return [...replies, ...more.filter((reply) => !seen.has(reply.id))].sort(byTime);
}

/**
 * The comment `id`, or the reply, wherever it is in the list; null when it
 * is not there (deleted meanwhile, or on a page not asked for).
 */
export function findComment(comments: Comment[], id: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    const reply = shownReplies(comment).find((one) => one.id === id);
    if (reply !== undefined) {
      return reply;
    }
  }
  return null;
}

/**
 * The list with `reply`, just written, under its comment: shown at once,
 * also when older replies are still to ask for (they come before it). Null
 * when its comment is not in the list: the caller asks the page again.
 */
export function withReply(comments: Comment[], reply: Comment): Comment[] | null {
  const parent = reply.parent_id ?? null;
  if (parent === null || !comments.some((comment) => comment.id === parent)) {
    return null;
  }
  return comments.map((comment) =>
    comment.id !== parent
      ? comment
      : {
          ...comment,
          reply_count: replyCount(comment) + 1,
          replies: merged(shownReplies(comment), [reply]),
        },
  );
}

/**
 * The list with a page of the replies of `commentId` among the ones shown.
 * `total` is how many the API counts now: somebody may have written, or
 * deleted, one meanwhile.
 */
export function withMoreReplies(
  comments: Comment[],
  commentId: string,
  page: Comment[],
  total: number,
): Comment[] {
  return comments.map((comment) => {
    if (comment.id !== commentId) {
      return comment;
    }
    const replies = merged(shownReplies(comment), page);
    return { ...comment, replies, reply_count: Math.max(total, replies.length) };
  });
}

/**
 * The list without the comment `id`, and how many comments went with it: a
 * comment takes its replies along (the API deletes them too), a reply goes
 * alone. Zero when it was not in the list.
 */
export function withoutComment(
  comments: Comment[],
  id: string,
): { comments: Comment[]; gone: number } {
  const top = comments.find((comment) => comment.id === id);
  if (top !== undefined) {
    return {
      comments: comments.filter((comment) => comment.id !== id),
      gone: 1 + replyCount(top),
    };
  }
  let gone = 0;
  const left = comments.map((comment) => {
    const replies = shownReplies(comment);
    if (!replies.some((reply) => reply.id === id)) {
      return comment;
    }
    gone = 1;
    return {
      ...comment,
      reply_count: Math.max(0, replyCount(comment) - 1),
      replies: replies.filter((reply) => reply.id !== id),
    };
  });
  return { comments: left, gone };
}

/** The list with `reactions` on the comment, or the reply, `id`. */
export function withReactions(
  comments: Comment[],
  id: string,
  reactions: CommentReactions,
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === id) {
      return { ...comment, reactions };
    }
    const replies = shownReplies(comment);
    if (!replies.some((reply) => reply.id === id)) {
      return comment;
    }
    return {
      ...comment,
      replies: replies.map((reply) =>
        reply.id === id ? { ...reply, reactions } : reply,
      ),
    };
  });
}

/**
 * The reactions as they will be once who asks has `kind` in place of their
 * own (null: none): what shows while the API answers.
 */
export function withMyReaction(
  reactions: CommentReactions,
  kind: CommentReactionKind | null,
): CommentReactions {
  if (reactions.mine === kind) {
    return reactions;
  }
  const counts = { ...reactions.counts };
  let { total } = reactions;
  if (reactions.mine !== null) {
    counts[reactions.mine] = Math.max(0, counts[reactions.mine] - 1);
    total = Math.max(0, total - 1);
  }
  if (kind !== null) {
    counts[kind] += 1;
    total += 1;
  }
  return { counts, total, mine: kind };
}

/**
 * The most used reactions of a comment, the most used first; with as many
 * of two, the one that comes first among the five. Never one nobody left.
 */
export function topCommentKinds(
  counts: CommentReactions["counts"],
  shown: number,
): CommentReactionKind[] {
  return COMMENT_REACTION_KINDS.filter((kind) => counts[kind] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, shown);
}
