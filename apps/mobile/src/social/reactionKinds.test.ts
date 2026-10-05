import reactions from "@shaperoute/shared-types/fixtures/reactions.json";
import {
  REACTION_KINDS,
  type ReactionKind,
  type ReactionsSummary,
} from "@shaperoute/shared-types";

import { REACTION_EMOJI, reactionName, topKinds, withMine } from "./reactionKinds";

const SUMMARY = reactions as ReactionsSummary;
const NONE: ReactionsSummary = {
  counts: { super_like: 0, fire: 0, clap: 0, strong: 0, laugh: 0, wow: 0 },
  total: 0,
  mine: null,
};

test("every reaction has a name, and every one but the heart an emoji", () => {
  const names = REACTION_KINDS.map(reactionName);
  expect(names).toEqual([
    "Sgrava heart, super like",
    "Fire",
    "Clap",
    "Strong",
    "Laugh",
    "Wow",
  ]);
  expect(Object.keys(REACTION_EMOJI)).toEqual(REACTION_KINDS.slice(1));
  expect(Object.values(REACTION_EMOJI)).toEqual(["🔥", "👏", "💪", "😂", "😮"]);
});

test("the three most used, the most used first, never one nobody left", () => {
  // fire 3, super_like 2, clap 1, wow 1: of two as used, the bar's first.
  expect(topKinds(SUMMARY.counts)).toEqual(["fire", "super_like", "clap"]);
  expect(topKinds({ ...NONE.counts, wow: 2 })).toEqual(["wow"]);
  expect(topKinds(NONE.counts)).toEqual([]);
  expect(topKinds(SUMMARY.counts, 1)).toEqual(["fire"]);
});

test("one's own reaction counts once: left, changed, taken away", () => {
  const first = withMine(NONE, "clap");
  expect(first).toEqual({
    counts: { ...NONE.counts, clap: 1 },
    total: 1,
    mine: "clap",
  });
  const changed = withMine(first, "wow");
  expect(changed).toEqual({
    counts: { ...NONE.counts, wow: 1 },
    total: 1,
    mine: "wow",
  });
  expect(withMine(changed, null)).toEqual(NONE);
  // The same again changes nothing, and nothing is changed in place.
  expect(withMine(first, "clap")).toBe(first);
  expect(NONE.counts.clap).toBe(0);
});

test("among the others' reactions, only one's own moves", () => {
  // mine: fire, of 3.
  const moved = withMine(SUMMARY, "strong");
  expect(moved.counts).toEqual({ ...SUMMARY.counts, fire: 2, strong: 1 });
  expect(moved.total).toBe(SUMMARY.total);
  const kinds: ReactionKind[] = [...REACTION_KINDS];
  expect(kinds.reduce((sum, kind) => sum + moved.counts[kind], 0)).toBe(moved.total);
});
