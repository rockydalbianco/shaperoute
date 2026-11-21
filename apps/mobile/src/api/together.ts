import type { TogetherPage, TogetherPerson } from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

type Options = { fetchFn?: typeof fetch; key?: string | null };

/**
 * GET /drawings/{id}/together (TASK-417 part D, ADR-0345): the tracks with
 * their times of the post's run and of the people tagged who ran it too,
 * for the «Together» video. Only the post's author receives them; anybody
 * else, and an API of before, get 404: then there is no «Together».
 */
export function fetchTogether(
  baseUrl: string,
  token: string,
  drawingId: string,
  options: Options = {},
): Promise<AccountOutcome<TogetherPage>> {
  return ask(
    baseUrl,
    `/drawings/${encodeURIComponent(drawingId)}/together`,
    { method: "GET", token },
    isTogetherPage,
    options,
  );
}

/**
 * Whether a «Together» video can be made of the answer: the author and at
 * least one person who ran with it.
 */
export function hasCompany(page: TogetherPage): boolean {
  return page.people.length >= 2;
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every(isNumber);
}

function isPerson(body: unknown): body is TogetherPerson {
  if (
    !isRecord(body) ||
    typeof body.public_id !== "string" ||
    typeof body.username !== "string" ||
    !Array.isArray(body.points) ||
    !Array.isArray(body.seconds) ||
    !Array.isArray(body.pauses)
  ) {
    return false;
  }
  const { points, seconds, pauses } = body;
  return (
    points.length >= 1 &&
    points.length === seconds.length &&
    points.every(isPoint) &&
    seconds.every(isNumber) &&
    // The clock never goes back: the video reads it in order.
    seconds.every((s, i) => i === 0 || s >= (seconds[i - 1] as number)) &&
    pauses.every(
      (pause) =>
        isRecord(pause) &&
        isNumber(pause.from_s) &&
        isNumber(pause.to_s) &&
        pause.to_s >= pause.from_s,
    )
  );
}

export function isTogetherPage(body: unknown): body is TogetherPage {
  return (
    isRecord(body) &&
    Array.isArray(body.people) &&
    body.people.length >= 1 &&
    body.people.every(isPerson)
  );
}
