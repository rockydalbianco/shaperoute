import editRequest from "@shaperoute/shared-types/fixtures/edit-profile-request.json";
import type { PublicProfile } from "@shaperoute/shared-types";
import publicProfile from "@shaperoute/shared-types/fixtures/public-profile.json";
import session from "@shaperoute/shared-types/fixtures/session.json";

import { answers, apiError } from "../account/testing";
import { isUser } from "./accounts";
import {
  editProfile,
  fetchProfile,
  isPublicProfile,
  profilePhotoUri,
} from "./profiles";

const URL = "http://api";
const TOKEN = "the-token";
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const ID = publicProfile.public_id;
// The JSON says `follow` is a string; the API sends one of FOLLOW_STATES.
const SEEN: PublicProfile = { ...publicProfile, follow: "following" };

test("the examples of the API are what the app reads", () => {
  expect(isPublicProfile(publicProfile)).toBe(true);
  expect(isPublicProfile({ ...publicProfile, photo: null })).toBe(true);
  expect(isPublicProfile({ ...publicProfile, drawings: "0" })).toBe(false);
  expect(isPublicProfile({ ...publicProfile, bio: undefined })).toBe(false);
  expect(isPublicProfile(null)).toBe(false);
  expect(isUser(session.user)).toBe(true);
});

test("a user from an API without profiles still reads, without bio and id", () => {
  const { bio: _bio, public_id: _id, ...before } = session.user;
  expect(isUser(before)).toBe(true);
});

test("the picture of a profile shows as it came, or not at all", () => {
  expect(profilePhotoUri(SEEN)).toBe(`data:image/jpeg;base64,${SEEN.photo}`);
  expect(profilePhotoUri({ ...SEEN, photo: null })).toBeNull();
});

test("a change of profile sends only what changes, with the token", async () => {
  const changed = { ...session.user, ...editRequest };
  const fetchFn: jest.Mock = answers({ status: 200, body: changed });
  const outcome = await editProfile(URL, TOKEN, editRequest, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: changed });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me");
  expect(init).toMatchObject({ method: "PATCH", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual(editRequest);
});

test("a change refused, or an API without profiles, comes back as such", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 409, body: apiError("username_taken") },
    { status: 405, body: apiError("http_error", "Method Not Allowed") },
    new Error("offline"),
  );
  const ask = () => editProfile(URL, TOKEN, { bio: "Hi" }, { fetchFn, key: null });
  expect(await ask()).toMatchObject({ kind: "api_error", code: "username_taken" });
  expect(await ask()).toMatchObject({ kind: "api_error", code: "http_error" });
  expect(await ask()).toEqual({ kind: "unreachable", url: URL });
});

test("someone's profile is asked by its id, with the token", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: publicProfile },
    { status: 404, body: apiError("http_error", "No profile with this id.") },
  );
  expect(await fetchProfile(URL, TOKEN, ID, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: publicProfile,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`http://api/users/${ID}`);
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
  expect(await fetchProfile(URL, TOKEN, "a/b", { fetchFn, key: null })).toMatchObject({
    kind: "api_error",
    code: "http_error",
  });
  // An id is never read as a path.
  expect(fetchFn.mock.calls[1][0]).toBe("http://api/users/a%2Fb");
});
