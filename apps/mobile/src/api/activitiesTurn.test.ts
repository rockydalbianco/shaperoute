/**
 * A saved run keeps how far its route's shape is turned (TASK-232,
 * ADR-0195): sent only when it is, read back as a number or null, and sent
 * again without it to an API before TASK-232 part C.
 */
import activities from "@shaperoute/shared-types/fixtures/activities.json";
import turnedRequest from "@shaperoute/shared-types/fixtures/activity-request-turned.json";
import walkedRequest from "@shaperoute/shared-types/fixtures/activity-request-walks.json";
import request from "@shaperoute/shared-types/fixtures/activity-request.json";
import turnedActivity from "@shaperoute/shared-types/fixtures/activity-turned.json";
import activity from "@shaperoute/shared-types/fixtures/activity.json";

import { answers, apiError } from "../account/testing";
import {
  type ActivityRequest,
  isActivitiesPage,
  isActivity,
  isActivityDetail,
  saveActivity,
  withoutPenUp,
  withoutTurn,
} from "./activities";

const URL = "http://api";
const TOKEN = "the-token";
const ID = activity.id;

test("the turned examples of the API are what the app reads", () => {
  expect(isActivityDetail(turnedActivity)).toBe(true);
  expect(turnedActivity.rotation_deg).toBe(-30);
  const [saved] = activities.activities;
  expect(isActivity({ ...saved, rotation_deg: -30 })).toBe(true);
  expect(isActivity({ ...saved, rotation_deg: null })).toBe(true);
  expect(
    isActivitiesPage({ ...activities, activities: [{ ...saved, rotation_deg: 22.5 }] }),
  ).toBe(true);
  // Not a number: a bad answer.
  expect(isActivity({ ...saved, rotation_deg: "-30" })).toBe(false);
  expect(isActivityDetail({ ...turnedActivity, rotation_deg: "-30" })).toBe(false);
});

test("the request of an older app has no turn; one without a turn is as it is", () => {
  const typed = turnedRequest as ActivityRequest;
  const older = withoutTurn(typed);
  expect(older).toEqual(request);
  expect("rotation_deg" in older).toBe(false);
  const plain = request as ActivityRequest;
  expect(withoutTurn(plain)).toBe(plain);
  // An app before TASK-199 sent neither walks, pen nor turn.
  const walkedTurned = { ...walkedRequest, rotation_deg: -30 } as ActivityRequest;
  expect("rotation_deg" in withoutPenUp(walkedTurned)).toBe(false);
  expect("walks" in withoutPenUp(walkedTurned)).toBe(false);
  expect(withoutPenUp(typed)).toEqual(request);
});

test("a turned run an older API refuses goes once more without the turn", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers(
    {
      status: 422,
      body: apiError("invalid_request", "rotation_deg: Extra inputs are not permitted"),
    },
    { status: 201, body: saved },
  );
  const body = turnedRequest as ActivityRequest;
  const outcome = await saveActivity(URL, TOKEN, ID, body, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: saved });
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(String(fetchFn.mock.calls[0][1]?.body)).toBe(JSON.stringify(turnedRequest));
  expect(String(fetchFn.mock.calls[1][1]?.body)).toBe(JSON.stringify(request));
});

test("a turned run with walks: without the turn, then as an older app, no more", async () => {
  const [saved] = activities.activities;
  const refused = {
    status: 422,
    body: apiError("invalid_request", "Extra inputs are not permitted"),
  };
  const body = { ...walkedRequest, rotation_deg: -30 } as ActivityRequest;
  const fetchFn: jest.Mock = answers(refused, refused, { status: 201, body: saved });
  expect(await saveActivity(URL, TOKEN, ID, body, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: saved,
  });
  expect(fetchFn).toHaveBeenCalledTimes(3);
  expect(String(fetchFn.mock.calls[1][1]?.body)).toBe(JSON.stringify(walkedRequest));
  expect(String(fetchFn.mock.calls[2][1]?.body)).toBe(
    JSON.stringify(withoutPenUp(walkedRequest as ActivityRequest)),
  );
  // Refused three times: three requests, the last answer.
  const again: jest.Mock = answers(refused, refused, refused);
  expect(
    await saveActivity(URL, TOKEN, ID, body, { fetchFn: again, key: null }),
  ).toMatchObject({ kind: "api_error", code: "invalid_request" });
  expect(again).toHaveBeenCalledTimes(3);
});

test("a run kept with its turn is not sent again", async () => {
  const [saved] = activities.activities;
  const fetchFn: jest.Mock = answers({
    status: 201,
    body: { ...saved, rotation_deg: -30 },
  });
  const body = turnedRequest as ActivityRequest;
  const outcome = await saveActivity(URL, TOKEN, ID, body, { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "ok", value: { rotation_deg: -30 } });
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
