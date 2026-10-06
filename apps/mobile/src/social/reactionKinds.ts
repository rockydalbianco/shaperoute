import {
  REACTION_KINDS,
  type ReactionKind,
  type ReactionsSummary,
} from "@shaperoute/shared-types";

import { t } from "../i18n";

/** A reaction that is an emoji: every one but the MuW heart, which is drawn. */
export type EmojiKind = Exclude<ReactionKind, "super_like">;

/** The API keeps codes (ADR-0193): the app draws them. */
export const REACTION_EMOJI: Readonly<Record<EmojiKind, string>> = {
  fire: "🔥",
  clap: "👏",
  strong: "💪",
  laugh: "😂",
  wow: "😮",
};

/** On the button of who left no reaction yet. */
export const NO_REACTION_FACE = "🙂";

/** How many of the most used show under a drawing. */
export const TOP_SHOWN = 3;

/** The name of a reaction, as VoiceOver says it. */
export function reactionName(kind: ReactionKind): string {
  switch (kind) {
    case "super_like":
      return t("MuW heart, super like");
    case "fire":
      return t("Fire");
    case "clap":
      return t("Clap");
    case "strong":
      return t("Strong");
    case "laugh":
      return t("Laugh");
    case "wow":
      return t("Wow");
  }
}

/**
 * The most used reactions of a drawing, the most used first; with as many
 * of two, the one that comes first in the bar. Never one nobody left.
 */
export function topKinds(
  counts: ReactionsSummary["counts"],
  shown: number = TOP_SHOWN,
): ReactionKind[] {
  return REACTION_KINDS.filter((kind) => counts[kind] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, shown);
}

/**
 * The reactions as they will be once who asks has `kind` in place of their
 * own (null: none): what shows while the API answers.
 */
export function withMine(
  summary: ReactionsSummary,
  kind: ReactionKind | null,
): ReactionsSummary {
  if (summary.mine === kind) {
    return summary;
  }
  const counts = { ...summary.counts };
  let { total } = summary;
  if (summary.mine !== null) {
    counts[summary.mine] = Math.max(0, counts[summary.mine] - 1);
    total = Math.max(0, total - 1);
  }
  if (kind !== null) {
    counts[kind] += 1;
    total += 1;
  }
  return { counts, total, mine: kind };
}
