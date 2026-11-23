/**
 * GIFs for the tests of TASK-417, written byte by byte, with an LZW
 * encoder of the tests' own: what the reader in gifFrames.ts reads back.
 */

/** LZW codes of `indices`, packed LSB first as a GIF has them. */
export function lzw(indices: number[], minCodeSize: number): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const out: number[] = [];
  let bits = 0;
  let held = 0;
  let size = minCodeSize + 1;
  const write = (code: number) => {
    bits |= code << held;
    held += size;
    while (held >= 8) {
      out.push(bits & 0xff);
      bits >>>= 8;
      held -= 8;
    }
  };
  let table = new Map<string, number>();
  let next = end + 1;
  write(clear);
  let w = indices[0];
  for (const k of indices.slice(1)) {
    const key = `${w},${k}`;
    const known = table.get(key);
    if (known !== undefined) {
      w = known;
      continue;
    }
    write(w);
    if (next < 4096) {
      table.set(key, next);
      if (next >= 1 << size) {
        size += 1;
      }
      next += 1;
    } else {
      write(clear);
      table = new Map();
      next = end + 1;
      size = minCodeSize + 1;
    }
    w = k;
  }
  write(w);
  write(end);
  if (held > 0) {
    out.push(bits & 0xff);
  }
  return out;
}

/** Bytes as sub-blocks of at most 255, then the empty one. */
function subBlocks(bytes: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i += 255) {
    const part = bytes.slice(i, i + 255);
    out.push(part.length, ...part);
  }
  out.push(0);
  return out;
}

const short = (n: number) => [n & 0xff, n >> 8];

export type TestFrame = {
  indices: number[];
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  delayCs?: number;
  transparent?: number;
  disposal?: number;
  interlaced?: boolean;
};

/** A GIF of `width` × `height` with a global palette of four colours. */
export function gif(width: number, height: number, frames: TestFrame[]): Uint8Array {
  const palette = [255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255];
  const bytes: number[] = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
  bytes.push(...short(width), ...short(height), 0x81, 0, 0, ...palette);
  for (const f of frames) {
    const control = ((f.disposal ?? 0) << 2) | (f.transparent !== undefined ? 1 : 0);
    bytes.push(
      0x21,
      0xf9,
      4,
      control,
      ...short(f.delayCs ?? 10),
      f.transparent ?? 0,
      0,
    );
    bytes.push(
      0x2c,
      ...short(f.left ?? 0),
      ...short(f.top ?? 0),
      ...short(f.width ?? width),
      ...short(f.height ?? height),
      f.interlaced ? 0x40 : 0,
    );
    bytes.push(2, ...subBlocks(lzw(f.indices, 2)));
  }
  bytes.push(0x3b);
  return Uint8Array.from(bytes);
}

/** The RGBA of pixel (x, y). */
export function pixel(rgba: Uint8Array, width: number, x: number, y: number): number[] {
  const p = (y * width + x) * 4;
  return Array.from(rgba.subarray(p, p + 4));
}
