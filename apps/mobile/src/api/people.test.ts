import people from "@shaperoute/shared-types/fixtures/people.json";

import { answers, apiError } from "../account/testing";
import {
  findPeople,
  isPeopleFound,
  isPerson,
  peopleQuery,
  personPhotoUri,
  searchable,
} from "./people";

const URL = "http://api";
const TOKEN = "the-token";
const [ada, adam] = people.people;

test("the example of the API is what the app reads", () => {
  expect(isPeopleFound(people)).toBe(true);
  expect(isPeopleFound({ people: [] })).toBe(true);
  expect(isPeopleFound({ people: [{ ...ada, photo: 1 }] })).toBe(false);
  expect(isPeopleFound({ people: null })).toBe(false);
  expect(isPeopleFound(null)).toBe(false);
  expect(isPerson({ ...adam, username: undefined })).toBe(false);
});

test("the API looks for two letters or more, the spaces at the ends left out", () => {
  expect(peopleQuery("  ada ")).toBe("ada");
  expect(searchable("a")).toBe(false);
  expect(searchable(" a ")).toBe(false);
  expect(searchable("ad")).toBe(true);
  expect(searchable("a d")).toBe(true);
});

test("a search sends the name typed, trimmed and escaped, with the token", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: people });
  const outcome = await findPeople(URL, TOKEN, " ada & co ", { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: people });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/users?q=ada%20%26%20co");
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
});

test("an API without the search says so as an http_error", async () => {
  const fetchFn: jest.Mock = answers({
    status: 404,
    body: apiError("http_error", "Not Found"),
  });
  const outcome = await findPeople(URL, TOKEN, "ada", { fetchFn, key: null });
  expect(outcome).toMatchObject({ kind: "api_error", code: "http_error" });
});

test("the picture of a member shows as it came, or not at all", () => {
  expect(personPhotoUri(ada)).toBe(`data:image/jpeg;base64,${ada.photo}`);
  expect(personPhotoUri(adam)).toBeNull();
});
