import assert from "node:assert/strict";
import { test } from "node:test";

import catalog from "../fixtures/game-catalog.json" with { type: "json" };
import me from "../fixtures/game-me.json" with { type: "json" };
import personalFixture from "../fixtures/game-personal.json" with { type: "json" };
import prizesFixture from "../fixtures/game-prizes.json" with { type: "json" };
import run from "../fixtures/game-run.json" with { type: "json" };
import {
  GAME_SHOWN_BADGES_MAX,
  type GameCatalog,
  type GameEditionUp,
  type GameMe,
  type GamePersonal,
  type GamePersonalUnit,
  type GamePrizes,
  type GameShape,
  type RunGame,
} from "../src/index.ts";

// The shape game (TASK-296, ADR-0255): the examples the app's tests read,
// shaped as the API's game.py answers.
const shapes: GameShape[] = catalog.shapes.map((shape) => ({
  ...shape,
  goal:
    shape.goal.kind === "distance"
      ? {
          kind: "distance",
          total_m: shape.goal.total_m ?? 0,
          distance_m: null,
          pace_s: null,
        }
      : {
          kind: "pace",
          total_m: null,
          distance_m: shape.goal.distance_m ?? 0,
          pace_s: shape.goal.pace_s ?? 0,
        },
  outline: shape.outline.map(([x, y]) => [x, y] as [number, number]),
}));
const served: GameCatalog = { rules_version: catalog.rules_version, shapes };
const mine: GameMe = me;
const worth: RunGame = {
  ...run,
  reason: null,
  editions: run.editions.map((up) => ({
    ...up,
    edition: up.edition as GameEditionUp["edition"],
  })),
};

test("each shape has a closed outline on the card and its five names", () => {
  for (const shape of served.shapes) {
    assert.deepEqual(shape.outline[0], shape.outline[shape.outline.length - 1]);
    assert.ok(shape.outline.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
    assert.deepEqual(Object.keys(shape.names).sort(), ["de", "en", "es", "fr", "it"]);
  }
});

test("the game of the account names every shape of the catalog", () => {
  assert.deepEqual(
    mine.shapes.map((shape) => shape.id),
    served.shapes.map((shape) => shape.id),
  );
  for (const shape of mine.shapes) {
    assert.equal(shape.progress === 1, shape.unlocked_at !== null);
    assert.ok(shape.progress <= 1);
  }
});

test("a run that unlocked a shape names one of the catalog", () => {
  assert.ok(worth.counted);
  assert.ok(worth.unlocked.every((id) => served.shapes.some((s) => s.id === id)));
});

// The personal challenges (TASK-423 part C): as game_personal_api.py answers.
const personal: GamePersonal = {
  ...personalFixture,
  week: {
    ...personalFixture.week,
    challenges: personalFixture.week.challenges.map((c) => ({
      ...c,
      unit: c.unit as GamePersonalUnit,
    })),
  },
  month: {
    ...personalFixture.month,
    challenges: personalFixture.month.challenges.map((c) => ({
      ...c,
      unit: c.unit as GamePersonalUnit,
    })),
  },
  finished: personalFixture.finished.map((f) => ({
    ...f,
    unit: f.unit as GamePersonalUnit,
    period: f.period as "week" | "month",
  })),
};

test("the personal challenges have three steps and a step within them", () => {
  for (const period of [personal.week, personal.month]) {
    assert.ok(period.start < period.end);
    for (const challenge of period.challenges) {
      assert.equal(challenge.tiers.length, 3);
      assert.ok(challenge.tier >= 0 && challenge.tier <= 3);
    }
  }
  assert.deepEqual(
    personal.streaks.map((line) => line.runs),
    [1, 2, 3],
  );
  assert.ok(personal.finished.every((f) => f.tier >= 1 && f.tier <= 3));
});

// The prizes (TASK-423 part E): as game_prizes_api.py answers.
const prizes: GamePrizes = prizesFixture;

test("the editions, the frames and the choice of the profile hold together", () => {
  // Only pace and milestone shapes have editions: a shape of the kilometres none.
  const triangle = mine.shapes.find((shape) => shape.id === "triangle");
  assert.equal(triangle?.edition, null);
  assert.equal(triangle?.edition_runs, null);
  const lightning = mine.shapes.find((shape) => shape.id === "lightning");
  assert.equal(lightning?.edition_runs, 0);
  const editions: GameEditionUp[] = worth.editions ?? [];
  assert.ok(editions.every((up) => served.shapes.some((s) => s.id === up.shape_id)));
  assert.ok(
    (worth.collections_done ?? []).every((id) =>
      (catalog.collections ?? []).some((c) => c.id === id),
    ),
  );
  // The frames are the catalog's collections, in order.
  assert.deepEqual(
    prizes.frames.map((frame) => frame.id),
    (catalog.collections ?? []).map((c) => c.id),
  );
  for (const frame of prizes.frames) {
    assert.equal(frame.got, frame.unlocked === frame.total);
  }
  for (const prize of [...prizes.titles, ...prizes.badges]) {
    assert.equal(prize.got, prize.value >= prize.target);
  }
  // Only what is got is shown, and at most three badges.
  const got = new Set(
    [...prizes.badges, ...prizes.titles].filter((p) => p.got).map((p) => p.id),
  );
  assert.ok(prizes.shown.badges.length <= GAME_SHOWN_BADGES_MAX);
  assert.ok(prizes.shown.badges.every((id) => got.has(id)));
  assert.ok(prizes.frames.some((f) => f.id === prizes.shown.frame && f.got));
});
