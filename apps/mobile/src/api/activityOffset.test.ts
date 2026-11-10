import activities from "@shaperoute/shared-types/fixtures/activities.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";

import { answers, apiError } from "../account/testing";
import {
  type ActivityRequest,
  saveActivity,
  UTC_OFFSET_MAX_MIN,
  utcOffsetAt,
  withOffset,
  withoutOffset,
} from "./activities";

/**
 * A saved run carries the phone's offset from UTC as it began (TASK-423
 * part D, docs/GIOCO.md §6.6): the API reads the personal challenges and
 * the streak on the runner's own week and hours. An API before TASK-423
 * part C refuses the field: the run goes again without it.
 */

const URL = "http://api";
const TOKEN = "the-token";
const ID = activity.id;
const plain = request as ActivityRequest;
const FIRST_MS = plain.track[0].time_ms;

test("the offset is the phone's at the first fix", () => {
  const asked: number[] = [];
  const sent = withOffset(plain, (ms) => {
    asked.push(ms);
    return 60;
  });
  expect(asked).toEqual([FIRST_MS]);
  expect(sent).toEqual({ ...plain, utc_offset_min: 60 });
  // The field comes last: the rest of the request is as before.
  expect(Object.keys(sent)).toEqual([...Object.keys(plain), "utc_offset_min"]);
  expect(withOffset(plain, () => -330)).toMatchObject({ utc_offset_min: -330 });
  expect(withOffset(plain, () => 0)).toMatchObject({ utc_offset_min: 0 });
});

test("the phone's own clock: minutes ahead of UTC", () => {
  expect(utcOffsetAt(FIRST_MS)).toBe(0 - new Date(FIRST_MS).getTimezoneOffset());
  // On UTC: 0, not -0.
  expect(Object.is(utcOffsetAt(FIRST_MS) + 0, utcOffsetAt(FIRST_MS))).toBe(true);
});

test("no fix, a file, an offset already there, or one the API would refuse: as it is", () => {
  const empty = { ...plain, track: [] };
  expect(withOffset(empty, () => 60)).toBe(empty);
  // A run from a file of another app does not count for Play: as before.
  const imported: ActivityRequest = { ...plain, source: "file" };
  expect(withOffset(imported, () => 60)).toBe(imported);
  const kept = { ...plain, utc_offset_min: 120 };
  expect(withOffset(kept, () => 60)).toBe(kept);
  expect(withOffset(plain, () => UTC_OFFSET_MAX_MIN + 1)).toBe(plain);
  expect(withOffset(plain, () => -UTC_OFFSET_MAX_MIN - 1)).toBe(plain);
  expect(withOffset(plain, () => Number.NaN)).toBe(plain);
  expect(withOffset(plain, () => UTC_OFFSET_MAX_MIN)).toMatchObject({
    utc_offset_min: UTC_OFFSET_MAX_MIN,
  });
});

test("an older app's request has no offset; one without is the same", () => {
  expect(withoutOffset({ ...plain, utc_offset_min: 60 })).toEqual(plain);
  expect(withoutOffset(plain)).toBe(plain);
});

test("an API that takes the offset is asked once, with it", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers({ status: 201, body: saved });
  const outcome = await saveActivity(URL, TOKEN, ID, plain, {
    fetchFn,
    key: null,
    offsetAt: () => 60,
  });
  expect(outcome).toEqual({ kind: "ok", value: saved });
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    ...plain,
    utc_offset_min: 60,
  });
});

test("an API before TASK-423 refuses the offset: the run goes again without", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers(
    {
      status: 422,
      body: apiError(
        "invalid_request",
        "utc_offset_min: Extra inputs are not permitted",
      ),
    },
    { status: 201, body: saved },
  );
  const outcome = await saveActivity(URL, TOKEN, ID, plain, {
    fetchFn,
    key: null,
    offsetAt: () => 60,
  });
  expect(outcome).toEqual({ kind: "ok", value: saved });
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toMatchObject({
    utc_offset_min: 60,
  });
  expect(JSON.parse(String(fetchFn.mock.calls[1][1]?.body))).toEqual(plain);
});

test("no network is no refusal: sent once", async () => {
  const fetchFn: jest.Mock = answers(new Error("no network"));
  expect(
    await saveActivity(URL, TOKEN, ID, plain, {
      fetchFn,
      key: null,
      offsetAt: () => 60,
    }),
  ).toEqual({ kind: "unreachable", url: URL });
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
