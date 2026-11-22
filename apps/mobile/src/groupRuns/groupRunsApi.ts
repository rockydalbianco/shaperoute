import type {
  GroupRun,
  GroupRunChange,
  GroupRunDetail,
  GroupRunRequest,
  GroupRunStatus,
  PeoplePage,
  ProfileGroupRuns,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "../api/accounts";
import { isPeoplePage } from "../api/follows";
import { isPerson } from "../api/people";

/**
 * The group runs of the API (TASK-309 part A, docs/API.md «Group runs»),
 * read without trusting the answer. An API of before has none of these
 * addresses (404 `http_error`): the app then shows no button and no row.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const STATUSES: readonly GroupRunStatus[] = [
  "upcoming",
  "started",
  "over",
  "cancelled",
];

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

function isPoint(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

function isText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isGroupRun(body: unknown): body is GroupRun {
  return (
    isRecord(body) &&
    typeof body.id === "string" &&
    typeof body.title === "string" &&
    typeof body.starts_at === "string" &&
    !Number.isNaN(Date.parse(body.starts_at)) &&
    isText(body.meeting_note) &&
    (body.visibility === "everyone" || body.visibility === "followers") &&
    STATUSES.includes(body.status as GroupRunStatus) &&
    isPerson(body.organiser) &&
    typeof body.going === "number" &&
    Array.isArray(body.faces) &&
    body.faces.every(isPerson) &&
    typeof body.i_am_going === "boolean" &&
    typeof body.distance_m === "number" &&
    isPoint(body.start) &&
    Array.isArray(body.preview) &&
    body.preview.every(isPoint)
  );
}

export function isGroupRunDetail(body: unknown): body is GroupRunDetail {
  return (
    isGroupRun(body) &&
    isRecord(body) &&
    isText(body.description) &&
    Array.isArray(body.points) &&
    body.points.length >= 2 &&
    body.points.every(isPoint) &&
    Array.isArray(body.people) &&
    body.people.every(isPerson) &&
    isText(body.next)
  );
}

export function isProfileGroupRuns(body: unknown): body is ProfileGroupRuns {
  return (
    isRecord(body) &&
    Array.isArray(body.upcoming) &&
    body.upcoming.every(isGroupRun) &&
    Array.isArray(body.past) &&
    body.past.every(isGroupRun)
  );
}

function path(id: string, tail = ""): string {
  return `/group-runs/${encodeURIComponent(id)}${tail}`;
}

function nothing(body: unknown, status: number): body is null {
  return status === 204;
}

/** POST /group-runs: the route on the map, with when and where to meet. */
export function createGroupRun(
  baseUrl: string,
  token: string,
  body: GroupRunRequest,
  options: Options = {},
): Promise<AccountOutcome<GroupRunDetail>> {
  return ask(
    baseUrl,
    "/group-runs",
    { method: "POST", body, token },
    isGroupRunDetail,
    options,
  );
}

/** GET /group-runs/{id}: whole, also once cancelled or over. */
export function fetchGroupRun(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<GroupRunDetail>> {
  return ask(baseUrl, path(id), { method: "GET", token }, isGroupRunDetail, options);
}

/** PUT /group-runs/{id}: the organiser, before the start. */
export function changeGroupRun(
  baseUrl: string,
  token: string,
  id: string,
  body: GroupRunChange,
  options: Options = {},
): Promise<AccountOutcome<GroupRunDetail>> {
  return ask(
    baseUrl,
    path(id),
    { method: "PUT", body, token },
    isGroupRunDetail,
    options,
  );
}

/** DELETE /group-runs/{id}: the organiser cancels it; who goes is told. */
export function cancelGroupRun(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(baseUrl, path(id), { method: "DELETE", token }, nothing, options);
}

/** «I'm going» (PUT) or «Not going» (DELETE). */
export function setGoing(
  baseUrl: string,
  token: string,
  id: string,
  going: boolean,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    path(id, "/going"),
    { method: going ? "PUT" : "DELETE", token },
    nothing,
    options,
  );
}

/** GET /group-runs/{id}/going?cursor=…: who goes after the first 20. */
export function fetchGoing(
  baseUrl: string,
  token: string,
  id: string,
  cursor: string,
  options: Options = {},
): Promise<AccountOutcome<PeoplePage>> {
  return ask(
    baseUrl,
    path(id, `/going?cursor=${encodeURIComponent(cursor)}`),
    { method: "GET", token },
    isPeoplePage,
    options,
  );
}

/** GET /users/{public_id}/group-runs: upcoming, and the last 20 over. */
export function fetchProfileGroupRuns(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<ProfileGroupRuns>> {
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}/group-runs`,
    { method: "GET", token },
    isProfileGroupRuns,
    options,
  );
}
