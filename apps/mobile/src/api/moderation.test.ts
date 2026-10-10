import peoplePage from "@shaperoute/shared-types/fixtures/people-page.json";
import reportRequest from "@shaperoute/shared-types/fixtures/report-request.json";
import type { ReportKind, ReportReason } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import { blockMember, fetchBlocked, report, unblockMember } from "./moderation";

const URL = "http://api";
const TOKEN = "the-token";
const ID = peoplePage.people[0].public_id;
const WITH_TOKEN = { headers: { Authorization: `Bearer ${TOKEN}` } };

test("blocking and unblocking are PUT and DELETE on the member's block", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 }, { status: 204 });
  const options = { fetchFn, key: null };
  expect(await blockMember(URL, TOKEN, ID, options)).toEqual({
    kind: "ok",
    value: null,
  });
  expect(await unblockMember(URL, TOKEN, ID, options)).toEqual({
    kind: "ok",
    value: null,
  });
  expect(fetchFn.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
    [`${URL}/users/${ID}/block`, "PUT"],
    [`${URL}/users/${ID}/block`, "DELETE"],
  ]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject(WITH_TOKEN);
});

test("the blocked are a page of people, the next one by its cursor", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: peoplePage },
    { status: 200, body: peoplePage },
  );
  const options = { fetchFn, key: null };
  expect(await fetchBlocked(URL, TOKEN, null, options)).toEqual({
    kind: "ok",
    value: peoplePage,
  });
  await fetchBlocked(URL, TOKEN, "a b", options);
  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
    `${URL}/me/blocked`,
    `${URL}/me/blocked?cursor=a%20b`,
  ]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "GET", ...WITH_TOKEN });
});

test("a report posts the example's body", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  const outcome = await report(
    URL,
    TOKEN,
    reportRequest.kind as ReportKind,
    reportRequest.id,
    reportRequest.reason as ReportReason,
    { fetchFn, key: null },
  );
  expect(outcome).toEqual({ kind: "ok", value: null });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/reports`);
  expect(init).toMatchObject({ method: "POST", ...WITH_TOKEN });
  expect(JSON.parse(init.body)).toEqual(reportRequest);
});

test("an API without blocks says so as an http_error", async () => {
  const fetchFn: jest.Mock = answers({
    status: 404,
    body: apiError("http_error", "Not Found"),
  });
  const outcome = await blockMember(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "http_error" });
});
