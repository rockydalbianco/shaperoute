import type {
  Message,
  MessageAttachment,
  MessageAttachmentWithLive,
} from "@shaperoute/shared-types";

import { favoriteTitle } from "../favorites/favoriteRoute";
import { t } from "../i18n";
import { distanceLabel } from "../units/format";
import { liveCardLine } from "./LiveMessageCard";
import { POST_GONE, postByline, postTitle } from "./messagePost";

/**
 * What a message carries, in words (TASK-333, texts approved by the user on
 * 2026-10-29): the line of the list, and what VoiceOver says of it.
 */

const SIGN: Record<MessageAttachment["kind"], string> = {
  photo: "📷",
  video: "🎬",
  drawing: "🗺️",
  post: "🗺️",
};

/** «📷 Photo», «🎬 Video», «🗺️ Drawing», «🗺️ Post». */
export function attachmentLine(kind: MessageAttachment["kind"]): string {
  switch (kind) {
    case "photo":
      return t("📷 Photo");
    case "video":
      return t("🎬 Video");
    case "drawing":
      return t("🗺️ Drawing");
    case "post":
      return t("🗺️ Post");
  }
}

/** A message on one line, as the list shows it: its text, after what it
 * carries («📷 The river»), or what it carries alone. */
export function messageLine(message: Message): string {
  const text = message.text.split("\n").join(" ").trim();
  const kind = message.attachment?.kind;
  if (kind === undefined) {
    return text;
  }
  // A live share (TASK-468 part B1): «🔴 Live», or the sign before the text.
  if ((kind as string) === "live") {
    return text === "" ? t("🔴 Live") : `🔴 ${text}`;
  }
  return text === "" ? attachmentLine(kind) : `${SIGN[kind]} ${text}`;
}

/** «0:24»: a video's length. */
export function duration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** What VoiceOver says of an attachment. */
export function attachmentLabel(attachment: MessageAttachment): string {
  const withLive = attachment as MessageAttachmentWithLive;
  if (withLive.kind === "live") {
    return liveCardLine(withLive.live ?? null);
  }
  switch (attachment.kind) {
    case "photo":
      return t("Photo");
    case "video":
      return attachment.expired
        ? t("This video has expired.")
        : t("Video, {duration}", {
            duration: duration(attachment.duration_ms ?? 0),
          });
    case "drawing": {
      const card = attachment.drawing;
      return t("Drawing: {title}, {distance}", {
        title: card === null ? "" : favoriteTitle(card),
        distance: distanceLabel(card?.route_m ?? 0),
      });
    }
    case "post": {
      // Its title, who published it and how long it is; or that it is gone.
      const card = attachment.post ?? null;
      return card === null
        ? t(POST_GONE)
        : [postTitle(card), postByline(card)].filter((part) => part !== "").join(", ");
    }
  }
}
