import together from "@shaperoute/shared-types/fixtures/together.json";

import { answers, apiError } from "../account/testing";
import { fetchTogether, hasCompany, isTogetherPage } from "./together";

const URL = "http://api";
const TOKEN = "the-token";
const DRAWING = "3f9d2c71-8a4b-4e06-b5d1-c27e9a40f815";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the example of the API is what the app reads", () => {
  expect(isTogetherPage(together)).toBe(true);
  expect(hasCompany(together as Parameters<typeof hasCompany>[0])).toBe(true);
  const [first] = together.people;
  const one = { people: [first] };
  expect(isTogetherPage(one)).toBe(true);
  expect(hasCompany(one as Parameters<typeof hasCompany>[0])).toBe(false);
});

test("a page that does not hold together is refused", () => {
  const [first] = together.people;
  expect(isTogetherPage({ people: [] })).toBe(false);
  expect(isTogetherPage({ people: [{ ...first, seconds: [0] }] })).toBe(false);
  expect(
    isTogetherPage({ people: [{ ...first, seconds: [...first.seconds].reverse() }] }),
  ).toBe(false);
  expect(isTogetherPage({ people: [{ ...first, points: [[46, "11"]] }] })).toBe(false);
  expect(
    isTogetherPage({ people: [{ ...first, pauses: [{ from_s: 9, to_s: 3 }] }] }),
  ).toBe(false);
  expect(isTogetherPage({ people: [{ ...first, started_at: undefined }] })).toBe(true);
});

test("the tracks are asked with the token, by the drawing's id", async () => {
  const fetchFn = answers({ status: 200, body: together });
  const outcome = await fetchTogether(URL, TOKEN, DRAWING, options(fetchFn));
  expect(outcome).toEqual({ kind: "ok", value: together });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/drawings/${DRAWING}/together`);
  expect(init).toMatchObject({
    method: "GET",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
});

test("somebody else's post, or an API of before, is a 404", async () => {
  const fetchFn = answers({
    status: 404,
    body: apiError("http_error", "No drawing with this id."),
  });
  const outcome = await fetchTogether(URL, TOKEN, DRAWING, options(fetchFn));
  expect(outcome).toMatchObject({ kind: "api_error", code: "http_error" });
});
