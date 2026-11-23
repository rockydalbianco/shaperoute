import type { OutfitTag } from "@shaperoute/shared-types";

import { answers, apiError } from "../../account/testing";
import {
  brandsUsed,
  forgetAllOutfitsOf,
  forgetOutfit,
  forgetOutfitsOf,
  keepOutfit,
  keepOutfits,
  loadOutfits,
  outfitOnPhone,
  outfitToSendAgain,
  syncOutfits,
} from "./outfitKept";
import type { OutfitDraft } from "./outfitTags";

jest.mock("expo-file-system", () =>
  jest.requireActual("./memoryFiles.testing").memoryFiles(),
);

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

const SHOES: OutfitDraft = {
  id: null,
  x: 0.5,
  y: 0.9,
  item: "shoes",
  brand: "Nike",
  product_name: "Pegasus 41",
  url: "https://www.nike.com/p",
};
const TOP: OutfitDraft = { ...SHOES, y: 0.4, item: "top", brand: "Asics", url: null };

/** The API's answer: the list as kept, with ids. */
function kept(...tags: OutfitDraft[]): { tags: OutfitTag[] } {
  return {
    tags: tags.map((tag, i) => ({
      id: tag.id ?? `new-${i}`,
      x: tag.x,
      y: tag.y,
      item: tag.item,
      brand: tag.brand,
      product_name: tag.product_name,
      store: tag.url === null ? null : "nike.com",
      url: tag.url,
      hidden: false,
      opens: 0,
      shops: 0,
    })),
  };
}

beforeEach(() => {
  files.clear();
});

test("the items of a photo are kept beside it, not sent yet", () => {
  expect(keepOutfit(1, "a", 2, [SHOES])).toBe(true);
  expect(outfitOnPhone(1, "a", 2)).toEqual({
    owner: 1,
    key: "a",
    n: 2,
    tags: [SHOES],
    sent: false,
    refused: null,
  });
  expect(outfitOnPhone(1, "a", 1)).toBeNull();
});

test("at the end of a run each photo keeps its items, from place 1", () => {
  keepOutfits(1, "a", [[SHOES], [], [TOP]]);
  expect(loadOutfits().map((item) => [item.n, item.tags])).toEqual([
    [1, [SHOES]],
    [3, [TOP]],
  ]);
});

test("the brands used, the latest first, once each", () => {
  keepOutfit(1, "a", 1, [SHOES]);
  keepOutfit(1, "b", 1, [TOP, { ...SHOES, brand: "nike" }]);
  keepOutfit(2, "c", 1, [{ ...SHOES, brand: "Hoka" }]);
  expect(brandsUsed(1)).toEqual(["Asics", "nike"]);
});

test("a photo gone takes its items; a run or an account, all of theirs", () => {
  keepOutfit(1, "a", 1, [SHOES]);
  keepOutfit(1, "a", 2, [TOP]);
  keepOutfit(1, "b", 1, [TOP]);
  keepOutfit(2, "c", 1, [TOP]);
  forgetOutfit(1, "a", 2);
  expect(loadOutfits().map((item) => `${item.owner}${item.key}${item.n}`)).toEqual([
    "1a1",
    "1b1",
    "2c1",
  ]);
  forgetOutfitsOf(1, "a");
  expect(loadOutfits().map((item) => item.key)).toEqual(["b", "c"]);
  forgetAllOutfitsOf(1);
  expect(loadOutfits().map((item) => item.key)).toEqual(["c"]);
});

test("while others see the run, the items go after the photos, with their ids back", async () => {
  keepOutfit(1, "a", 2, [SHOES, TOP]);
  const fetchFn = answers({ status: 200, body: kept(SHOES, TOP) });
  expect(await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(fetchFn.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
    ["http://api/me/activities/a/drawing/photos/2/tags", "PUT"],
  ]);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({
    tags: [
      {
        x: 0.5,
        y: 0.9,
        item: "shoes",
        brand: "Nike",
        product_name: "Pegasus 41",
        url: "https://www.nike.com/p",
      },
      {
        x: 0.5,
        y: 0.4,
        item: "top",
        brand: "Asics",
        product_name: "Pegasus 41",
        url: null,
      },
    ],
  });
  const now = outfitOnPhone(1, "a", 2);
  expect(now?.sent).toBe(true);
  expect(now?.tags.map((tag) => tag.id)).toEqual(["new-0", "new-1"]);
  // Sent again, they go with their ids: they keep their counts.
  outfitToSendAgain(1, "a", 2);
  const again = answers({ status: 200, body: kept(...(now?.tags ?? [])) });
  await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(again));
  expect(
    JSON.parse(String(again.mock.calls[0][1]?.body)).tags.map(
      (tag: { id: string }) => tag.id,
    ),
  ).toEqual(["new-0", "new-1"]);
});

test("a list sent goes no more; with «Only me» it waits on the phone", async () => {
  keepOutfit(1, "a", 1, [SHOES]);
  await syncOutfits(
    URL,
    TOKEN,
    1,
    "a",
    "followers",
    options(answers({ status: 200, body: kept(SHOES) })),
  );
  const none = answers();
  expect(await syncOutfits(URL, TOKEN, 1, "a", "followers", options(none))).toBe(
    "done",
  );
  expect(none).not.toHaveBeenCalled();
  expect(await syncOutfits(URL, TOKEN, 1, "a", "only_me", options(none))).toBe("done");
  expect(none).not.toHaveBeenCalled();
  expect(outfitOnPhone(1, "a", 1)?.sent).toBe(false);
});

test("a list refused for a reason stays with it, and waits for a change", async () => {
  keepOutfit(1, "a", 1, [SHOES]);
  const fetchFn = answers({
    status: 422,
    body: {
      error: {
        code: "outfit_tag_rejected",
        message: "MuW can't open this link.",
        suggested_distance_m: null,
        reason: "blocked",
      },
    },
  });
  expect(await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(outfitOnPhone(1, "a", 1)).toMatchObject({ sent: false, refused: "blocked" });
  const none = answers();
  await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(none));
  expect(none).not.toHaveBeenCalled();
  // Changed, it goes again.
  keepOutfit(1, "a", 1, [{ ...SHOES, url: null }]);
  expect(outfitOnPhone(1, "a", 1)?.refused).toBeNull();
});

test("no network waits; what the API never takes is let go", async () => {
  keepOutfit(1, "a", 1, [SHOES]);
  keepOutfit(1, "a", 2, [TOP]);
  expect(
    await syncOutfits(
      URL,
      TOKEN,
      1,
      "a",
      "everyone",
      options(answers(new TypeError("offline"))),
    ),
  ).toBe("waits");
  expect(loadOutfits()).toHaveLength(2);
  const fetchFn = answers(
    { status: 404, body: apiError("http_error") },
    { status: 200, body: kept(TOP) },
  );
  expect(await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(loadOutfits().map((item) => [item.n, item.sent])).toEqual([[2, true]]);
});

test("a session ended stops the round", async () => {
  keepOutfit(1, "a", 1, [SHOES]);
  const fetchFn = answers({ status: 401, body: apiError("not_signed_in") });
  expect(await syncOutfits(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "session_ended",
  );
});
