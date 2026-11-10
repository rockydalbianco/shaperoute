import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import catalog from "../fixtures/game-catalog.json" with { type: "json" };
import challenge from "../fixtures/game-challenge.json" with { type: "json" };
import team from "../fixtures/game-team.json" with { type: "json" };
import {
  CHALLENGE_DAYS_DEFAULT,
  CHALLENGE_DAYS_MAX,
  CHALLENGE_DAYS_MIN,
  CHALLENGE_PIECES_MAX,
  CHALLENGE_PIECES_MIN,
  type ChallengeRequest,
  type ChallengeStatus,
  type GameChallenge,
  type GameTeam,
} from "../src/index.ts";

// The teams and the challenges of the shape game (TASK-296 part C, ADR-0255):
// the examples the app's tests read, shaped as game_teams.py and
// game_challenges.py answer.
const STATUSES: readonly ChallengeStatus[] = ["active", "completed", "expired"];

const going: GameChallenge = {
  ...challenge,
  status: challenge.status as ChallengeStatus,
  pieces: challenge.pieces.map((piece) => ({
    ...piece,
    goal: {
      kind: "distance",
      total_m: piece.goal.total_m,
      distance_m: null,
      pace_s: null,
    },
    outline: piece.outline.map(([x, y]) => [x, y] as [number, number]),
  })),
};
const mine: GameTeam = { ...team, challenge: null };

test("the limits of a challenge are the API's, number for number", () => {
  // game_challenges.py checks them; the form of the app keeps inside them.
  const api = readFileSync(
    new URL("../../../services/api/shaperoute_api/game_challenges.py", import.meta.url),
    "utf8",
  );
  const pieces = /^MIN_PIECES, MAX_PIECES = (\d+), (\d+)$/m.exec(api);
  const days = /^MIN_DAYS, MAX_DAYS, DEFAULT_DAYS = (\d+), (\d+), (\d+)$/m.exec(api);
  assert.ok(pieces !== null && days !== null);
  assert.deepEqual(pieces.slice(1).map(Number), [
    CHALLENGE_PIECES_MIN,
    CHALLENGE_PIECES_MAX,
  ]);
  assert.deepEqual(days.slice(1).map(Number), [
    CHALLENGE_DAYS_MIN,
    CHALLENGE_DAYS_MAX,
    CHALLENGE_DAYS_DEFAULT,
  ]);
  // TASK-423 part C: up to 20 pieces and 30 days.
  assert.equal(CHALLENGE_PIECES_MAX, 20);
  assert.equal(CHALLENGE_DAYS_MAX, 30);
});

test("the team has a code of six and its members in order, the owner among them", () => {
  assert.match(mine.code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(mine.members.some((member) => member.public_id === mine.owner));
  assert.ok(mine.members.length >= 1);
});

test("the challenge is a shape of the catalog cut into equal pieces that join", () => {
  assert.ok(catalog.shapes.some((shape) => shape.id === going.shape_id));
  assert.ok(STATUSES.includes(going.status));
  const n = going.pieces.length;
  assert.ok(n >= CHALLENGE_PIECES_MIN && n <= CHALLENGE_PIECES_MAX);
  going.pieces.forEach((piece, idx) => {
    assert.equal(piece.idx, idx);
    assert.ok(piece.outline.length >= 2);
    assert.equal(piece.done, piece.done_m >= (piece.goal.total_m ?? 0));
  });
  for (let i = 1; i < n; i += 1) {
    assert.deepEqual(going.pieces[i].outline[0], going.pieces[i - 1].outline.at(-1));
  }
  assert.deepEqual(going.pieces[n - 1].outline.at(-1), going.pieces[0].outline[0]);
});

test("the contributions name holders of the pieces, by piece", () => {
  for (const gave of going.contributions) {
    const piece = going.pieces[gave.idx];
    assert.ok(piece !== undefined);
    assert.ok(gave.metres > 0 && gave.metres <= piece.done_m);
  }
});

test("a request asks one kind of piece for every piece", () => {
  const distance: ChallengeRequest = {
    shape_id: "hexagon",
    pieces: 3,
    piece: { kind: "distance", total_m: 5000 },
  };
  const fast: ChallengeRequest = {
    shape_id: "lightning",
    pieces: 2,
    piece: { kind: "pace", distance_m: 1000, pace_s: 300 },
    days: 3,
  };
  assert.equal(distance.days, undefined);
  assert.equal(fast.piece.kind, "pace");
});
