import favorite from "@shaperoute/shared-types/fixtures/favorite.json";
import request from "@shaperoute/shared-types/fixtures/favorite-request.json";
import favorites from "@shaperoute/shared-types/fixtures/favorites.json";

import { answers, apiError } from "../account/testing";
import {
  type FavoriteRequest,
  fetchFavorite,
  fetchFavorites,
  isFavorite,
  isFavoriteDetail,
  keepFavorite,
  removeFavorite,
} from "./favorites";

const URL = "http://api";
const TOKEN = "the-token";
const ID = favorite.id;
const AUTH = { Authorization: `Bearer ${TOKEN}` };

test("the examples of the API are what the app reads", () => {
  expect(favorites.favorites.every(isFavorite)).toBe(true);
  expect(isFavoriteDetail(favorite)).toBe(true);
  // The request has the fields of the type, no more and no fewer.
  const typed: FavoriteRequest = request as FavoriteRequest;
  expect(Object.keys(typed).sort()).toEqual(
    [
      "city",
      "distance_m",
      "points",
      "route_m",
      "shape",
      "similarity",
      "style",
      "title",
      "word",
    ].sort(),
  );
});

test("the list is asked with the token, and comes as the favorites", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: favorites });
  const outcome = await fetchFavorites(URL, TOKEN, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: favorites.favorites });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/favorites");
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("one favorite comes whole", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: favorite });
  const outcome = await fetchFavorite(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: favorite });
  expect(fetchFn.mock.calls[0][0]).toBe(`http://api/me/favorites/${ID}`);
});

test("keeping sends the route under its key; new or already kept is the same", async () => {
  const [kept] = favorites.favorites;
  const fetchFn: jest.Mock = answers(
    { status: 201, body: kept },
    { status: 200, body: kept },
  );
  const body = request as FavoriteRequest;
  for (let i = 0; i < 2; i += 1) {
    const outcome = await keepFavorite(URL, TOKEN, ID, body, { fetchFn, key: null });
    expect(outcome).toEqual({ kind: "ok", value: kept });
  }
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/me/favorites/${ID}`);
  expect(init).toMatchObject({
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
  });
  expect(JSON.parse(String(init?.body))).toEqual(request);
});

test("removing answers with nothing", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  const outcome = await removeFavorite(URL, TOKEN, ID, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: null });
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "DELETE", headers: AUTH });
});

test("an error, no API, and an answer that is not one are told apart", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 401, body: apiError("session_expired") },
    new Error("offline"),
    { status: 200, body: { favorites: [{ id: 1 }] } },
    { status: 200, body: { ...favorite, points: [[46.0, 11.0]] } },
  );
  const options = { fetchFn, key: null };
  expect(await fetchFavorites(URL, TOKEN, options)).toMatchObject({
    kind: "api_error",
    code: "session_expired",
  });
  expect(await fetchFavorites(URL, TOKEN, options)).toEqual({
    kind: "unreachable",
    url: URL,
  });
  expect(await fetchFavorites(URL, TOKEN, options)).toEqual({
    kind: "bad_answer",
    status: 200,
  });
  expect(await fetchFavorite(URL, TOKEN, ID, options)).toEqual({
    kind: "bad_answer",
    status: 200,
  });
});
