import {
  PEOPLE_QUERY_MIN_LENGTH,
  type PeopleFound,
  type Person,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "./accounts";

/**
 * The members found by name (TASK-211, docs/API.md, «Follow»): GET
 * /users?q= with the session token. The search of «Feed» asks it (TASK-215).
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

/** What the API looks for: the query without the spaces at its ends. */
export function peopleQuery(typed: string): string {
  return typed.trim();
}

/** True when the query is long enough for the API to look for it. */
export function searchable(typed: string): boolean {
  return peopleQuery(typed).length >= PEOPLE_QUERY_MIN_LENGTH;
}

/**
 * GET /users?q=: at most 20 members whose name holds the query, never the
 * one who asks. An API older than TASK-211 has no search: `http_error`.
 */
export function findPeople(
  baseUrl: string,
  token: string,
  typed: string,
  options: Options = {},
): Promise<AccountOutcome<PeopleFound>> {
  return ask(
    baseUrl,
    `/users?q=${encodeURIComponent(peopleQuery(typed))}`,
    { method: "GET", token },
    isPeopleFound,
    options,
  );
}

/** The picture of a member in a list as an `Image` shows it; null without one. */
export function personPhotoUri(person: Person): string | null {
  return person.photo === null ? null : `data:image/jpeg;base64,${person.photo}`;
}

export function isPerson(body: unknown): body is Person {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const person = body as Record<string, unknown>;
  return (
    typeof person.public_id === "string" &&
    typeof person.username === "string" &&
    (person.photo === null || typeof person.photo === "string")
  );
}

export function isPeopleFound(body: unknown): body is PeopleFound {
  if (typeof body !== "object" || body === null) {
    return false;
  }
  const people = (body as Record<string, unknown>).people;
  return Array.isArray(people) && people.every(isPerson);
}
