import {
  type Cell,
  GRID_COLUMNS,
  GRID_ROWS,
  type Page,
  pageFits,
} from "./flightLayout";

/**
 * Moving and sizing a widget by dragging it in the flight screen's editor
 * (TASK-479 part B3, ADR-0388): where a widget dragged so far lands on the
 * grid, and the page after it lands. As the arrows of part B2, every step
 * gives a page that fits, or null: the widget then goes back where it was.
 */

/** The grid's measures on the screen, points. */
export type GridMetrics = { cellW: number; cellH: number; gap: number };

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

const overlaps = (a: Cell, b: Cell) =>
  a.col < b.col + b.w &&
  b.col < a.col + a.w &&
  a.row < b.row + b.h &&
  b.row < a.row + a.h;

/** The corner `cell` lands on when dragged `dx`, `dy` points: the nearest
 * cell, on the grid. */
export function dropSpot(
  cell: Cell,
  dx: number,
  dy: number,
  grid: GridMetrics,
): { col: number; row: number } {
  return {
    col: clamp(
      cell.col + Math.round(dx / (grid.cellW + grid.gap)),
      0,
      GRID_COLUMNS - cell.w,
    ),
    row: clamp(
      cell.row + Math.round(dy / (grid.cellH + grid.gap)),
      0,
      GRID_ROWS - cell.h,
    ),
  };
}

/** The size `cell` takes when its corner is dragged `dx`, `dy` points:
 * whole cells, at least one, within the grid. */
export function stretchSize(
  cell: Cell,
  dx: number,
  dy: number,
  grid: GridMetrics,
): { w: number; h: number } {
  return {
    w: clamp(
      cell.w + Math.round(dx / (grid.cellW + grid.gap)),
      1,
      GRID_COLUMNS - cell.col,
    ),
    h: clamp(
      cell.h + Math.round(dy / (grid.cellH + grid.gap)),
      1,
      GRID_ROWS - cell.row,
    ),
  };
}

/**
 * The widget at `index` put with its corner at `col`, `row`. On free cells
 * it simply moves; over one other widget the two change places, when that
 * one fits where this one was; otherwise null.
 */
export function dropWidget(
  page: Page,
  index: number,
  col: number,
  row: number,
): Page | null {
  const one = page[index];
  if (one.col === col && one.row === row) {
    return page;
  }
  const moved = { ...one, col, row };
  const placed = page.map((cell, i) => (i === index ? moved : cell));
  if (pageFits(placed)) {
    return placed;
  }
  const under = page
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell, i }) => i !== index && overlaps(cell, moved));
  if (under.length !== 1) {
    return null;
  }
  const other = under[0];
  const swapped = page.map((cell, i) =>
    i === index
      ? moved
      : i === other.i
        ? { ...cell, col: one.col, row: one.row }
        : cell,
  );
  return pageFits(swapped) ? swapped : null;
}

/** The widget at `index` made `w` × `h` from its corner; null when it
 * would cover another. */
export function stretchWidget(
  page: Page,
  index: number,
  w: number,
  h: number,
): Page | null {
  const one = page[index];
  if (one.w === w && one.h === h) {
    return page;
  }
  const next = page.map((cell, i) => (i === index ? { ...one, w, h } : cell));
  return pageFits(next) ? next : null;
}
