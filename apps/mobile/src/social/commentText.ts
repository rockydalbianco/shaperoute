import { dayLabel } from "../activities/activityText";

/**
 * The alert over a negative comment, which the API refuses (ADR-0176): the
 * user's words, «In questa app non puoi scrivere commenti negativi, cambia
 * app».
 */
export const NEGATIVE_COMMENT =
  "You can't write negative comments in this app. Try another app.";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * How long ago a comment was written: "just now", "5 min ago", "3 h ago",
 * "2 d ago"; after a week the day, "Fri 2 Oct 2026". A clock a little
 * behind the API's says "just now", never a time to come.
 */
export function agoLabel(createdAt: string, now: number = Date.now()): string {
  const when = Date.parse(createdAt);
  if (Number.isNaN(when)) {
    return "";
  }
  const ago = now - when;
  if (ago < MINUTE_MS) {
    return "just now";
  }
  if (ago < HOUR_MS) {
    return `${Math.floor(ago / MINUTE_MS)} min ago`;
  }
  if (ago < DAY_MS) {
    return `${Math.floor(ago / HOUR_MS)} h ago`;
  }
  if (ago < WEEK_MS) {
    return `${Math.floor(ago / DAY_MS)} d ago`;
  }
  return dayLabel(createdAt);
}

/** What the button under a drawing says: "Write a comment", "1 comment", "4 comments". */
export function commentsLabel(total: number): string {
  if (total === 0) {
    return "Write a comment";
  }
  return total === 1 ? "1 comment" : `${total} comments`;
}
