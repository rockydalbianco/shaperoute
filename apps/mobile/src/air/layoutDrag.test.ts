import type { Page } from "./flightLayout";
import { dropSpot, dropWidget, stretchSize, stretchWidget } from "./layoutDrag";

const GRID = { cellW: 90, cellH: 100, gap: 6 };

// Two widgets side by side on the top row, a big one under them.
const PAGE: Page = [
  { widget: "altitude", col: 0, row: 0, w: 2, h: 1 },
  { widget: "vario", col: 2, row: 0, w: 2, h: 1 },
  { widget: "map", col: 0, row: 1, w: 4, h: 3 },
];

describe("dropSpot", () => {
  it("lands on the nearest cell", () => {
    expect(dropSpot(PAGE[0], 0, 0, GRID)).toEqual({ col: 0, row: 0 });
    // Past half a cell: the next one.
    expect(dropSpot(PAGE[0], 50, 0, GRID)).toEqual({ col: 1, row: 0 });
    expect(dropSpot(PAGE[0], 40, 0, GRID)).toEqual({ col: 0, row: 0 });
    expect(dropSpot(PAGE[0], 0, 4 * 106, GRID)).toEqual({ col: 0, row: 4 });
  });

  it("stays on the grid however far it goes", () => {
    expect(dropSpot(PAGE[0], 9999, 9999, GRID)).toEqual({ col: 2, row: 5 });
    expect(dropSpot(PAGE[1], -9999, -9999, GRID)).toEqual({ col: 0, row: 0 });
  });
});

describe("dropWidget", () => {
  it("moves a widget onto free cells", () => {
    expect(dropWidget(PAGE, 0, 0, 4)?.[0]).toEqual({
      widget: "altitude",
      col: 0,
      row: 4,
      w: 2,
      h: 1,
    });
  });

  it("swaps two widgets when one lands on the other", () => {
    const next = dropWidget(PAGE, 0, 2, 0)!;
    expect(next[0]).toMatchObject({ widget: "altitude", col: 2, row: 0 });
    expect(next[1]).toMatchObject({ widget: "vario", col: 0, row: 0 });
  });

  it("refuses a place the other widget cannot leave room for", () => {
    // The map does not fit where the altitude was.
    expect(dropWidget(PAGE, 0, 0, 2)).toBeNull();
  });

  it("is the same page when dropped where it was", () => {
    expect(dropWidget(PAGE, 1, 2, 0)).toBe(PAGE);
  });
});

describe("stretching", () => {
  it("takes whole cells from the corner, within the grid", () => {
    expect(stretchSize(PAGE[2], 0, 106, GRID)).toEqual({ w: 4, h: 4 });
    expect(stretchSize(PAGE[2], -9999, -9999, GRID)).toEqual({ w: 1, h: 1 });
    expect(stretchSize(PAGE[2], 9999, 9999, GRID)).toEqual({ w: 4, h: 5 });
  });

  it("grows into free cells, never over another widget", () => {
    expect(stretchWidget(PAGE, 2, 4, 5)?.[2]).toMatchObject({ w: 4, h: 5 });
    expect(stretchWidget(PAGE, 0, 3, 1)).toBeNull();
    expect(stretchWidget(PAGE, 0, 1, 1)?.[0]).toMatchObject({ w: 1, h: 1 });
  });
});
