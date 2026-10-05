import {
  REACTION_KINDS,
  type ReactionKind,
  type ReactionRequest,
  type ReactionResult,
  type ReactionsSummary,
  SUPER_LIKE_MIN_COMMENT,
} from "@shaperoute/shared-types";

import { t } from "../i18n";
import { type AccountOutcome, ask } from "./accounts";
import { commentOf, commentTextProblem, isComment } from "./comments";

/**
 * Reactions (TASK-119, ADR-0193): the calls of docs/API.md, «Reactions»,
 * all with the session token. Whoever sees a drawing leaves one reaction
 * under it; the Sgrava heart, the super like, goes with a comment. The
 * bodies are packages/shared-types/fixtures/reaction*.json.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function reactionsPath(drawingId: string, one: boolean): string {
  return `/drawings/${encodeURIComponent(drawingId)}/${one ? "reaction" : "reactions"}`;
}

/** Why `text` cannot go with a super like, as the API would say it; null when it can. */
export function superLikeTextProblem(text: string): string | null {
  // Characters as the API counts them: an emoji is one, not two.
  if ([...commentOf(text)].length < SUPER_LIKE_MIN_COMMENT) {
    return t("At least 2 characters");
  }
  return commentTextProblem(text);
}

/** GET /drawings/{id}/reactions: how many of each kind, and one's own. */
export function fetchReactions(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<ReactionsSummary>> {
  return ask(
    baseUrl,
    reactionsPath(drawingId, false),
    { method: "GET", token },
    isReactionsSummary,
    options,
  );
}

/**
 * PUT /drawings/{id}/reaction: leaves `kind`, in place of one's own. A
 * super like goes with its `comment`, kept together or not at all.
 */
export function putReaction(
  baseUrl: string,
  token: string,
  drawingId: string,
  kind: ReactionKind,
  comment: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<ReactionResult>> {
  const body: ReactionRequest =
    comment === null ? { kind } : { kind, comment: commentOf(comment) };
  return ask(
    baseUrl,
    reactionsPath(drawingId, true),
    { method: "PUT", body, token },
    isReactionResult,
    options,
  );
}

/** DELETE /drawings/{id}/reaction: takes one's own away; the answer is what is left. */
export function deleteReaction(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<ReactionsSummary>> {
  return ask(
    baseUrl,
    reactionsPath(drawingId, true),
    { method: "DELETE", token },
    isReactionsSummary,
    options,
  );
}

/** The notice under the reactions when one did not go, and came back as it was. */
export function reactionNotSaved(): string {
  return t("Your reaction wasn't saved. Check the connection.");
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null;
}

function isKind(value: unknown): value is ReactionKind {
  return REACTION_KINDS.some((kind) => kind === value);
}

export function isReactionsSummary(body: unknown): body is ReactionsSummary {
  if (!isRecord(body) || !isRecord(body.counts)) {
    return false;
  }
  const { counts } = body;
  return (
    REACTION_KINDS.every((kind) => typeof counts[kind] === "number") &&
    typeof body.total === "number" &&
    (body.mine === null || isKind(body.mine))
  );
}

export function isReactionResult(body: unknown): body is ReactionResult {
  return (
    isRecord(body) &&
    isReactionsSummary(body.reactions) &&
    (body.comment === null || isComment(body.comment))
  );
}
