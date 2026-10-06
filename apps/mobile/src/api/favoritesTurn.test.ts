/**
 * A favorite keeps how far its shape is turned (TASK-232, ADR-0195): sent
 * only when it is, read back as a number or null, and sent again without it
 * to an API before TASK-232 part C.
 */
import turnedRequest from "@shaperoute/shared-types/fixtures/favorite-request-turned.json";
import request from "@shaperoute/shared-types/fixtures/favorite-request.json";
import turnedFavorite from "@shaperoute/shared-types/fixtures/favorite-turned.json";
import favorite from "@shaperoute/shared-types/fixtures/favorite.json";
import favorites from "@shaperoute/shared-types/fixtures/favorites.json";

import { answers, apiError } from "../account/testing";
import {
  asBefore,
  type FavoriteRequest,
  isFavorite,
  isFavoriteDetail,
  keepFavorite,
  withoutTurn,
} from "./favorites";

const URL = "http://api";
const TOKEN = "the-token";
const ID = favorite.id;

test("the turned examples of the API are what the app reads", () => {
  expect(isFavoriteDetail(turnedFavorite)).toBe(true);
  expect(turnedFavorite.rotation_deg).toBe(-30);
  const [kept] = favorites.favorites;
  expect(isFavorite({ ...kept, rotation_deg: -30 })).toBe(true);
  expect(isFavorite({ ...kept, rotation_deg: null })).toBe(true);
  expect(isFavorite({ ...kept, rotation_deg: "-30" })).toBe(false);
});

test("the request of an older app has no turn; one without a turn is as it is", () => {
  const typed = turnedRequest as FavoriteRequest;
  expect(withoutTurn(typed)).toEqual(request);
  expect("rotation_deg" in withoutTurn(typed)).toBe(false);
  const plain = request as FavoriteRequest;
  expect(withoutTurn(plain)).toBe(plain);
  // As an app before TASK-199 sent it: no turn either.
  expect(asBefore(typed)).toEqual(request);
  expect(asBefore({ ...typed, activity: "cycling" })).toEqual(request);
});

test("a turned route an older API refuses is kept without its turn", async () => {
  const [kept] = favorites.favorites;
  const refused = {
    status: 422,
    body: apiError("invalid_request", "rotation_deg: Extra inputs are not permitted"),
  };
  const fetchFn: jest.Mock = answers(refused, { status: 201, body: kept });
  const turned = turnedRequest as FavoriteRequest;
  expect(await keepFavorite(URL, TOKEN, ID, turned, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: kept,
  });
  expect(fetchFn).toHaveBeenCalledTimes(2);
  expect(String(fetchFn.mock.calls[0][1]?.body)).toBe(JSON.stringify(turnedRequest));
  expect(String(fetchFn.mock.calls[1][1]?.body)).toBe(JSON.stringify(request));
});

test("a turned bike route: without the turn, then as an older app sends it", async () => {
  const [kept] = favorites.favorites;
  const refused = {
    status: 422,
    body: apiError("invalid_request", "Extra inputs are not permitted"),
  };
  const bike = { ...turnedRequest, activity: "cycling" } as FavoriteRequest;
  const fetchFn: jest.Mock = answers(refused, refused, { status: 201, body: kept });
  expect(await keepFavorite(URL, TOKEN, ID, bike, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: kept,
  });
  expect(fetchFn).toHaveBeenCalledTimes(3);
  const { rotation_deg: _turn, ...byBike } = bike;
  expect(String(fetchFn.mock.calls[1][1]?.body)).toBe(JSON.stringify(byBike));
  expect(String(fetchFn.mock.calls[2][1]?.body)).toBe(JSON.stringify(request));
});

test("a route kept with its turn is not sent again", async () => {
  const [kept] = favorites.favorites;
  const fetchFn: jest.Mock = answers({
    status: 201,
    body: { ...kept, rotation_deg: -30 },
  });
  const turned = turnedRequest as FavoriteRequest;
  const outcome = await keepFavorite(URL, TOKEN, ID, turned, { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "ok", value: { rotation_deg: -30 } });
  expect(fetchFn).toHaveBeenCalledTimes(1);
});
