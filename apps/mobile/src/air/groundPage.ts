import { TERRAIN_TILES_URL } from "../map/mapKindStyle";

/**
 * The ground under the pilot (TASK-479 part A1, ADR-0388), for «Height
 * above ground»: a page with no map, in a WebView nobody sees, that reads
 * the height at a point from the Terrain Tiles the 3D map already uses
 * (AWS open data, "terrarium" encoding, free and with no key). The phone
 * cannot read a PNG by itself; the page's browser can, on a canvas.
 *
 * At zoom 12 a pixel is about 30 m in the Alps, as the heights under the
 * tiles (SRTM and others): «Height above ground» is GPS altitude less
 * this, so it is an estimate, good to some tens of metres.
 *
 * The phone calls `window.ground(id, lat, lon)`; the page answers
 * `{ type: "ground", id, altM }`, altM null when the tile cannot be read
 * (no network, no tile).
 */

export const GROUND_ZOOM = 12;
export const TILE_PX = 256;
/** Tiles kept in the page, the oldest let go first. */
export const GROUND_TILES_KEPT = 16;

/** Metres from a terrarium pixel. */
export function terrariumHeight(r: number, g: number, b: number): number {
  return r * 256 + g + b / 256 - 32768;
}

/** The tile and the pixel in it (fractional) of a point at `zoom`. */
export function tilePixelOf(
  lat: number,
  lon: number,
  zoom: number = GROUND_ZOOM,
): { x: number; y: number; px: number; py: number } {
  const n = 2 ** zoom;
  const xf = ((lon + 180) / 360) * n;
  const rad = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  const x = Math.floor(xf);
  const y = Math.floor(yf);
  return { x, y, px: (xf - x) * TILE_PX, py: (yf - y) * TILE_PX };
}

function toScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function buildGroundPage(): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  var TILES_URL = ${toScript(TERRAIN_TILES_URL)};
  var ZOOM = ${GROUND_ZOOM};
  var SIZE = ${TILE_PX};
  var KEPT = ${GROUND_TILES_KEPT};
  var tiles = {};
  var order = [];

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  // ImageData of a tile, or null when it cannot be read; kept.
  function tile(x, y) {
    var key = x + "/" + y;
    if (tiles[key] === undefined) {
      tiles[key] = new Promise(function (resolve) {
        var image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = function () {
          try {
            var canvas = document.createElement("canvas");
            canvas.width = SIZE;
            canvas.height = SIZE;
            var context = canvas.getContext("2d");
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, SIZE, SIZE));
          } catch (error) {
            resolve(null);
          }
        };
        image.onerror = function () {
          resolve(null);
        };
        image.src = TILES_URL.replace("{z}", ZOOM).replace("{x}", x).replace("{y}", y);
      });
      order.push(key);
      if (order.length > KEPT) {
        delete tiles[order.shift()];
      }
    }
    return tiles[key];
  }

  function heightIn(data, px, py) {
    var i = (Math.min(SIZE - 1, Math.floor(py)) * SIZE + Math.min(SIZE - 1, Math.floor(px))) * 4;
    var d = data.data;
    return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
  }

  window.ground = function (id, lat, lon) {
    var n = Math.pow(2, ZOOM);
    var xf = ((lon + 180) / 360) * n;
    var rad = (lat * Math.PI) / 180;
    var yf = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
    var x = Math.floor(xf);
    var y = Math.floor(yf);
    tile(x, y).then(function (data) {
      var altM = data === null ? null : heightIn(data, (xf - x) * SIZE, (yf - y) * SIZE);
      post({ type: "ground", id: id, altM: altM === null ? null : Math.round(altM) });
    });
  };

  post({ type: "ready" });
</script>
</body>
</html>`;
}

export type GroundMessage =
  { type: "ready" } | { type: "ground"; id: number; altM: number | null };

/** A message of the page, or null for anything else. */
export function parseGroundMessage(data: string): GroundMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== "object" || message === null) {
      return null;
    }
    const one = message as Record<string, unknown>;
    if (one.type === "ready") {
      return { type: "ready" };
    }
    if (
      one.type === "ground" &&
      typeof one.id === "number" &&
      (one.altM === null || (typeof one.altM === "number" && Number.isFinite(one.altM)))
    ) {
      return { type: "ground", id: one.id, altM: one.altM as number | null };
    }
    return null;
  } catch {
    return null;
  }
}
