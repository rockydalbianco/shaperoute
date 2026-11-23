import type { DrawingPhoto, OutfitTag } from "@shaperoute/shared-types";
import { act, renderHook } from "@testing-library/react-native";

import { keepOutfit, outfitOnPhone } from "./outfitKept";
import { useChosenOutfits, useRunOutfits } from "./OutfitTagging";
import type { OutfitDraft } from "./outfitTags";

// What the composer is handed to tag the items (TASK-394 part B): at the
// end of a run, held until «Save»; on a run of «My activities», this phone's
// or the API's, and a change kept here and sent.

jest.mock("expo-file-system", () =>
  jest.requireActual("./memoryFiles.testing").memoryFiles(),
);

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");

const SHOES: OutfitDraft = {
  id: "t1",
  x: 0.5,
  y: 0.9,
  item: "shoes",
  brand: "Nike",
  product_name: null,
  url: "https://nike.com/p",
};
const ON_API: OutfitTag = {
  ...SHOES,
  id: "t7",
  brand: "Hoka",
  store: "nike.com",
  hidden: false,
  opens: 2,
  shops: 1,
};
const PHOTOS: DrawingPhoto[] = [
  { n: 1, url: "/p/1", width: 800, height: 1000, outfit_tags: [ON_API] },
  { n: 2, url: "/p/2", width: 800, height: 1000 },
];

beforeEach(() => {
  files.clear();
});

test("nobody signed in, nothing to tag", async () => {
  const run = await renderHook(() => useRunOutfits(null, "a", PHOTOS, jest.fn()));
  expect(run.result.current).toBeNull();
  const end = await renderHook(() => useChosenOutfits(null));
  expect(end.result.current.tagging).toBeNull();
});

test("a run's items: the phone's, else the API's, with the owner's link", async () => {
  keepOutfit(7, "a", 2, [SHOES]);
  const { result } = await renderHook(() => useRunOutfits(7, "a", PHOTOS, jest.fn()));
  expect(result.current?.tagsOf(1)).toEqual([
    {
      id: "t7",
      x: 0.5,
      y: 0.9,
      item: "shoes",
      brand: "Hoka",
      product_name: null,
      url: "https://nike.com/p",
    },
  ]);
  expect(result.current?.tagsOf(2)).toEqual([SHOES]);
  expect(result.current?.tagsOf(3)).toEqual([]);
  expect(result.current?.brands).toEqual(["Nike"]);
});

test("a change is kept on the phone, then sent", async () => {
  const changed = jest.fn();
  const { result } = await renderHook(() => useRunOutfits(7, "a", PHOTOS, changed));
  await act(async () => {
    expect(result.current?.setTags(1, [SHOES])).toBe(true);
  });
  expect(outfitOnPhone(7, "a", 1)?.tags).toEqual([SHOES]);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(result.current?.tagsOf(1)).toEqual([SHOES]);
});

test("a refusal of the API is told for its photo", async () => {
  files.set(
    "file:///documents/drawing-outfits.json",
    JSON.stringify([
      { owner: 7, key: "a", n: 1, tags: [SHOES], sent: false, refused: "words" },
    ]),
  );
  const { result } = await renderHook(() => useRunOutfits(7, "a", PHOTOS, jest.fn()));
  expect(result.current?.refusedOf(1)).toBe("words");
  expect(result.current?.refusedOf(2)).toBeNull();
});

test("at the end of a run, held by place until «Save», and let go with the photo", async () => {
  const { result } = await renderHook(() => useChosenOutfits(7));
  await act(async () => {
    result.current.tagging?.setTags(2, [SHOES]);
  });
  expect(result.current.outfitOf(2)).toEqual([SHOES]);
  expect(result.current.tagging?.tagsOf(2)).toEqual([SHOES]);
  // Nothing on the phone before «Save».
  expect(files.size).toBe(0);
  await act(async () => result.current.forget(2));
  expect(result.current.outfitOf(2)).toEqual([]);
});
