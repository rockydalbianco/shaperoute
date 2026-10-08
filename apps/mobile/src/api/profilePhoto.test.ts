import photo from "@shaperoute/shared-types/fixtures/profile-photo.json";

import { answers, apiError } from "../account/testing";
import {
  fetchPhoto,
  isProfilePhoto,
  photoUri,
  removePhoto,
  savePhoto,
} from "./profilePhoto";

const URL = "http://api";
const TOKEN = "the-token";
const AUTH = { Authorization: `Bearer ${TOKEN}` };

test("the example of the API is what the app reads", () => {
  expect(isProfilePhoto(photo)).toBe(true);
  expect(Object.keys(photo).sort()).toEqual(["image", "updated_at"]);
  expect(isProfilePhoto({ ...photo, image: "" })).toBe(false);
  expect(isProfilePhoto({ image: photo.image })).toBe(false);
  expect(isProfilePhoto(null)).toBe(false);
});

test("the picture shows as it came: a JPEG in the address itself", () => {
  expect(photoUri(photo)).toBe(`data:image/jpeg;base64,${photo.image}`);
});

test("the picture is asked with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: photo });
  const outcome = await fetchPhoto(URL, TOKEN, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: photo });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/photo");
  expect(init).toMatchObject({ method: "GET", headers: AUTH });
});

test("no picture, or an API from before the pictures, is no picture", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  expect(await fetchPhoto(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
});

test("a session that ended and an API out of reach are told apart", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 401, body: apiError("session_expired") },
    new Error("offline"),
    { status: 200, body: { image: 7 } },
  );
  expect(await fetchPhoto(URL, TOKEN, { fetchFn, key: null })).toMatchObject({
    kind: "api_error",
    code: "session_expired",
  });
  expect(await fetchPhoto(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "unreachable",
    url: URL,
  });
  expect(await fetchPhoto(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "bad_answer",
    status: 200,
  });
});

test("saving sends the picture in base64, and gets it back as kept", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: photo });
  const outcome = await savePhoto(URL, TOKEN, "aGVsbG8=", { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: photo });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/photo");
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual({ image: "aGVsbG8=" });
});

test("a picture the API refuses comes back with its reason", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 422, body: apiError("invalid_request", "image: cannot read") },
    { status: 404, body: apiError("http_error", "Not Found") },
  );
  expect(await savePhoto(URL, TOKEN, "aGVsbG8=", { fetchFn, key: null })).toMatchObject(
    {
      kind: "api_error",
      code: "invalid_request",
      message: "image: cannot read",
    },
  );
  // Saving on an API from before the pictures is a failure, not «no picture».
  expect(await savePhoto(URL, TOKEN, "aGVsbG8=", { fetchFn, key: null })).toMatchObject(
    {
      kind: "api_error",
      code: "http_error",
    },
  );
});

test("removing asks with the token and gets nothing back", async () => {
  const fetchFn: jest.Mock = answers({ status: 204 });
  expect(await removePhoto(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: null,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/photo");
  expect(init).toMatchObject({ method: "DELETE", headers: AUTH });
});
