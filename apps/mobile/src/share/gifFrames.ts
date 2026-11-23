/**
 * A small GIF reader of our own (TASK-417, ADR-0345 point 3): the video's
 * page runs in Safari's WebView, which has no ImageDecoder, and a canvas
 * draws an animated GIF at whatever frame the browser shows. So the app
 * reads the GIF here, in plain TypeScript with no dependency: its blocks,
 * the LZW of each frame, the frames laid one over the other as the GIF
 * says, then a few of them, equally spaced, made smaller for the page.
 *
 * Anything the reader cannot read throws, and the video goes out without
 * the image (ADR-0345 point 4).
 */

/** What the page gets: frames of `width` × `height` pixels, RGBA, each
 * shown for its `frameMs`, round and round. */
export type GifFrames = {
  width: number;
  height: number;
  frames: Uint8Array[];
  frameMs: number[];
};

export type GifLimits = {
  /** The most frames kept, equally spaced over the GIF. */
  maxFrames: number;
  /** The longest side of a kept frame, in pixels. */
  maxSide: number;
  /** The kept frames' RGBA, all together, at most this many bytes: fewer
   * frames when they do not fit, never fewer than one. */
  budgetBytes: number;
  /** Past this many pixels to lay, frame after frame, only the first frame
   * is read: a long GIF costs the phone too much for an 8-frame loop. */
  maxWork: number;
};

/** As measured for part B: 8 frames of 256 px are 2 MB of RGBA. */
export const GIF_LIMITS: GifLimits = {
  maxFrames: 8,
  maxSide: 256,
  budgetBytes: 2 * 1024 * 1024,
  maxWork: 40_000_000,
};

/** The largest picture the reader lays frames on, in pixels. */
const MAX_AREA = 2048 * 2048;
/** A frame without a delay, or with one too short, is shown this long, as
 * browsers do. */
const DEFAULT_DELAY_MS = 100;
const MAX_CODES = 4096;

/** True when `bytes` start as a GIF does. */
export function isGif(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  );
}

/** One image of the GIF as its blocks say, not yet decoded. */
type RawFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  interlaced: boolean;
  /** The frame's colours, as R, G, B. */
  palette: Uint8Array;
  transparent: number | null;
  disposal: number;
  delayMs: number;
  minCodeSize: number;
  /** The LZW codes' bytes, the sub-blocks joined. */
  data: Uint8Array;
};

type Parsed = { width: number; height: number; frames: RawFrame[] };

class Reader {
  at = 0;
  constructor(readonly bytes: Uint8Array) {}
  byte(): number {
    if (this.at >= this.bytes.length) {
      throw new Error("the GIF is cut short");
    }
    return this.bytes[this.at++];
  }
  short(): number {
    const low = this.byte();
    return low | (this.byte() << 8);
  }
  take(count: number): Uint8Array {
    if (this.at + count > this.bytes.length) {
      throw new Error("the GIF is cut short");
    }
    const out = this.bytes.subarray(this.at, this.at + count);
    this.at += count;
    return out;
  }
  /** Data sub-blocks up to their empty one, joined. */
  blocks(): Uint8Array {
    const parts: Uint8Array[] = [];
    let total = 0;
    for (let size = this.byte(); size !== 0; size = this.byte()) {
      const part = this.take(size);
      parts.push(part);
      total += size;
    }
    const out = new Uint8Array(total);
    let o = 0;
    for (const part of parts) {
      out.set(part, o);
      o += part.length;
    }
    return out;
  }
  skipBlocks(): void {
    for (let size = this.byte(); size !== 0; size = this.byte()) {
      this.take(size);
    }
  }
}

/** The GIF's blocks: its size and its frames, still encoded. A GIF cut
 * short keeps the frames read whole before the cut; with none, it throws. */
function parse(bytes: Uint8Array): Parsed {
  if (!isGif(bytes)) {
    throw new Error("not a GIF");
  }
  const r = new Reader(bytes);
  r.at = 6;
  const width = r.short();
  const height = r.short();
  if (width === 0 || height === 0 || width * height > MAX_AREA) {
    throw new Error("the GIF's size is not one to read");
  }
  const packed = r.byte();
  r.byte(); // background colour: frames are laid on clear, as browsers do
  r.byte(); // pixel aspect
  const global = packed & 0x80 ? r.take(3 * (2 << (packed & 7))) : null;
  const frames: RawFrame[] = [];
  let transparent: number | null = null;
  let disposal = 0;
  let delayMs = 0;
  try {
    for (;;) {
      const kind = r.byte();
      if (kind === 0x3b) {
        break;
      }
      if (kind === 0x21) {
        const label = r.byte();
        if (label === 0xf9) {
          const size = r.byte();
          const control = r.take(size);
          r.skipBlocks();
          if (size >= 4) {
            disposal = (control[0] >> 2) & 7;
            transparent = control[0] & 1 ? control[3] : null;
            delayMs = (control[1] | (control[2] << 8)) * 10;
          }
        } else {
          r.skipBlocks();
        }
      } else if (kind === 0x2c) {
        const left = r.short();
        const top = r.short();
        const w = r.short();
        const h = r.short();
        const flags = r.byte();
        const local = flags & 0x80 ? r.take(3 * (2 << (flags & 7))) : null;
        const minCodeSize = r.byte();
        const data = r.blocks();
        const palette = local ?? global;
        if (palette === null) {
          throw new Error("a frame has no colours");
        }
        if (minCodeSize < 2 || minCodeSize > 8) {
          throw new Error("a frame's codes are not of a GIF");
        }
        frames.push({
          left,
          top,
          width: w,
          height: h,
          interlaced: (flags & 0x40) !== 0,
          palette,
          transparent,
          disposal,
          delayMs: delayMs <= 10 ? DEFAULT_DELAY_MS : delayMs,
          minCodeSize,
          data,
        });
        transparent = null;
        disposal = 0;
        delayMs = 0;
      } else {
        throw new Error("a block not of a GIF");
      }
    }
  } catch (error) {
    if (
      frames.length === 0 ||
      !(error instanceof Error) ||
      !/cut short/.test(error.message)
    ) {
      throw error;
    }
  }
  if (frames.length === 0) {
    throw new Error("the GIF has no frames");
  }
  return { width, height, frames };
}

/** The colour indices of a frame, `count` of them, from its LZW codes. A
 * stream that ends early leaves the rest at index -1, drawn as nothing. */
export function lzwIndices(
  data: Uint8Array,
  minCodeSize: number,
  count: number,
): Int16Array {
  const out = new Int16Array(count).fill(-1);
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const prefix = new Int16Array(MAX_CODES);
  const suffix = new Uint8Array(MAX_CODES);
  const length = new Uint16Array(MAX_CODES);
  for (let c = 0; c < clear; c += 1) {
    prefix[c] = -1;
    suffix[c] = c;
    length[c] = 1;
  }
  let size = minCodeSize + 1;
  let next = end + 1;
  let prev = -1;
  let o = 0;
  let bits = 0;
  let held = 0;
  let i = 0;
  while (o < count) {
    while (held < size && i < data.length) {
      bits |= data[i++] << held;
      held += 8;
    }
    if (held < size) {
      break;
    }
    const code = bits & ((1 << size) - 1);
    bits >>>= size;
    held -= size;
    if (code === clear) {
      size = minCodeSize + 1;
      next = end + 1;
      prev = -1;
      continue;
    }
    if (code === end) {
      break;
    }
    if (prev === -1) {
      if (code >= clear) {
        throw new Error("a frame's codes are broken");
      }
      out[o++] = code;
      prev = code;
      continue;
    }
    let first: number;
    if (code < next) {
      // The code's own run, written from its end back.
      let c = code;
      while (prefix[c] !== -1) {
        c = prefix[c];
      }
      first = suffix[c];
    } else if (code === next) {
      let c = prev;
      while (prefix[c] !== -1) {
        c = prefix[c];
      }
      first = suffix[c];
    } else {
      throw new Error("a frame's codes are broken");
    }
    if (next < MAX_CODES) {
      prefix[next] = prev;
      suffix[next] = first;
      length[next] = length[prev] + 1;
      next += 1;
      if (next === 1 << size && size < 12) {
        size += 1;
      }
    }
    const run = length[code];
    let c = code;
    for (let k = run - 1; k >= 0; k -= 1) {
      if (o + k < count) {
        out[o + k] = suffix[c];
      }
      c = prefix[c];
    }
    o += run;
    prev = code;
  }
  return out;
}

/** The rows of an interlaced frame, in the order its pixels come. */
function rowOrder(height: number, interlaced: boolean): number[] {
  const rows: number[] = [];
  if (!interlaced) {
    for (let y = 0; y < height; y += 1) {
      rows.push(y);
    }
    return rows;
  }
  for (const [start, step] of [
    [0, 8],
    [4, 8],
    [2, 4],
    [1, 2],
  ]) {
    for (let y = start; y < height; y += step) {
      rows.push(y);
    }
  }
  return rows;
}

/** Lays `frame` on `canvas` (RGBA, `width` wide), clipped to it. */
function lay(canvas: Uint8Array, width: number, height: number, frame: RawFrame): void {
  const indices = lzwIndices(frame.data, frame.minCodeSize, frame.width * frame.height);
  const rows = rowOrder(frame.height, frame.interlaced);
  const colours = frame.palette.length / 3;
  for (let r = 0; r < rows.length; r += 1) {
    const y = frame.top + rows[r];
    if (y >= height) {
      continue;
    }
    for (let x = 0; x < frame.width; x += 1) {
      const index = indices[r * frame.width + x];
      const cx = frame.left + x;
      if (index < 0 || index === frame.transparent || index >= colours || cx >= width) {
        continue;
      }
      const p = (y * width + cx) * 4;
      canvas[p] = frame.palette[index * 3];
      canvas[p + 1] = frame.palette[index * 3 + 1];
      canvas[p + 2] = frame.palette[index * 3 + 2];
      canvas[p + 3] = 255;
    }
  }
}

/** Clears `frame`'s rectangle on `canvas`. */
function clearRect(
  canvas: Uint8Array,
  width: number,
  height: number,
  frame: RawFrame,
): void {
  for (let y = frame.top; y < Math.min(height, frame.top + frame.height); y += 1) {
    const from = (y * width + frame.left) * 4;
    const to = (y * width + Math.min(width, frame.left + frame.width)) * 4;
    canvas.fill(0, from, Math.max(from, to));
  }
}

/** `count` indices out of `total`, equally spaced from the first. */
export function spacedIndices(total: number, count: number): number[] {
  const k = Math.max(1, Math.min(total, count));
  return Array.from({ length: k }, (_, i) => Math.floor((i * total) / k));
}

/** `rgba` (`width` × `height`) made `toWidth` × `toHeight`, each pixel the
 * average of the ones it covers, weighed by how opaque they are. */
export function shrink(
  rgba: Uint8Array,
  width: number,
  height: number,
  toWidth: number,
  toHeight: number,
): Uint8Array {
  if (toWidth === width && toHeight === height) {
    return rgba.slice();
  }
  const out = new Uint8Array(toWidth * toHeight * 4);
  for (let oy = 0; oy < toHeight; oy += 1) {
    const y0 = Math.floor((oy * height) / toHeight);
    const y1 = Math.max(y0 + 1, Math.floor(((oy + 1) * height) / toHeight));
    for (let ox = 0; ox < toWidth; ox += 1) {
      const x0 = Math.floor((ox * width) / toWidth);
      const x1 = Math.max(x0 + 1, Math.floor(((ox + 1) * width) / toWidth));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const p = (y * width + x) * 4;
          const alpha = rgba[p + 3];
          r += rgba[p] * alpha;
          g += rgba[p + 1] * alpha;
          b += rgba[p + 2] * alpha;
          a += alpha;
          n += 1;
        }
      }
      const q = (oy * toWidth + ox) * 4;
      if (a > 0) {
        out[q] = Math.round(r / a);
        out[q + 1] = Math.round(g / a);
        out[q + 2] = Math.round(b / a);
        out[q + 3] = Math.round(a / n);
      }
    }
  }
  return out;
}

/**
 * The frames of the GIF in `bytes` for the video's page: at most
 * `limits.maxFrames`, equally spaced, each laid on the ones before as the
 * GIF says, at most `limits.maxSide` pixels a side, together within
 * `limits.budgetBytes`. Each kept frame lasts as long as the GIF's frames
 * up to the next kept one, so the loop keeps its speed. Throws when the
 * GIF cannot be read.
 */
export function gifFrames(
  bytes: Uint8Array,
  limits: GifLimits = GIF_LIMITS,
): GifFrames {
  const gif = parse(bytes);
  const { width, height } = gif;
  const scale = Math.min(1, limits.maxSide / Math.max(width, height));
  const toWidth = Math.max(1, Math.round(width * scale));
  const toHeight = Math.max(1, Math.round(height * scale));
  const frameBytes = toWidth * toHeight * 4;
  const fit = Math.max(1, Math.floor(limits.budgetBytes / frameBytes));
  const work = gif.frames.reduce((sum, f) => sum + f.width * f.height, 0);
  const total = work > limits.maxWork ? 1 : gif.frames.length;
  const kept = spacedIndices(total, Math.min(limits.maxFrames, fit));
  const canvas = new Uint8Array(width * height * 4);
  const frames: Uint8Array[] = [];
  const last = kept[kept.length - 1];
  for (let i = 0; i <= last; i += 1) {
    const frame = gif.frames[i];
    const before = frame.disposal === 3 ? canvas.slice() : null;
    lay(canvas, width, height, frame);
    if (kept.includes(i)) {
      frames.push(shrink(canvas, width, height, toWidth, toHeight));
    }
    if (frame.disposal === 2) {
      clearRect(canvas, width, height, frame);
    } else if (before !== null) {
      canvas.set(before);
    }
  }
  const frameMs = kept.map((from, k) => {
    const to = k + 1 < kept.length ? kept[k + 1] : total;
    let ms = 0;
    for (let i = from; i < to; i += 1) {
      ms += gif.frames[i].delayMs;
    }
    return ms;
  });
  return { width: toWidth, height: toHeight, frames, frameMs };
}
