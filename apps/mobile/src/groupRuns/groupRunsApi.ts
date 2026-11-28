import type {
  GroupOuting,
  GroupOutingDetail,
  GroupOutingRequest,
  GroupOutings,
  GroupOutingsPage,
  GroupRunChange,
  GroupRunRequest,
  GroupRunStatus,
  LatLon,
  PeoplePage,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "../api/accounts";
import { isPeoplePage } from "../api/follows";
import { isPerson } from "../api/people";

/**
 * The group runs of the API (TASK-309 part A, docs/API.md «Group runs»),
 * read without trusting the answer. An API of before has none of these
 * addresses (404 `http_error`): the app then shows no button and no row.
 * Since TASK-495 part C2 the app reads them as outings (`GroupOuting`):
 * with a group beside them, or without a route, whose distances are null.
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

const VISIBILITIES: readonly string[] = ["everyone", "followers", "group"];

/** Null, a number, or missing from an API of before TASK-495 part C1. */
function isNumberOrNull(value: unknown): boolean {
  return value === null || typeof value === "number";
}

/** A text, null, or missing from an API of before TASK-495 part C1. */
function isTextOrMissing(value: unknown): boolean {
  return value === undefined || isText(value);
}

export function isGroupRun(body: unknown): body is GroupOuting {
  return (
    isRecord(body) &&
    typeof body.id === "string" &&
    typeof body.title === "string" &&
    typeof body.starts_at === "string" &&
    !Number.isNaN(Date.parse(body.starts_at)) &&
    isText(body.meeting_note) &&
    VISIBILITIES.includes(body.visibility as string) &&
    STATUSES.includes(body.status as GroupRunStatus) &&
    isPerson(body.organiser) &&
    typeof body.going === "number" &&
    Array.isArray(body.faces) &&
    body.faces.every(isPerson) &&
    typeof body.i_am_going === "boolean" &&
    isNumberOrNull(body.distance_m) &&
    isPoint(body.start) &&
    Array.isArray(body.preview) &&
    body.preview.every(isPoint) &&
    isTextOrMissing(body.group_id) &&
    isTextOrMissing(body.group_name) &&
    isTextOrMissing(body.destination)
  );
}

/** An outing without a route (TASK-495 part C): its «Destination» in place
 * of the line. */
export function withoutRoute(
  run: Pick<GroupOuting, "preview" | "destination">,
): boolean {
  return run.preview.length < 2 && typeof run.destination === "string";
}

export function isGroupRunDetail(body: unknown): body is GroupOutingDetail {
  return (
    isGroupRun(body) &&
    isRecord(body) &&
    isText(body.description) &&
    Array.isArray(body.points) &&
    (body.points.length >= 2 ||
      (body.points.length === 0 && typeof body.destination === "string")) &&
    body.points.every(isPoint) &&
    Array.isArray(body.people) &&
    body.people.every(isPerson) &&
    isText(body.next)
  );
}

export function isProfileGroupRuns(body: unknown): body is GroupOutings {
  return (
    isRecord(body) &&
    Array.isArray(body.upcoming) &&
    body.upcoming.every(isGroupRun) &&
    Array.isArray(body.past) &&
    body.past.every(isGroupRun)
  );
}

export function isGroupRunsPage(body: unknown): body is GroupOutingsPage {
  return (
    isRecord(body) &&
    Array.isArray(body.group_runs) &&
    body.group_runs.every(isGroupRun)
  );
}

function path(id: string, tail = ""): string {
  return `/group-runs/${encodeURIComponent(id)}${tail}`;
}

function nothing(body: unknown, status: number): body is null {
  return status === 204;
}

/** POST /group-runs: the route on the map, with when and where to meet;
 * with `group_id`, an outing of that group (TASK-495 part C). */
export function createGroupRun(
  baseUrl: string,
  token: string,
  body: GroupRunRequest,
  options: Options = {},
): Promise<AccountOutcome<GroupOutingDetail>> {
  return ask(
    baseUrl,
    "/group-runs",
    { method: "POST", body, token },
    isGroupRunDetail,
    options,
  );
}

/** POST /group-runs: an outing of a group without a route (TASK-495 part
 * C), the meeting point picked on the map and its «Destination». */
export function createGroupOuting(
  baseUrl: string,
  token: string,
  body: GroupOutingRequest,
  options: Options = {},
): Promise<AccountOutcome<GroupOutingDetail>> {
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
): Promise<AccountOutcome<GroupOutingDetail>> {
  return ask(baseUrl, path(id), { method: "GET", token }, isGroupRunDetail, options);
}

/** PUT /group-runs/{id}: the organiser, before the start. */
export function changeGroupRun(
  baseUrl: string,
  token: string,
  id: string,
  body: GroupRunChange,
  options: Options = {},
): Promise<AccountOutcome<GroupOutingDetail>> {
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

/** GET /users/{public_id}/group-runs: upcoming, and the last 20 over; with
 * the outings, which the API gives only to an app that asks (TASK-495 part
 * C). */
export function fetchProfileGroupRuns(
  baseUrl: string,
  token: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<GroupOutings>> {
  return ask(
    baseUrl,
    `/users/${encodeURIComponent(publicId)}/group-runs?outings=true`,
    { method: "GET", token },
    isProfileGroupRuns,
    options,
  );
}

/** Two decimals, about a kilometre, as the Feed's «nearby» (feed.ts): the
 * 50 km of the row ask for no more, and the privacy text says so. */
function rounded(degrees: number): string {
  return String(Math.round(degrees * 100) / 100);
}

/** GET /group-runs?lat=…&lon=…: the Feed's row (TASK-309 part B2,
 * docs/EVENTI.md §5), at most 20, the nearest in time first. Without the
 * phone's point, no `lat` and `lon`: the API then gives the others' from
 * everywhere. `outings=true` adds the outings of my groups (TASK-495 part
 * C), which an app of before could not read. */
export function fetchGroupRuns(
  baseUrl: string,
  token: string,
  near: LatLon | null,
  options: Options = {},
): Promise<AccountOutcome<GroupOutingsPage>> {
  const query =
    near === null
      ? "?outings=true"
      : `?lat=${rounded(near[0])}&lon=${rounded(near[1])}&outings=true`;
  return ask(
    baseUrl,
    `/group-runs${query}`,
    { method: "GET", token },
    isGroupRunsPage,
    options,
  );
}

/** GET /groups/{id}/outings: «Next outings» and «Past outings» of a group's
 * page (TASK-495 part C); 404 as for the group itself. */
export function fetchGroupOutings(
  baseUrl: string,
  token: string,
  groupId: string,
  options: Options = {},
): Promise<AccountOutcome<GroupOutings>> {
  return ask(
    baseUrl,
    `/groups/${encodeURIComponent(groupId)}/outings`,
    { method: "GET", token },
    isProfileGroupRuns,
    options,
  );
}
