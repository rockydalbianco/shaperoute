import {
  COMMENT_MAX_LENGTH,
  COMMENT_REACTION_KINDS,
  type Comment,
  type CommentReactionKind,
  type CommentReactionRequest,
  type CommentReactions,
  type CommentRequest,
  type CommentsPage,
} from "@shaperoute/shared-types";

import { accountProblem, SESSION_ENDED } from "../account/messages";
import { t } from "../i18n";
import { negativeComment } from "../social/commentText";
import { type AccountOutcome, ask } from "./accounts";

/**
 * Comments (TASK-120): the calls of docs/API.md, «Comments», all with the
 * session token. Whoever sees a drawing reads its comments and writes one;
 * who wrote a comment, or owns the drawing, deletes it. The bodies are
 * packages/shared-types/fixtures/comment*.json.
 *
 * And what came with the replies (TASK-454 part C, ADR-0377): the comments
 * with their first replies, the other replies of one, a reply written, and
 * the five reactions to a comment.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** The comment as the API keeps it: without the spaces around. */
export function commentOf(text: string): string {
  return text.trim();
}

/** Why `text` cannot go, as the API would say it; null when it can. */
export function commentTextProblem(text: string): string | null {
  const kept = commentOf(text);
  if (kept === "") {
    return t("A comment needs some words.");
  }
  // Characters as the API counts them: an emoji is one, not two.
  if ([...kept].length > COMMENT_MAX_LENGTH) {
    return t("A comment is at most {max} characters.", { max: COMMENT_MAX_LENGTH });
  }
  return null;
}

function commentsPath(drawingId: string): string {
  return `/drawings/${encodeURIComponent(drawingId)}/comments`;
}

/**
 * GET /drawings/{id}/comments?threads=true: a page of the comments, the
 * oldest first, each with its first replies; the first page without a
 * `cursor`. An API from before the replies does not know `threads` and
 * answers the list it always did: comments without `replies`.
 */
export function fetchComments(
  baseUrl: string,
  token: string,
  drawingId: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<CommentsPage>> {
  const query = cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `${commentsPath(drawingId)}?threads=true${query}`,
    { method: "GET", token },
    isCommentsPage,
    options,
  );
}

/** GET /comments/{id}/replies: a page of the replies of a comment, the
 * oldest first; the first page, which starts with the ones that came with
 * the comment, without a `cursor`. */
export function fetchReplies(
  baseUrl: string,
  token: string,
  commentId: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<CommentsPage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `/comments/${encodeURIComponent(commentId)}/replies${query}`,
    { method: "GET", token },
    isCommentsPage,
    options,
  );
}

/**
 * POST /drawings/{id}/comments: the answer is the comment as kept. With
 * `replyTo`, the id of a comment of the drawing or of a reply, a reply under
 * that comment.
 */
export function postComment(
  baseUrl: string,
  token: string,
  drawingId: string,
  text: string,
  options: Options = {},
  replyTo: string | null = null,
): Promise<AccountOutcome<Comment>> {
  const body: CommentRequest = {
    text: commentOf(text),
    ...(replyTo === null ? {} : { reply_to: replyTo }),
  };
  return ask(
    baseUrl,
    commentsPath(drawingId),
    { method: "POST", body, token },
    isComment,
    options,
  );
}

/** DELETE /comments/{id}: `204`, without a body. */
export function deleteComment(
  baseUrl: string,
  token: string,
  commentId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    `/comments/${encodeURIComponent(commentId)}`,
    { method: "DELETE", token },
    isNoBody,
    options,
  );
}

function reactionPath(commentId: string): string {
  return `/comments/${encodeURIComponent(commentId)}/reaction`;
}

/** PUT /comments/{id}/reaction: one's own, in place of the one before; the
 * answer is the reactions of the comment as they are now. */
export function putCommentReaction(
  baseUrl: string,
  token: string,
  commentId: string,
  kind: CommentReactionKind,
  options: Options = {},
): Promise<AccountOutcome<CommentReactions>> {
  const body: CommentReactionRequest = { kind };
  return ask(
    baseUrl,
    reactionPath(commentId),
    { method: "PUT", body, token },
    isCommentReactions,
    options,
  );
}

/** DELETE /comments/{id}/reaction: one's own taken away; the answer as the PUT's. */
export function deleteCommentReaction(
  baseUrl: string,
  token: string,
  commentId: string,
  options: Options = {},
): Promise<AccountOutcome<CommentReactions>> {
  return ask(
    baseUrl,
    reactionPath(commentId),
    { method: "DELETE", token },
    isCommentReactions,
    options,
  );
}

/** Words for a comment call that did not go; null when it did. */
export function commentProblem(outcome: AccountOutcome<unknown>): string | null {
  if (outcome.kind === "ok") {
    return null;
  }
  if (outcome.kind === "unreachable") {
    return t("No connection. Try again when you are online.");
  }
  if (outcome.kind === "api_error") {
    switch (outcome.code) {
      case "session_expired":
      case "not_signed_in":
        return t(SESSION_ENDED);
      // The API's own words: a comment it refuses as written.
      case "invalid_request":
        return outcome.message;
      case "too_many_requests":
        return t("Too many comments in a minute. Wait a moment and try again.");
      // A negative one, which the sheet says in an alert (ADR-0176).
      case "comment_rejected":
        return negativeComment();
      // Made private, or deleted, since it opened; or an API without comments.
      case "http_error":
        return t("The comments of this drawing are not available.");
    }
  }
  return accountProblem(outcome);
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null;
}

function isNoBody(body: unknown, status: number): body is null {
  return status === 204 && body === null;
}

function isAuthor(body: unknown): boolean {
  return (
    isRecord(body) &&
    typeof body.public_id === "string" &&
    typeof body.username === "string"
  );
}

export function isCommentReactions(body: unknown): body is CommentReactions {
  if (!isRecord(body) || !isRecord(body.counts)) {
    return false;
  }
  const { counts, mine } = body;
  return (
    COMMENT_REACTION_KINDS.every((kind) => typeof counts[kind] === "number") &&
    typeof body.total === "number" &&
    (mine === null || (COMMENT_REACTION_KINDS as readonly unknown[]).includes(mine))
  );
}

/** A field an API from before the replies leaves out, or one that is `ok`. */
function missingOr(value: unknown, ok: (value: unknown) => boolean): boolean {
  return value === undefined || ok(value);
}

export function isComment(body: unknown): body is Comment {
  return (
    isRecord(body) &&
    typeof body.id === "string" &&
    isAuthor(body.author) &&
    typeof body.text === "string" &&
    typeof body.created_at === "string" &&
    typeof body.deletable === "boolean" &&
    // What came with the replies (TASK-454): there or not, never half made.
    missingOr(body.parent_id, (id) => id === null || typeof id === "string") &&
    missingOr(body.mention, (who) => who === null || isAuthor(who)) &&
    missingOr(body.reply_count, (count) => typeof count === "number") &&
    missingOr(
      body.replies,
      (replies) =>
        replies === null || (Array.isArray(replies) && replies.every(isComment)),
    ) &&
    missingOr(body.reactions, isCommentReactions)
  );
}

export function isCommentsPage(body: unknown): body is CommentsPage {
  return (
    isRecord(body) &&
    Array.isArray(body.comments) &&
    body.comments.every(isComment) &&
    (body.next === null || typeof body.next === "string") &&
    typeof body.total === "number"
  );
}
