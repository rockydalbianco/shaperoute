import feed from "@shaperoute/shared-types/fixtures/feed.json";
import detail from "@shaperoute/shared-types/fixtures/group.json";
import members from "@shaperoute/shared-types/fixtures/group-members.json";
import request from "@shaperoute/shared-types/fixtures/group-request.json";
import found from "@shaperoute/shared-types/fixtures/groups.json";
import mine from "@shaperoute/shared-types/fixtures/my-groups.json";
import type { GroupRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  answerGroupRequest,
  changeGroup,
  createGroup,
  deleteGroup,
  fetchGroup,
  fetchGroupActivity,
  fetchGroupMembers,
  fetchGroupRequests,
  fetchMyGroups,
  findGroups,
  isGroup,
  isGroupDetail,
  isGroupJoin,
  isGroupMembersPage,
  isGroupsFound,
  isMyGroups,
  joinGroup,
  leaveGroup,
  putGroupPhoto,
  removeGroupMember,
  removeGroupPhoto,
  setGroupInvite,
  setGroupMuted,
  setGroupRole,
} from "./groupsApi";

const URL = "http://api";
const TOKEN = "the-token";
const ID = detail.id;
const PERSON = members.members[2]!.public_id;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const BODY = request as GroupRequest;

function call(fetchFn: jest.Mock, n = 0): string {
  const [url, init] = fetchFn.mock.calls[n] as [string, RequestInit | undefined];
  return `${init?.method ?? "GET"} ${url.replace(URL, "")}`;
}

test("the examples of the API are what the app reads", () => {
  expect(isGroupDetail(detail)).toBe(true);
  expect(found.groups.every(isGroup)).toBe(true);
  expect(isMyGroups(mine)).toBe(true);
  expect(isGroupMembersPage(members)).toBe(true);
  expect(isGroupJoin({ me: "requested" })).toBe(true);
  expect(isGroup({ ...detail, access: "secret" })).toBe(false);
  expect(isGroup({ ...detail, me: "owner" })).toBe(false);
  expect(isGroupDetail({ ...detail, area: [46] })).toBe(false);
  expect(isGroupDetail({ ...detail, muted: "no" })).toBe(false);
  expect(
    isGroupMembersPage({
      ...members,
      members: [{ ...members.members[0], role: "boss" }],
    }),
  ).toBe(false);
  expect(isMyGroups({ groups: [], invites: [{}] })).toBe(false);
});

test("a group is created with the token, and read and changed by its id", async () => {
  let fetchFn = answers({ status: 201, body: detail });
  const outcome = await createGroup(URL, TOKEN, BODY, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: detail });
  expect(call(fetchFn)).toBe("POST /groups");
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual(request);

  fetchFn = answers({ status: 200, body: detail });
  await fetchGroup(URL, TOKEN, ID, options(fetchFn));
  expect(call(fetchFn)).toBe(`GET /groups/${ID}`);

  fetchFn = answers({ status: 200, body: detail });
  await changeGroup(URL, TOKEN, ID, BODY, options(fetchFn));
  expect(call(fetchFn)).toBe(`PUT /groups/${ID}`);
});

test("the photo goes as { image }, and comes off", async () => {
  let fetchFn = answers({ status: 200, body: detail });
  await putGroupPhoto(URL, TOKEN, ID, "AAAA", options(fetchFn));
  expect(call(fetchFn)).toBe(`PUT /groups/${ID}/photo`);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({ image: "AAAA" });

  fetchFn = answers({ status: 204 });
  expect(await removeGroupPhoto(URL, TOKEN, ID, options(fetchFn))).toEqual({
    kind: "ok",
    value: null,
  });
  expect(call(fetchFn)).toBe(`DELETE /groups/${ID}/photo`);
});

test("«Join» says where one stands; leaving, «Mute» and «Unmute» answer 204", async () => {
  let fetchFn = answers({ status: 200, body: { me: "requested" } });
  expect(await joinGroup(URL, TOKEN, ID, options(fetchFn))).toEqual({
    kind: "ok",
    value: { me: "requested" },
  });
  expect(call(fetchFn)).toBe(`PUT /groups/${ID}/membership`);

  fetchFn = answers({ status: 204 });
  await leaveGroup(URL, TOKEN, ID, options(fetchFn));
  expect(call(fetchFn)).toBe(`DELETE /groups/${ID}/membership`);

  fetchFn = answers({ status: 204 });
  expect(await deleteGroup(URL, TOKEN, ID, options(fetchFn))).toEqual({
    kind: "ok",
    value: null,
  });
  expect(call(fetchFn)).toBe(`DELETE /groups/${ID}`);

  fetchFn = answers({ status: 204 }, { status: 204 });
  await setGroupMuted(URL, TOKEN, ID, true, options(fetchFn));
  await setGroupMuted(URL, TOKEN, ID, false, options(fetchFn));
  expect(call(fetchFn, 0)).toBe(`PUT /groups/${ID}/mute`);
  expect(call(fetchFn, 1)).toBe(`DELETE /groups/${ID}/mute`);
});

test("members by pages; a member removed; a role given", async () => {
  let fetchFn = answers({ status: 200, body: members }, { status: 200, body: members });
  await fetchGroupMembers(URL, TOKEN, ID, null, options(fetchFn));
  await fetchGroupMembers(URL, TOKEN, ID, "2-1-ab", options(fetchFn));
  expect(call(fetchFn, 0)).toBe(`GET /groups/${ID}/members?limit=20`);
  expect(call(fetchFn, 1)).toBe(`GET /groups/${ID}/members?limit=20&cursor=2-1-ab`);

  fetchFn = answers({ status: 204 });
  await removeGroupMember(URL, TOKEN, ID, PERSON, options(fetchFn));
  expect(call(fetchFn)).toBe(`DELETE /groups/${ID}/members/${PERSON}`);

  fetchFn = answers({ status: 204 });
  await setGroupRole(URL, TOKEN, ID, PERSON, "coadmin", options(fetchFn));
  expect(call(fetchFn)).toBe(`PUT /groups/${ID}/members/${PERSON}/role`);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    role: "coadmin",
  });
});

test("requests are read, accepted and refused; invites sent and withdrawn", async () => {
  const people = { people: [members.members[2]], next: null, total: 1 };
  let fetchFn = answers({ status: 200, body: people });
  expect(
    await fetchGroupRequests(URL, TOKEN, ID, null, options(fetchFn)),
  ).toMatchObject({
    kind: "ok",
  });
  expect(call(fetchFn)).toBe(`GET /groups/${ID}/requests?limit=20`);

  fetchFn = answers({ status: 204 }, { status: 204 });
  await answerGroupRequest(URL, TOKEN, ID, PERSON, true, options(fetchFn));
  await answerGroupRequest(URL, TOKEN, ID, PERSON, false, options(fetchFn));
  expect(call(fetchFn, 0)).toBe(`PUT /groups/${ID}/requests/${PERSON}`);
  expect(call(fetchFn, 1)).toBe(`DELETE /groups/${ID}/requests/${PERSON}`);

  fetchFn = answers({ status: 204 }, { status: 204 });
  await setGroupInvite(URL, TOKEN, ID, PERSON, true, options(fetchFn));
  await setGroupInvite(URL, TOKEN, ID, PERSON, false, options(fetchFn));
  expect(call(fetchFn, 0)).toBe(`PUT /groups/${ID}/invites/${PERSON}`);
  expect(call(fetchFn, 1)).toBe(`DELETE /groups/${ID}/invites/${PERSON}`);
});

test("one's groups and invites; the activity as a page of «Feed»", async () => {
  let fetchFn = answers({ status: 200, body: mine });
  expect(await fetchMyGroups(URL, TOKEN, options(fetchFn))).toEqual({
    kind: "ok",
    value: mine,
  });
  expect(call(fetchFn)).toBe("GET /me/groups");

  fetchFn = answers({ status: 200, body: feed });
  expect(await fetchGroupActivity(URL, TOKEN, ID, options(fetchFn))).toMatchObject({
    kind: "ok",
  });
  expect(call(fetchFn)).toBe(`GET /groups/${ID}/activity`);
});

test("Explore finds groups near a point or by name, of a sport", async () => {
  expect(isGroupsFound(found)).toBe(true);
  expect(isGroupsFound({ groups: [{ ...detail, access: "secret" }] })).toBe(false);
  let fetchFn = answers({ status: 200, body: found });
  expect(
    await findGroups(URL, TOKEN, { near: [46.07, 11.12] }, options(fetchFn)),
  ).toEqual({ kind: "ok", value: found });
  expect(call(fetchFn)).toBe("GET /groups?lat=46.07&lon=11.12");

  fetchFn = answers({ status: 200, body: found });
  await findGroups(
    URL,
    TOKEN,
    { q: " Trail & co ", sport: "hiking" },
    options(fetchFn),
  );
  expect(call(fetchFn)).toBe("GET /groups?q=Trail%20%26%20co&sport=hiking");

  fetchFn = answers({ status: 200, body: found });
  await findGroups(URL, TOKEN, { near: [46, 11], sport: null }, options(fetchFn));
  expect(call(fetchFn)).toBe("GET /groups?lat=46&lon=11");

  fetchFn = answers({ status: 200, body: { groups: "none" } });
  expect(await findGroups(URL, TOKEN, { near: [46, 11] }, options(fetchFn))).toEqual({
    kind: "bad_answer",
    status: 200,
  });
});

test("an API of before says 404", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error", "Not Found") });
  expect(await fetchMyGroups(URL, TOKEN, options(fetchFn))).toMatchObject({
    kind: "api_error",
    code: "http_error",
  });
});
