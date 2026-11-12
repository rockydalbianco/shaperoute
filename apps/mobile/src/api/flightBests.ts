import { type AccountOutcome, ask } from "./accounts";

/**
 * One's own bests of the air (TASK-305 part R5a, ADR-0375; docs/API.md «I
 * numeri di un volo»): GET /me/flight-bests, only the owner. Mirrors
 * packages/shared-types/src/flightBests.ts, fixtures/flight-bests.json.
 */

/** One best and the flight it was made in. */
export type FlightBest = {
  /** The key the app gave the flight, as in /me/activities. */
  id: string;
  started_at: string;
  value: number;
};

/** Each null when no flight has it. */
export type FlightBests = {
  /** The highest point, in metres. */
  highest: FlightBest | null;
  /** The longest flight, in seconds, pauses left out. */
  longest: FlightBest | null;
  /** The longest flight in metres. */
  farthest: FlightBest | null;
  /** The top speed over the ground, in metres a second. */
  fastest: FlightBest | null;
};

type Options = { fetchFn?: typeof fetch; key?: string | null };

function isBestOrNull(value: unknown): value is FlightBest | null {
  if (value === null) {
    return true;
  }
  if (typeof value !== "object") {
    return false;
  }
  const { id, started_at, value: number } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    typeof started_at === "string" &&
    !Number.isNaN(new Date(started_at).getTime()) &&
    typeof number === "number" &&
    Number.isFinite(number)
  );
}

export function isFlightBests(body: unknown): body is FlightBests {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const { highest, longest, farthest, fastest } = body as Record<string, unknown>;
  return [highest, longest, farthest, fastest].every(isBestOrNull);
}

/** Whether there is any best to show. */
export function hasBests(bests: FlightBests): boolean {
  return [bests.highest, bests.longest, bests.farthest, bests.fastest].some(
    (best) => best !== null,
  );
}

export function fetchFlightBests(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<FlightBests>> {
  return ask(
    baseUrl,
    "/me/flight-bests",
    { method: "GET", token },
    isFlightBests,
    options,
  );
}
