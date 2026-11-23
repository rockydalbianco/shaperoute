import one from "@shaperoute/shared-types/fixtures/gear.json";
import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import asked from "@shaperoute/shared-types/fixtures/gear-request.json";
import type { GearRequest } from "@shaperoute/shared-types";

import { answers, apiError } from "../account/testing";
import {
  addGear,
  deleteGear,
  fetchActivityGear,
  fetchMyGear,
  gearPhotoSource,
  isGear,
  isGearList,
  removeGearPhoto,
  saveActivityGear,
  saveGear,
  saveGearPhoto,
} from "./gear";

const URL = "http://api";
const TOKEN = "the-token";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const ID = one.id;
const REQUEST = asked as GearRequest;

test("the examples of the API are what the app reads", () => {
  expect(isGear(one)).toBe(true);
  expect(isGearList(list)).toBe(true);
  // A kind of a newer API is still an item.
  expect(isGear({ ...one, kind: "kite" })).toBe(true);
  expect(isGear({ ...one, totals: undefined })).toBe(false);
  expect(isGear({ ...one, retired: "no" })).toBe(false);
  expect(isGearList({ gear: [one, { id: 1 }] })).toBe(false);
});

test("the list is asked with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  const outcome = await fetchMyGear(URL, TOKEN, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: list.gear });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/gear");
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("an API without gear is no list", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchMyGear(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
});

test("an item is added, saved and deleted whole", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 201, body: one },
    { status: 200, body: one },
    { status: 204 },
  );
  expect(await addGear(URL, TOKEN, REQUEST, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: one,
  });
  expect(await saveGear(URL, TOKEN, ID, REQUEST, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: one,
  });
  expect(await deleteGear(URL, TOKEN, ID, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
  const calls = fetchFn.mock.calls.map(([url, init]) => [url, init.method]);
  expect(calls).toEqual([
    ["http://api/me/gear", "POST"],
    [`http://api/me/gear/${ID}`, "PUT"],
    [`http://api/me/gear/${ID}`, "DELETE"],
  ]);
  expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual(asked);
});

test("the photo goes as base64 and comes back on the item", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: one }, { status: 204 });
  const saved = await saveGearPhoto(URL, TOKEN, ID, "AAAA", { fetchFn, key: null });
  expect(saved).toEqual({ kind: "ok", value: one });
  expect(await removeGearPhoto(URL, TOKEN, ID, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/gear/${ID}/photo`);
  expect(JSON.parse(init.body)).toEqual({ image: "AAAA" });
  expect(fetchFn.mock.calls[1][1].method).toBe("DELETE");
});

test("a refused word comes back as the API said it", async () => {
  const fetchFn: jest.Mock = answers({
    status: 422,
    body: apiError("comment_rejected"),
  });
  const outcome = await addGear(URL, TOKEN, REQUEST, { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "comment_rejected" });
});

test("the photo is read with the token and the key", () => {
  expect(gearPhotoSource(URL, TOKEN, one.photo_url, "k")).toEqual({
    uri: `http://api${one.photo_url}`,
    headers: { ...AUTH, "X-API-Key": "k" },
  });
});

test("the gear of an activity is read and put whole", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: list },
    { status: 200, body: { gear: [one] } },
  );
  expect(await fetchActivityGear(URL, TOKEN, "a b", { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: list.gear,
  });
  expect(
    await saveActivityGear(
      URL,
      TOKEN,
      "a b",
      { gear_ids: [ID] },
      { fetchFn, key: null },
    ),
  ).toEqual({ kind: "ok", value: [one] });
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/activities/a%20b/gear");
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe("http://api/me/activities/a%20b/gear");
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual({ gear_ids: [ID] });
});
