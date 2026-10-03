import {
  COMMENT_MAX_LENGTH,
  type Comment,
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

/** GET /drawings/{id}/comments: a page, the oldest first; the first without a `cursor`. */
export function fetchComments(
  baseUrl: string,
  token: string,
  drawingId: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<CommentsPage>> {
  const query = cursor === null ? "" : `?cursor=${encodeURIComponent(cursor)}`;
  return ask(
    baseUrl,
    `${commentsPath(drawingId)}${query}`,
    { method: "GET", token },
    isCommentsPage,
    options,
  );
}

/** POST /drawings/{id}/comments: the answer is the comment as kept. */
export function postComment(
  baseUrl: string,
  token: string,
  drawingId: string,
  text: string,
  options: Options = {},
): Promise<AccountOutcome<Comment>> {
  const body: CommentRequest = { text: commentOf(text) };
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

export function isComment(body: unknown): body is Comment {
  return (
    isRecord(body) &&
    typeof body.id === "string" &&
    isRecord(body.author) &&
    typeof body.author.public_id === "string" &&
    typeof body.author.username === "string" &&
    typeof body.text === "string" &&
    typeof body.created_at === "string" &&
    typeof body.deletable === "boolean"
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
