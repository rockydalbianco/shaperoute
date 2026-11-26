import type {
  FeedPage,
  Group,
  GroupAccess,
  GroupDetail,
  GroupJoin,
  GroupMe,
  GroupMember,
  GroupMembersPage,
  GroupRequest,
  GroupRole,
  MyGroups,
  PeoplePage,
} from "@shaperoute/shared-types";

import { type AccountOutcome, ask } from "../api/accounts";
import { isFeedPage } from "../api/feed";
import { isPeoplePage } from "../api/follows";
import { isPerson } from "../api/people";

/**
 * The groups of the API (TASK-495 part A, docs/API.md «Groups»), read
 * without trusting the answer. An API of before has none of these
 * addresses (404 `http_error`): the app then shows no group.
 */

type Options = { fetchFn?: typeof fetch; key?: string | null };

const ACCESSES: readonly GroupAccess[] = ["public", "request", "invite"];
const ROLES: readonly GroupRole[] = ["admin", "coadmin", "member"];
const MES: readonly GroupMe[] = [...ROLES, "requested", "invited", "none"];

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

export function isGroup(body: unknown): body is Group {
  return (
    isRecord(body) &&
    typeof body.id === "string" &&
    typeof body.name === "string" &&
    Array.isArray(body.sports) &&
    body.sports.every((sport) => typeof sport === "string") &&
    typeof body.city === "string" &&
    ACCESSES.includes(body.access as GroupAccess) &&
    typeof body.members === "number" &&
    isText(body.photo) &&
    MES.includes(body.me as GroupMe)
  );
}

export function isGroupDetail(body: unknown): body is GroupDetail {
  return (
    isGroup(body) &&
    isRecord(body) &&
    isText(body.description) &&
    isPoint(body.area) &&
    isText(body.big_photo) &&
    typeof body.muted === "boolean" &&
    typeof body.created_at === "string"
  );
}

export function isMyGroups(body: unknown): body is MyGroups {
  return (
    isRecord(body) &&
    Array.isArray(body.groups) &&
    body.groups.every(isGroup) &&
    Array.isArray(body.invites) &&
    body.invites.every(isGroup)
  );
}

export function isGroupMember(body: unknown): body is GroupMember {
  return (
    isPerson(body) && ROLES.includes((body as { role?: unknown }).role as GroupRole)
  );
}

export function isGroupMembersPage(body: unknown): body is GroupMembersPage {
  return (
    isRecord(body) &&
    Array.isArray(body.members) &&
    body.members.every(isGroupMember) &&
    isText(body.next) &&
    typeof body.total === "number"
  );
}

export function isGroupJoin(body: unknown): body is GroupJoin {
  return isRecord(body) && MES.includes(body.me as GroupMe);
}

function nothing(body: unknown, status: number): body is null {
  return status === 204;
}

function path(id: string, tail = ""): string {
  return `/groups/${encodeURIComponent(id)}${tail}`;
}

function personPath(id: string, list: string, publicId: string, tail = ""): string {
  return path(id, `/${list}/${encodeURIComponent(publicId)}${tail}`);
}

function paged(base: string, cursor: string | null): string {
  return cursor === null ? base : `${base}&cursor=${encodeURIComponent(cursor)}`;
}

/** POST /groups: the one who creates it is its admin. */
export function createGroup(
  baseUrl: string,
  token: string,
  body: GroupRequest,
  options: Options = {},
): Promise<AccountOutcome<GroupDetail>> {
  return ask(
    baseUrl,
    "/groups",
    { method: "POST", body, token },
    isGroupDetail,
    options,
  );
}

/** GET /groups/{id}: 404 for who does not see it. */
export function fetchGroup(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<GroupDetail>> {
  return ask(baseUrl, path(id), { method: "GET", token }, isGroupDetail, options);
}

/** PUT /groups/{id}: the admin changes it, all of it. */
export function changeGroup(
  baseUrl: string,
  token: string,
  id: string,
  body: GroupRequest,
  options: Options = {},
): Promise<AccountOutcome<GroupDetail>> {
  return ask(baseUrl, path(id), { method: "PUT", body, token }, isGroupDetail, options);
}

/** PUT /groups/{id}/photo: a JPEG or PNG in base64, as PUT /me/photo. */
export function putGroupPhoto(
  baseUrl: string,
  token: string,
  id: string,
  image: string,
  options: Options = {},
): Promise<AccountOutcome<GroupDetail>> {
  return ask(
    baseUrl,
    path(id, "/photo"),
    { method: "PUT", body: { image }, token },
    isGroupDetail,
    options,
  );
}

/** DELETE /groups/{id}/photo: the admin takes it off. */
export function removeGroupPhoto(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    path(id, "/photo"),
    { method: "DELETE", token },
    nothing,
    options,
  );
}

/** «Join» (PUT): in, asked, or in from an invite. */
export function joinGroup(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<GroupJoin>> {
  return ask(
    baseUrl,
    path(id, "/membership"),
    { method: "PUT", token },
    isGroupJoin,
    options,
  );
}

/** DELETE …/membership: leaves, withdraws the request, or declines the invite. */
export function leaveGroup(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    path(id, "/membership"),
    { method: "DELETE", token },
    nothing,
    options,
  );
}

/** «Mute» (PUT) or «Unmute» (DELETE): only the news of a new outing. */
export function setGroupMuted(
  baseUrl: string,
  token: string,
  id: string,
  muted: boolean,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    path(id, "/mute"),
    { method: muted ? "PUT" : "DELETE", token },
    nothing,
    options,
  );
}

/** GET /groups/{id}/members: members only, 20 a page. */
export function fetchGroupMembers(
  baseUrl: string,
  token: string,
  id: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<GroupMembersPage>> {
  return ask(
    baseUrl,
    paged(path(id, "/members?limit=20"), cursor),
    { method: "GET", token },
    isGroupMembersPage,
    options,
  );
}

/** DELETE /groups/{id}/members/{public_id}: the admin or a co-admin. */
export function removeGroupMember(
  baseUrl: string,
  token: string,
  id: string,
  publicId: string,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    personPath(id, "members", publicId),
    { method: "DELETE", token },
    nothing,
    options,
  );
}

/** PUT …/members/{public_id}/role: the admin; `admin` passes the role. */
export function setGroupRole(
  baseUrl: string,
  token: string,
  id: string,
  publicId: string,
  role: GroupRole,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    personPath(id, "members", publicId, "/role"),
    { method: "PUT", body: { role }, token },
    nothing,
    options,
  );
}

/** GET /groups/{id}/requests: who asked to join, the first first. */
export function fetchGroupRequests(
  baseUrl: string,
  token: string,
  id: string,
  cursor: string | null = null,
  options: Options = {},
): Promise<AccountOutcome<PeoplePage>> {
  return ask(
    baseUrl,
    paged(path(id, "/requests?limit=20"), cursor),
    { method: "GET", token },
    isPeoplePage,
    options,
  );
}

/** Accepts (PUT) or refuses (DELETE, nobody is told) a request to join. */
export function answerGroupRequest(
  baseUrl: string,
  token: string,
  id: string,
  publicId: string,
  accept: boolean,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    personPath(id, "requests", publicId),
    { method: accept ? "PUT" : "DELETE", token },
    nothing,
    options,
  );
}

/** Invites (PUT) or withdraws the invite (DELETE). */
export function setGroupInvite(
  baseUrl: string,
  token: string,
  id: string,
  publicId: string,
  invited: boolean,
  options: Options = {},
): Promise<AccountOutcome<null>> {
  return ask(
    baseUrl,
    personPath(id, "invites", publicId),
    { method: invited ? "PUT" : "DELETE", token },
    nothing,
    options,
  );
}

/** GET /me/groups: one's own groups, and the invites. */
export function fetchMyGroups(
  baseUrl: string,
  token: string,
  options: Options = {},
): Promise<AccountOutcome<MyGroups>> {
  return ask(baseUrl, "/me/groups", { method: "GET", token }, isMyGroups, options);
}

/**
 * GET /groups/{id}/activity: the members' posts in the group's sports, as
 * a page of «Feed». An API without it says 404: no activity shown.
 */
export function fetchGroupActivity(
  baseUrl: string,
  token: string,
  id: string,
  options: Options = {},
): Promise<AccountOutcome<FeedPage>> {
  return ask(
    baseUrl,
    path(id, "/activity"),
    { method: "GET", token },
    isFeedPage,
    options,
  );
}
