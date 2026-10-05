import follow from "@shaperoute/shared-types/fixtures/follow.json";
import peoplePage from "@shaperoute/shared-types/fixtures/people-page.json";

import { answers, apiError } from "../account/testing";
import {
  answerFollowRequest,
  askToFollow,
  countFollowRequests,
  fetchFollowList,
  isFollow,
  isPeoplePage,
  removeFollower,
  stopFollowing,
} from "./follows";

const URL = "http://api";
const TOKEN = "the-token";
const ID = peoplePage.people[0].public_id;
const WITH_TOKEN = { headers: { Authorization: `Bearer ${TOKEN}` } };

test("the examples of the API are what the app reads", () => {
  expect(isFollow(follow)).toBe(true);
  expect(isFollow({ follow: "following" })).toBe(true);
  // The answer to a request is never «none».
  expect(isFollow({ follow: "none" })).toBe(false);
  expect(isFollow({})).toBe(false);
  expect(isFollow(null)).toBe(false);
  expect(isPeoplePage(peoplePage)).toBe(true);
  expect(isPeoplePage({ people: [], next: null, total: 0 })).toBe(true);
  expect(isPeoplePage({ people: [], next: null })).toBe(false);
  expect(isPeoplePage({ people: [{}], next: null, total: 1 })).toBe(false);
  expect(isPeoplePage(null)).toBe(false);
});

test("asking to follow posts to the member's profile, with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: follow });
  const outcome = await askToFollow(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: { follow: "requested" } });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/users/${ID}/follow`);
  expect(init).toMatchObject({ method: "POST", ...WITH_TOKEN });
});

test("taking a request back and stopping are the same call", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  const outcome = await stopFollowing(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/users/${ID}/follow`);
  expect(init).toMatchObject({ method: "DELETE", ...WITH_TOKEN });
});

test("each list has its path, and the next page its cursor", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: peoplePage },
    { status: 200, body: peoplePage },
    { status: 200, body: peoplePage },
  );
  const options = { fetchFn, key: null };
  expect(await fetchFollowList(URL, TOKEN, "requests", null, options)).toEqual({
    kind: "ok",
    value: peoplePage,
  });
  await fetchFollowList(URL, TOKEN, "followers", null, options);
  await fetchFollowList(URL, TOKEN, "following", "a b", options);
  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
    `${URL}/me/follow-requests`,
    `${URL}/me/followers`,
    `${URL}/me/following?cursor=a%20b`,
  ]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "GET", ...WITH_TOKEN });
});

test("a request is accepted or declined by the member's id", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 }, { status: 204 });
  const options = { fetchFn, key: null };
  expect(await answerFollowRequest(URL, TOKEN, ID, "accept", options)).toEqual({
    kind: "ok",
    value: null,
  });
  await answerFollowRequest(URL, TOKEN, ID, "decline", options);
  expect(fetchFn.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    [`${URL}/me/follow-requests/${ID}/accept`, "POST"],
    [`${URL}/me/follow-requests/${ID}/decline`, "POST"],
  ]);
});

test("a follower is removed by id", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  await removeFollower(URL, TOKEN, ID, { fetchFn, key: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/me/followers/${ID}`);
  expect(init).toMatchObject({ method: "DELETE", ...WITH_TOKEN });
});

test("an API without following says so as an http_error", async () => {
  const fetchFn: jest.Mock = answers({
    status: 404,
    body: apiError("http_error", "Not Found"),
  });
  const outcome = await askToFollow(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "http_error" });
});

test("how many ask to follow is the total of a page of one", async () => {
  const fetchFn = answers({ status: 200, body: { ...peoplePage, total: 7 } });
  const options = { fetchFn, key: null };
  expect(await countFollowRequests(URL, TOKEN, options)).toEqual({
    kind: "ok",
    value: 7,
  });
  expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/me/follow-requests?limit=1`);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "GET", ...WITH_TOKEN });

  const failed = answers({ status: 401, body: apiError("session_expired") });
  expect(
    await countFollowRequests(URL, TOKEN, { fetchFn: failed, key: null }),
  ).toMatchObject({ kind: "api_error", code: "session_expired" });
});
