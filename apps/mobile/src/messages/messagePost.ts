import type {
  DrawingDetail,
  FeedPost,
  MessagePostCard,
  MessagePostRequest,
} from "@shaperoute/shared-types";

import { t, tLater } from "../i18n";
import { shapeName } from "../i18n/shapeNames";
import { distanceLabel } from "../units/format";

/** Said in place of the card of a post who reads may not open, or gone
 * (text approved on 2026-11-12). */
export const POST_GONE = tLater("This post is no longer available.");

/**
 * A post sent in a message (TASK-455, ADR-0382, the user's choices of
 * 2026-11-12): a pointer to a drawing somebody published, never a copy. The
 * message carries the drawing's id and nothing of it; whoever reads it is
 * shown its card only while they may open the post itself. So a post for
 * its owner's followers can be sent to anyone, and opens only for who
 * follows them.
 */
export type PostToSend = {
  /** The drawing's id. */
  id: string;
  author: { public_id: string; username: string };
  /** Every member sees it; false: only who follows its author. */
  everyone: boolean;
};

/** A post of the Feed or of a profile's list, to send. */
export function postOfFeed(
  post: Pick<FeedPost, "id" | "author" | "visibility">,
): PostToSend {
  return {
    id: post.id,
    author: post.author,
    // An API before TASK-208 has no visibility: its drawings are for all.
    everyone: post.visibility === undefined || post.visibility === "everyone",
  };
}

/** A drawing opened whole on the map, to send. */
export function postOfDrawing(
  drawing: Pick<DrawingDetail, "id" | "author" | "public">,
): PostToSend {
  return { id: drawing.id, author: drawing.author, everyone: drawing.public };
}

/** What POST /conversations/{public_id}/messages takes for it. */
export function postAttachment(post: PostToSend): MessagePostRequest {
  return { post_id: post.id };
}

/**
 * What the choice of the friend says before a post for its owner's
 * followers is sent (text approved on 2026-11-12); null for a post everyone
 * sees, and for one's own, which its followers are told nothing about.
 */
export function followersNote(post: PostToSend, me: string | null): string | null {
  if (post.everyone || post.author.public_id === me) {
    return null;
  }
  return t("Only people who follow {user} can open it.", {
    user: post.author.username,
  });
}

/** What the card calls the post: its owner's title, else what it draws;
 * empty for a run without a title, a shape or a word. */
export function postTitle(
  card: Pick<MessagePostCard, "title" | "shape" | "word" | "route_title">,
): string {
  if (card.title !== null && card.title !== "") {
    return card.title;
  }
  if (card.shape !== null) {
    return shapeName(card.shape);
  }
  return card.word ?? card.route_title ?? "";
}

/** «by ada · 4.0 km»: who published it and how long it is (the text «by
 * {user}» approved on 2026-11-12); a post without a line has no length. */
export function postByline(
  card: Pick<MessagePostCard, "author" | "distance_m" | "preview">,
): string {
  const by = t("by {user}", { user: card.author.username });
  return card.preview.length < 2 ? by : `${by} · ${distanceLabel(card.distance_m)}`;
}
