/**
 * The page that reads the ground (TASK-479 part A1): the terrarium sum,
 * the tile and pixel of a point, and the page's script run against a
 * stand-in browser: it answers the height of the pixel, null when the tile
 * cannot be read, and keeps a few tiles.
 */
import vm from "node:vm";

import {
  buildGroundPage,
  GROUND_TILES_KEPT,
  parseGroundMessage,
  terrariumHeight,
  tilePixelOf,
  TILE_PX,
} from "./groundPage";

it("sums a terrarium pixel to metres", () => {
  // 1500 m: 32768 + 1500 = 34268 = 133 * 256 + 220.
  expect(terrariumHeight(133, 220, 0)).toBe(1500);
  expect(terrariumHeight(128, 0, 128)).toBe(0.5);
});

it("finds the tile and pixel of a point", () => {
  const { x, y, px, py } = tilePixelOf(0, 0, 1);
  expect([x, y, px, py]).toEqual([1, 1, 0, 0]);
  const monteGrappa = tilePixelOf(45.87, 11.8, 12);
  expect(monteGrappa.x).toBe(2182);
  expect(monteGrappa.y).toBe(1459);
  expect(monteGrappa.px).toBeGreaterThanOrEqual(0);
  expect(monteGrappa.px).toBeLessThan(TILE_PX);
});

function runPage(fail = false) {
  const posts: unknown[] = [];
  const loaded: string[] = [];
  class Image {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(url: string) {
      loaded.push(url);
      setImmediate(() => (fail ? this.onerror?.() : this.onload?.()));
    }
  }
  // Every pixel 1500 m.
  const data = new Uint8ClampedArray(TILE_PX * TILE_PX * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 133;
    data[i + 1] = 220;
  }
  const context: Record<string, unknown> = {
    Image,
    Promise,
    Math,
    JSON,
    document: {
      createElement: () => ({
        getContext: () => ({ drawImage() {}, getImageData: () => ({ data }) }),
      }),
    },
    ReactNativeWebView: { postMessage: (text: string) => posts.push(JSON.parse(text)) },
  };
  context.window = context;
  vm.createContext(context);
  for (const [, code] of buildGroundPage().matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    vm.runInContext(code, context);
  }
  const ground = (
    context.window as { ground: (id: number, lat: number, lon: number) => void }
  ).ground;
  return { posts, loaded, ground };
}

const settle = () =>
  new Promise((resolve) => setImmediate(() => setImmediate(resolve)));

it("answers the ground's height at a point, and says it is ready", async () => {
  const page = runPage();
  expect(page.posts[0]).toEqual({ type: "ready" });
  page.ground(7, 45.87, 11.8);
  await settle();
  expect(page.posts[1]).toEqual({ type: "ground", id: 7, altM: 1500 });
  expect(page.loaded[0]).toBe(
    "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2182/1459.png",
  );
});

it("reads a tile once, and keeps only a few", async () => {
  const page = runPage();
  page.ground(1, 45.87, 11.8);
  page.ground(2, 45.8701, 11.8001);
  await settle();
  expect(page.loaded).toHaveLength(1);
  for (let i = 0; i <= GROUND_TILES_KEPT; i += 1) {
    page.ground(10 + i, 45.87, 11.8 + i * 0.1);
  }
  page.ground(99, 45.87, 11.8);
  await settle();
  // The first tile was let go: read again.
  expect(page.loaded.filter((url) => url.endsWith("/2182/1459.png"))).toHaveLength(2);
});

it("answers null when the tile cannot be read", async () => {
  const page = runPage(true);
  page.ground(3, 45.87, 11.8);
  await settle();
  expect(page.posts[1]).toEqual({ type: "ground", id: 3, altM: null });
});

it("reads only its own messages", () => {
  expect(parseGroundMessage('{"type":"ready"}')).toEqual({ type: "ready" });
  expect(parseGroundMessage('{"type":"ground","id":2,"altM":812}')).toEqual({
    type: "ground",
    id: 2,
    altM: 812,
  });
  expect(parseGroundMessage('{"type":"ground","id":2,"altM":"x"}')).toBeNull();
  expect(parseGroundMessage("not json")).toBeNull();
});
