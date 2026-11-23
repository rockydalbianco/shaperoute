import type { GamePrizes, GamePrizesShown } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "../api/accounts";

/**
 * The prizes of the shape game on the API (TASK-423 part E, ADR-0351;
 * docs/API.md, «Premi»): GET /game/prizes, the account's frames, titles and
 * badges, reached or not. An API before part E answers 404: no «Prizes».
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isState(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.got === "boolean" &&
    typeof value.value === "number" &&
    typeof value.target === "number"
  );
}

function isFrame(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.got === "boolean" &&
    typeof value.unlocked === "number" &&
    typeof value.total === "number"
  );
}

/** What a profile shows of the game, as the API says it: anything else
 * (an older or a broken answer) shows nothing. */
export function isGamePrizesShown(value: unknown): value is GamePrizesShown {
  return (
    isRecord(value) &&
    (value.frame === null || typeof value.frame === "string") &&
    (value.title === null || typeof value.title === "string") &&
    Array.isArray(value.badges) &&
    value.badges.every((id) => typeof id === "string")
  );
}

export function isGamePrizes(value: unknown): value is GamePrizes {
  return (
    isRecord(value) &&
    Array.isArray(value.frames) &&
    value.frames.every(isFrame) &&
    Array.isArray(value.titles) &&
    value.titles.every(isState) &&
    Array.isArray(value.badges) &&
    value.badges.every(isState) &&
    isRecord(value.editions) &&
    typeof value.editions.silver === "number" &&
    typeof value.editions.gold === "number" &&
    isGamePrizesShown(value.shown)
  );
}

/** GET /game/prizes: the account's prizes. */
export function fetchGamePrizes(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<GamePrizes>> {
  return ask(baseUrl, "/game/prizes", { method: "GET", token }, isGamePrizes, options);
}

/** PUT /game/prizes/shown (TASK-423 part E2b): what the public profile
 * shows, one frame, one title, up to 3 badges, only among the prizes the
 * account has; the API answers the prizes again. */
export function saveShownPrizes(
  baseUrl: string,
  token: string,
  shown: GamePrizesShown,
  options: Options = {},
): Promise<AccountOutcome<GamePrizes>> {
  return ask(
    baseUrl,
    "/game/prizes/shown",
    { method: "PUT", body: shown, token },
    isGamePrizes,
    options,
  );
}
