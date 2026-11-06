import request from "@shaperoute/shared-types/fixtures/outfit-tags-request.json";

import { answers, apiError } from "../account/testing";
import { countOutfitOpen, fetchOutfitShop, saveOutfitTags } from "./outfitTags";

const URL = "http://api";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

test("the whole list of a photo goes to its place, with the session", async () => {
  const fetchFn = answers({ status: 200, body: { tags: [] } });
  const outcome = await saveOutfitTags(
    URL,
    "tok",
    "run 1",
    3,
    request.tags as Parameters<typeof saveOutfitTags>[4],
    options(fetchFn),
  );
  expect(outcome).toEqual({ kind: "ok", value: { tags: [] } });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/activities/run%201/drawing/photos/3/tags");
  expect(init?.method).toBe("PUT");
  expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  expect(JSON.parse(String(init?.body))).toEqual({ tags: request.tags });
});

test("a refusal comes back with its reason", async () => {
  const fetchFn = answers({
    status: 422,
    body: { error: { ...apiError("outfit_tag_rejected").error, reason: "shortened" } },
  });
  const outcome = await saveOutfitTags(URL, "tok", "a", 1, [], options(fetchFn));
  expect(outcome).toMatchObject({
    kind: "api_error",
    code: "outfit_tag_rejected",
    reason: "shortened",
  });
});

test("an item opened is counted, and nothing fails for the user", async () => {
  const fetchFn = answers({ status: 204 });
  await countOutfitOpen(URL, "tok", "t1", options(fetchFn));
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/outfit-tags/t1/open");
  expect(fetchFn.mock.calls[0][1]?.method).toBe("POST");
  await expect(
    countOutfitOpen(URL, "tok", "t1", options(answers(new TypeError("offline")))),
  ).resolves.toBeUndefined();
});

test("«Shop» answers the page to open, an https one only", async () => {
  expect(
    await fetchOutfitShop(
      URL,
      "tok",
      "t1",
      options(answers({ status: 200, body: { url: "https://nike.com/p" } })),
    ),
  ).toEqual({ kind: "ok", value: "https://nike.com/p" });
  expect(
    await fetchOutfitShop(
      URL,
      "tok",
      "t1",
      options(answers({ status: 200, body: { url: null } })),
    ),
  ).toEqual({ kind: "ok", value: null });
  expect(
    await fetchOutfitShop(
      URL,
      "tok",
      "t1",
      options(answers({ status: 200, body: { url: "javascript:alert(1)" } })),
    ),
  ).toEqual({ kind: "ok", value: null });
});
