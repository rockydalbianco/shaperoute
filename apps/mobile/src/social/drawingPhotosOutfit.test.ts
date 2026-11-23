import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";

import { answers } from "../account/testing";
import {
  forgetAllPhotosOf,
  forgetPhotosOf,
  keepPhoto,
  removePhoto,
  syncPhotos,
} from "./drawingPhotos";
import { keepOutfit, loadOutfits, outfitOnPhone } from "./outfit/outfitKept";
import type { OutfitDraft } from "./outfit/outfitTags";

// The items tagged on the photos follow the photos (TASK-394 part B).

jest.mock("expo-file-system", () =>
  jest.requireActual("./outfit/memoryFiles.testing").memoryFiles(),
);

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });

const SHOES: OutfitDraft = {
  id: "t1",
  x: 0.5,
  y: 0.9,
  item: "shoes",
  brand: "Nike",
  product_name: null,
  url: null,
};
const KEPT = {
  tags: [
    {
      ...SHOES,
      store: null,
      hidden: false,
      opens: 0,
      shops: 0,
    },
  ],
};

beforeEach(() => {
  files.clear();
});

test("the photo goes first, then its items", async () => {
  keepPhoto(1, "a", 1, "AAAA");
  keepOutfit(1, "a", 1, [SHOES]);
  const fetchFn = answers(
    { status: 200, body: myDrawing },
    { status: 200, body: KEPT },
  );
  expect(
    await syncPhotos("http://api", "tok", 1, "a", "everyone", options(fetchFn)),
  ).toBe("done");
  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
    "http://api/me/activities/a/drawing/photos/1",
    "http://api/me/activities/a/drawing/photos/1/tags",
  ]);
  expect(outfitOnPhone(1, "a", 1)?.sent).toBe(true);
});

test("a photo that waits keeps its items waiting too", async () => {
  keepPhoto(1, "a", 1, "AAAA");
  keepOutfit(1, "a", 1, [SHOES]);
  const fetchFn = answers(new TypeError("offline"));
  expect(
    await syncPhotos("http://api", "tok", 1, "a", "everyone", options(fetchFn)),
  ).toBe("waits");
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(outfitOnPhone(1, "a", 1)?.sent).toBe(false);
});

test("items on a photo of the API alone go too", async () => {
  keepOutfit(1, "a", 2, [SHOES]);
  const fetchFn = answers({ status: 200, body: KEPT });
  await syncPhotos("http://api", "tok", 1, "a", "followers", options(fetchFn));
  expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
    "http://api/me/activities/a/drawing/photos/2/tags",
  ]);
});

test("a picture kept anew in the place sends its items again", async () => {
  keepPhoto(1, "a", 1, "AAAA");
  keepOutfit(1, "a", 1, [SHOES]);
  await syncPhotos(
    "http://api",
    "tok",
    1,
    "a",
    "everyone",
    options(answers({ status: 200, body: myDrawing }, { status: 200, body: KEPT })),
  );
  // A layout chosen: a different JPEG, which loses its items on the API.
  keepPhoto(1, "a", 1, "BBBB");
  expect(outfitOnPhone(1, "a", 1)?.sent).toBe(false);
});

test("a photo taken off takes its items; a run or an account, all", () => {
  keepPhoto(1, "a", 1, "AAAA");
  keepPhoto(1, "a", 2, "BBBB");
  keepOutfit(1, "a", 1, [SHOES]);
  keepOutfit(1, "a", 2, [SHOES]);
  keepOutfit(1, "b", 1, [SHOES]);
  keepOutfit(2, "c", 1, [SHOES]);
  removePhoto(1, "a", 1, false);
  expect(outfitOnPhone(1, "a", 1)).toBeNull();
  forgetPhotosOf(1, "a");
  expect(loadOutfits().map((item) => item.key)).toEqual(["b", "c"]);
  forgetAllPhotosOf(1);
  expect(loadOutfits().map((item) => item.key)).toEqual(["c"]);
});
