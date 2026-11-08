import { fireEvent, render, screen } from "@testing-library/react-native";

import { CATALOG, type CatalogRoute } from "./catalog";
import { CatalogEntry, ENTRY_THUMBS, entryThumbs } from "./CatalogEntry";

// The way into the catalog from «Explore» (TASK-420).

test("the strip shows the best of five different figures", () => {
  const thumbs = entryThumbs(CATALOG);
  expect(thumbs).toHaveLength(ENTRY_THUMBS);
  const figures = thumbs.map((r) => r.word ?? r.shape);
  expect(new Set(figures).size).toBe(ENTRY_THUMBS);
  // Each is the best of its figure.
  for (const thumb of thumbs) {
    const figure = thumb.word ?? thumb.shape;
    const best = Math.max(
      ...CATALOG.filter((r) => (r.word ?? r.shape) === figure).map((r) => r.similarity),
    );
    expect(thumb.similarity).toBe(best);
  }
  // Fewer figures than places: as many as there are.
  const two: CatalogRoute[] = CATALOG.filter(
    (r) => r.shape === "heart" || r.shape === "star",
  );
  expect(entryThumbs(two)).toHaveLength(2);
});

test("the card says its name and how much it holds, and opens", async () => {
  const onPress = jest.fn();
  await render(<CatalogEntry width={358} onPress={onPress} />);
  expect(screen.getByText("Catalog")).toBeOnTheScreen();
  expect(
    screen.getByText(`${CATALOG.length} drawings in 23 cities · filters, search`),
  ).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", {
      name: `Catalog, ${CATALOG.length} drawings in 23 cities · filters, search`,
    }),
  );
  expect(onPress).toHaveBeenCalled();
});

test("one drawing, one city: in the singular", async () => {
  await render(<CatalogEntry width={358} onPress={jest.fn()} routes={[CATALOG[0]]} />);
  expect(screen.getByText("1 drawing in 1 cities · filters, search")).toBeOnTheScreen();
});
