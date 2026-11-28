import change from "@shaperoute/shared-types/fixtures/group-run-change.json";
import request from "@shaperoute/shared-types/fixtures/group-run-request.json";
import detail from "@shaperoute/shared-types/fixtures/group-run.json";
import row from "@shaperoute/shared-types/fixtures/group-runs.json";
import ofProfile from "@shaperoute/shared-types/fixtures/group-runs-of-profile.json";

import { answers, apiError } from "../account/testing";
import {
  cancelGroupRun,
  changeGroupRun,
  createGroupRun,
  fetchGroupRun,
  fetchGroupRuns,
  fetchProfileGroupRuns,
  isGroupRun,
  isGroupRunDetail,
  isGroupRunsPage,
  isProfileGroupRuns,
  setGoing,
} from "./groupRunsApi";

const URL = "http://api";
const TOKEN = "the-token";
const ID = detail.id;
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the examples of the API are what the app reads", () => {
  expect(isGroupRunDetail(detail)).toBe(true);
  expect(row.group_runs.every(isGroupRun)).toBe(true);
  expect(isProfileGroupRuns(ofProfile)).toBe(true);
  expect(isGroupRun({ ...detail, status: "maybe" })).toBe(false);
  expect(isGroupRun({ ...detail, starts_at: "tomorrow" })).toBe(false);
  expect(isGroupRun({ ...detail, start: [46] })).toBe(false);
  expect(isGroupRunDetail({ ...detail, points: [[46, 11]] })).toBe(false);
  expect(isProfileGroupRuns({ upcoming: [{}], past: [] })).toBe(false);
  expect(isGroupRunsPage(row)).toBe(true);
  expect(isGroupRunsPage({ group_runs: [{}] })).toBe(false);
  expect(isGroupRunsPage({})).toBe(false);
});

test("a group run is created from the route, with the token", async () => {
  const fetchFn = answers({ status: 201, body: detail });
  const outcome = await createGroupRun(
    URL,
    TOKEN,
    request as Parameters<typeof createGroupRun>[2],
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: detail });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/group-runs`);
  expect(init).toMatchObject({
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("it is read, changed and cancelled by its id", async () => {
  let fetchFn = answers({ status: 200, body: detail });
  await fetchGroupRun(URL, TOKEN, ID, options(fetchFn));
  expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/group-runs/${ID}`);

  fetchFn = answers({ status: 200, body: detail });
  await changeGroupRun(URL, TOKEN, ID, change, options(fetchFn));
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "PUT" });
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual(change);

  fetchFn = answers({ status: 204 });
  const cancelled = await cancelGroupRun(URL, TOKEN, ID, options(fetchFn));
  expect(cancelled).toEqual({ kind: "ok", value: null });
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
});

test("«I'm going» puts, «Not going» deletes, both answered 204", async () => {
  for (const [going, method] of [
    [true, "PUT"],
    [false, "DELETE"],
  ] as const) {
    const fetchFn = answers({ status: 204 });
    const outcome = await setGoing(URL, TOKEN, ID, going, options(fetchFn));
    expect(outcome).toEqual({ kind: "ok", value: null });
    expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/group-runs/${ID}/going`);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ method });
  }
});

test("a profile's group runs; an API of before says 404", async () => {
  const person = "3b9d2e10-7c4a-4f8e-a1d6-5e2f9c0b7a44";
  let fetchFn = answers({ status: 200, body: ofProfile });
  const outcome = await fetchProfileGroupRuns(URL, TOKEN, person, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: ofProfile });
  expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/users/${person}/group-runs`);

  fetchFn = answers({ status: 404, body: apiError("http_error", "Not Found") });
  const before = await fetchProfileGroupRuns(URL, TOKEN, person, options(fetchFn));
  expect(before).toMatchObject({ kind: "api_error", code: "http_error" });
});

test("the Feed's row: the point rounded to about a kilometre, or none", async () => {
  let fetchFn = answers({ status: 200, body: row });
  const outcome = await fetchGroupRuns(
    URL,
    TOKEN,
    [46.06789, 11.12345],
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: row });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/group-runs?lat=46.07&lon=11.12`);
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  fetchFn = answers({ status: 200, body: row });
  await fetchGroupRuns(URL, TOKEN, null, options(fetchFn));
  expect(fetchFn.mock.calls[0][0]).toBe(`${URL}/group-runs`);

  fetchFn = answers({ status: 404, body: apiError("http_error", "Not Found") });
  const before = await fetchGroupRuns(URL, TOKEN, null, options(fetchFn));
  expect(before).toMatchObject({ kind: "api_error", code: "http_error" });
});
