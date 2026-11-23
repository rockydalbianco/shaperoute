import type { LatLon, Person, RunActivity } from "./index.ts";

/**
 * Groups to go out together (TASK-495, ADR-0402, docs/GRUPPI.md, docs/API.md
 * «Groups»): a name, a photo, a description, 1 to GROUP_SPORTS_MAX sports, a
 * city with its point rounded to about a kilometre, and a way in. One
 * admin, up to GROUP_COADMINS_MAX co-admins, the members. Who is in a group
 * only its members see. Mirrors services/api/shaperoute_api/groups.py.
 */

export const GROUP_NAME_MAX = 40;
export const GROUP_DESCRIPTION_MAX = 500;
export const GROUP_CITY_MAX = 80;
export const GROUP_SPORTS_MAX = 3;
/** The groups an account may be the admin of. */
export const GROUPS_ADMIN_MAX = 5;
export const GROUP_MEMBERS_MAX = 300;
export const GROUP_COADMINS_MAX = 3;
/** A group with this sport asks to join or is by invite only. */
export const GROUP_NEVER_PUBLIC_SPORT = "alpinism";

/**
 * `public`: «Join» and one is in. `request`: the admin or a co-admin
 * accepts. `invite`: only who is invited sees the group and joins.
 */
export type GroupAccess = "public" | "request" | "invite";
export type GroupRole = "admin" | "coadmin" | "member";
/** Where who asks stands: its role, or `requested`, `invited`, `none`. */
export type GroupMe = GroupRole | "requested" | "invited" | "none";

/**
 * POST /groups (201 `GroupDetail`), PUT /groups/{id} (200 `GroupDetail`,
 * the admin only): the whole group. Name, description and city pass the
 * filter of the negative comments (`comment_rejected`).
 */
export interface GroupRequest {
  name: string;
  description?: string | null;
  /** 1 to GROUP_SPORTS_MAX different sports. */
  sports: RunActivity[];
  city: string;
  /** A point of the city; the API keeps it rounded to about a kilometre. */
  area: LatLon;
  access: GroupAccess;
}

/** A group on a card: Explore, one's groups, an invite. */
export interface Group {
  id: string;
  name: string;
  /** Names of runs.activity; a sport the app does not know is shown plain. */
  sports: string[];
  city: string;
  access: GroupAccess;
  /** How many are in it, as who asks sees them. */
  members: number;
  /** A small square JPEG in base64; null without a photo. */
  photo: string | null;
  me: GroupMe;
}

/** GET /groups/{id}: the group's page; 404 for who does not see it. */
export interface GroupDetail extends Group {
  description: string | null;
  area: LatLon;
  /** The photo, 256 px a side, in base64; null without. */
  big_photo: string | null;
  /** Whether who asks, a member, put «Mute» on the group. */
  muted: boolean;
  created_at: string;
}

/**
 * GET /groups?lat=&lon=&sport=&q=: Explore. With `q`, the groups whose name
 * holds it, anywhere, by name; else those within 50 km of the point, the
 * nearest first. Never a group by invite only. 422 with neither.
 */
export interface GroupsFound {
  groups: Group[];
}

/** GET /me/groups: only one's own. */
export interface MyGroups {
  groups: Group[];
  /** The groups one is invited to, the latest invite first. */
  invites: Group[];
}

export interface GroupMember extends Person {
  role: GroupRole;
}

/**
 * GET /groups/{id}/members, members only (403 for the others): the admin,
 * the co-admins, the members, each by when it came in.
 */
export interface GroupMembersPage {
  members: GroupMember[];
  /** The `cursor` of the next page; null on the last one. */
  next: string | null;
  total: number;
}

/**
 * PUT /groups/{id}/members/{public_id}/role (204), the admin only; `admin`
 * passes the role, and the admin becomes a member.
 */
export interface GroupRoleRequest {
  role: GroupRole;
}

/** PUT /groups/{id}/membership: where who asked stands now. */
export interface GroupJoin {
  me: GroupMe;
}

/**
 * The push notifications of a group: a request to join (to the admin and
 * the co-admins), the request accepted, an invite. Their `data` is
 * `{ kind, group_id }`, and the app opens the group's page.
 */
export type GroupPushKind =
  "group_join_request" | "group_join_accepted" | "group_invite";

/** The `data` of a group's notification. */
export interface GroupPushData {
  kind: GroupPushKind;
  group_id: string;
}
