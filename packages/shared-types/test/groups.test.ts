import assert from "node:assert/strict";
import { test } from "node:test";

import activity from "../fixtures/group-activity.json" with { type: "json" };
import members from "../fixtures/group-members.json" with { type: "json" };
import pushData from "../fixtures/group-push-data.json" with { type: "json" };
import request from "../fixtures/group-request.json" with { type: "json" };
import detail from "../fixtures/group.json" with { type: "json" };
import found from "../fixtures/groups.json" with { type: "json" };
import mine from "../fixtures/my-groups.json" with { type: "json" };
import {
  GROUP_COADMINS_MAX,
  GROUP_DESCRIPTION_MAX,
  GROUP_NAME_MAX,
  GROUP_NEVER_PUBLIC_SPORT,
  GROUP_SPORTS_MAX,
  REPORT_KINDS,
  RUN_ACTIVITIES,
  type Group,
  type GroupActivity,
  type GroupAccess,
  type GroupDetail,
  type GroupMe,
  type GroupMembersPage,
  type GroupPushData,
  type GroupPushKind,
  type GroupRequest,
  type GroupRole,
  type GroupsFound,
  type LatLon,
  type MyGroups,
  type RunActivity,
} from "../src/index.ts";

// Groups (TASK-495, ADR-0402): the examples the app's tests read, shaped as
// groups.py answers; test_groups.py validates the same.
const ACCESS: readonly GroupAccess[] = ["public", "request", "invite"];
const ROLES: readonly GroupRole[] = ["admin", "coadmin", "member"];
const MES: readonly GroupMe[] = [...ROLES, "requested", "invited", "none"];
const KINDS: readonly GroupPushKind[] = [
  "group_join_request",
  "group_join_accepted",
  "group_invite",
];

const point = ([lat, lon]: number[]): LatLon => [lat, lon];
const access = (value: string): GroupAccess =>
  ACCESS.find((one) => one === value) ?? "request";
const me = (value: string): GroupMe => MES.find((one) => one === value) ?? "none";
const role = (value: string): GroupRole =>
  ROLES.find((one) => one === value) ?? "member";
const sport = (value: string): RunActivity =>
  RUN_ACTIVITIES.find((one) => one === value) ?? "hiking";

function card(json: (typeof found.groups)[number]): Group {
  return { ...json, access: access(json.access), me: me(json.me) };
}

const asked: GroupRequest = {
  ...request,
  sports: request.sports.map(sport),
  area: point(request.area),
  access: access(request.access),
};
const whole: GroupDetail = {
  ...detail,
  ...card(detail),
  area: point(detail.area),
};
const page: GroupsFound = { groups: found.groups.map(card) };
const own: MyGroups = {
  groups: mine.groups.map(card),
  invites: mine.invites.map(card),
};
const list: GroupMembersPage = {
  ...members,
  members: members.members.map((one) => ({ ...one, role: role(one.role) })),
};
const opened: GroupPushData[] = pushData.map((data) => ({
  kind: KINDS.find((kind) => kind === data.kind) ?? "group_invite",
  group_id: data.group_id,
}));

test("a group is asked for with a name, 1 to 3 sports, a city and a way in", () => {
  assert.ok(asked.name.length >= 1 && asked.name.length <= GROUP_NAME_MAX);
  assert.ok((asked.description ?? "").length <= GROUP_DESCRIPTION_MAX);
  assert.ok(asked.sports.length >= 1 && asked.sports.length <= GROUP_SPORTS_MAX);
  assert.equal(new Set(asked.sports).size, asked.sports.length);
  assert.ok(ACCESS.includes(asked.access));
  assert.equal(asked.area.length, 2);
});

test("the cards say how many are in and where who asks stands", () => {
  for (const group of [...page.groups, ...own.groups, ...own.invites, whole]) {
    assert.ok(group.members >= 1);
    assert.ok(MES.includes(group.me));
    assert.ok(ACCESS.includes(group.access));
  }
  assert.ok(own.invites.every((group) => group.me === "invited"));
  // A group with alpinism is never public.
  for (const group of [...page.groups, ...own.groups, ...own.invites]) {
    if (group.sports.includes(GROUP_NEVER_PUBLIC_SPORT)) {
      assert.notEqual(group.access, "public");
    }
  }
});

test("the page of a group has its rounded point and the member's «Mute»", () => {
  assert.equal(typeof whole.muted, "boolean");
  for (const value of whole.area) {
    assert.equal(Math.round(value * 100) / 100, value);
  }
});

test("the members come with their roles, the admin first, one admin", () => {
  assert.equal(list.members[0]?.role, "admin");
  assert.equal(list.members.filter((one) => one.role === "admin").length, 1);
  assert.ok(
    list.members.filter((one) => one.role === "coadmin").length <= GROUP_COADMINS_MAX,
  );
  assert.equal(list.total, list.members.length);
});

test("a group's push opens the group, and a group can be reported", () => {
  assert.deepEqual(
    opened.map((one) => one.kind),
    KINDS,
  );
  assert.ok(opened.every((one) => one.group_id.length === 36));
  assert.ok((REPORT_KINDS as readonly string[]).includes("group"));
});

test("the recent activity of a group is a page of the Feed's cards", () => {
  const recent: GroupActivity = activity as unknown as GroupActivity;
  assert.ok(Array.isArray(recent.posts));
  assert.equal(recent.next, null);
});
