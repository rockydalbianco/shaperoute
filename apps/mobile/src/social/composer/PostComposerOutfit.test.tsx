/**
 * «Tag what you wear» in the composer (TASK-394 part B): under the photo
 * chosen, where the screen hands down the items; its form, a tap on the
 * photo, the item, the brand, the model and the link, with what the API
 * would refuse said at once; 5 on a photo and 10 in a post.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { OutfitTaggingContext, type OutfitTagging } from "../outfit/OutfitTagging";
import type { OutfitDraft } from "../outfit/outfitTags";
import { type ComposerPhoto, PostComposer } from "./PostComposer";
import type { PostItem } from "./postOrder";

jest.mock("expo-file-system");
jest.mock("react-native-view-shot");
jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const photo = (n: number): ComposerPhoto => ({
  n,
  source: { uri: `data:image/jpeg;base64,P${n}` },
  layout: null,
  original: null,
});
const ITEMS: PostItem[] = [
  { kind: "drawing" },
  { kind: "photo", n: 1 },
  { kind: "photo", n: 2 },
];
const SHOES: OutfitDraft = {
  id: "t1",
  x: 0.5,
  y: 0.9,
  item: "shoes",
  brand: "Nike",
  product_name: null,
  url: null,
};

function tagging(setup: Partial<OutfitTagging> = {}): OutfitTagging {
  return {
    tagsOf: () => [],
    setTags: jest.fn(() => true),
    refusedOf: () => null,
    brands: [],
    ...setup,
  };
}

async function shown(value: OutfitTagging | null) {
  await render(
    <OutfitTaggingContext.Provider value={value}>
      <PostComposer
        items={ITEMS}
        photos={[photo(1), photo(2)]}
        onOrder={jest.fn()}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
      />
    </OutfitTaggingContext.Provider>,
  );
}

async function openForm() {
  await fireEvent.press(screen.getByTestId("tile-photo-1"));
  await fireEvent.press(screen.getByRole("button", { name: "Tag what you wear" }));
  expect(screen.getByText("Tap what you're wearing on the photo.")).toBeOnTheScreen();
}

/** A tap on the photo of the form at (`x`, `y`) points of its box. */
async function tapPhoto(x: number, y: number) {
  await fireEvent.press(screen.getByTestId("outfit-photo"), {
    nativeEvent: { locationX: x, locationY: y },
  });
}

async function done() {
  await fireEvent.press(screen.getByTestId("outfit-editor-done"));
}

test("without the items handed down, no «Tag what you wear»", async () => {
  await shown(null);
  await fireEvent.press(screen.getByTestId("tile-photo-1"));
  expect(screen.queryByText("Tag what you wear")).toBeNull();
});

test("only under a photo chosen", async () => {
  await shown(tagging());
  expect(screen.queryByText("Tag what you wear")).toBeNull();
  await fireEvent.press(screen.getByTestId("tile-photo-1"));
  expect(screen.getByText("Tag what you wear")).toBeOnTheScreen();
});

test("a tap on the photo, an item and a brand: kept where it was put", async () => {
  const value = tagging({ brands: ["Nike", "Asics"] });
  await shown(value);
  await openForm();
  // The box is the screen less its sides (750 − 32) wide, at 4:5.
  await tapPhoto(359, 449);
  expect(screen.getByTestId("outfit-dot-new")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("radio", { name: "Top" }));
  // A brand used before, one touch.
  await fireEvent.press(screen.getByRole("button", { name: "Asics" }));
  await fireEvent.changeText(screen.getByTestId("outfit-model"), " Hyper Speed ");
  await fireEvent.press(screen.getByTestId("outfit-add"));
  expect(screen.getByRole("button", { name: "Top, Asics" })).toBeOnTheScreen();
  await done();
  await waitFor(() =>
    expect(value.setTags).toHaveBeenCalledWith(1, [
      {
        id: null,
        x: 0.5,
        y: 0.5,
        item: "top",
        brand: "Asics",
        product_name: "Hyper Speed",
        url: null,
      },
    ]),
  );
});

test("«Add» waits for a brand; a wrong link is said at once and not kept", async () => {
  const value = tagging();
  await shown(value);
  await openForm();
  await tapPhoto(100, 100);
  expect(screen.getByTestId("outfit-add")).toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("outfit-brand"), "Nike");
  await fireEvent.changeText(screen.getByTestId("outfit-url"), "http://nike.com/p");
  await fireEvent.press(screen.getByTestId("outfit-add"));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Use a link that starts with https://",
  );
  await fireEvent.changeText(screen.getByTestId("outfit-url"), "https://bit.ly/x");
  await fireEvent.press(screen.getByTestId("outfit-add"));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Short links can't be used: paste the shop's full link.",
  );
  await fireEvent.changeText(screen.getByTestId("outfit-url"), "");
  await fireEvent.changeText(screen.getByTestId("outfit-model"), "see www.nike.com");
  await fireEvent.press(screen.getByTestId("outfit-add"));
  expect(screen.getByRole("alert")).toHaveTextContent("Put the link in the link box.");
});

test("a dot tapped changes its item, or goes; nothing changed keeps nothing", async () => {
  const value = tagging({ tagsOf: (n) => (n === 1 ? [SHOES] : []) });
  await shown(value);
  await openForm();
  await done();
  // Down, then gone.
  await waitFor(() => expect(screen.queryByTestId("outfit-editor")).toBeNull());
  expect(value.setTags).not.toHaveBeenCalled();
  // The photo is still the one chosen.
  await fireEvent.press(screen.getByRole("button", { name: "Tag what you wear" }));
  // A dot takes the finger itself (it is dragged): VoiceOver's tap opens it.
  await fireEvent(
    screen.getByRole("button", { name: "Shoes, Nike" }),
    "accessibilityTap",
  );
  expect(screen.getByTestId("outfit-brand").props.value).toBe("Nike");
  await fireEvent.press(screen.getByTestId("outfit-remove"));
  expect(screen.queryByRole("button", { name: "Shoes, Nike" })).toBeNull();
  await done();
  await waitFor(() => expect(value.setTags).toHaveBeenCalledWith(1, []));
});

test("5 on a photo, 10 in a post", async () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ ...SHOES, id: `t${i}` }));
  await shown(tagging({ tagsOf: (n) => (n === 1 ? five : []) }));
  await openForm();
  await tapPhoto(10, 10);
  expect(screen.getByRole("alert")).toHaveTextContent("Up to 5 items on a photo.");
  expect(screen.queryByTestId("outfit-form")).toBeNull();
  await screen.unmount();
  await shown(
    tagging({
      tagsOf: (n) => (n === 1 ? five.slice(0, 2) : [...five, ...five.slice(0, 3)]),
    }),
  );
  await openForm();
  await tapPhoto(10, 10);
  expect(screen.getByRole("alert")).toHaveTextContent("Up to 10 items in a post.");
});

test("items the API refused say why under the button", async () => {
  await shown(tagging({ refusedOf: (n) => (n === 1 ? "blocked" : null) }));
  await fireEvent.press(screen.getByTestId("tile-photo-1"));
  expect(screen.getByRole("alert")).toHaveTextContent("MuW can't open this link.");
});
