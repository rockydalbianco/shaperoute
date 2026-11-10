import {
  GIF_LIMITS,
  gifFrames,
  isGif,
  lzwIndices,
  shrink,
  spacedIndices,
} from "./gifFrames";
import { gif, lzw, pixel } from "./gifWriter.testing";

const RED = [255, 0, 0, 255];
const GREEN = [0, 255, 0, 255];
const BLUE = [0, 0, 255, 255];
const CLEAR = [0, 0, 0, 0];

describe("isGif", () => {
  it("knows a GIF by its first bytes", () => {
    expect(isGif(gif(1, 1, [{ indices: [0] }]))).toBe(true);
    expect(isGif(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe(false);
    expect(isGif(new Uint8Array(0))).toBe(false);
  });
});

describe("lzwIndices", () => {
  it("reads back what the encoder wrote, past the code size's growth", () => {
    const indices = Array.from({ length: 5000 }, (_, i) => (i * 7 + (i >> 5)) % 4);
    expect(
      Array.from(lzwIndices(Uint8Array.from(lzw(indices, 2)), 2, indices.length)),
    ).toEqual(indices);
  });

  it("leaves the pixels a short stream does not reach at -1", () => {
    const out = lzwIndices(Uint8Array.from(lzw([1, 2], 2)), 2, 4);
    expect(Array.from(out)).toEqual([1, 2, -1, -1]);
  });
});

describe("gifFrames", () => {
  it("reads a still GIF, pixel by pixel", () => {
    const read = gifFrames(gif(2, 2, [{ indices: [0, 1, 2, 3] }]));
    expect(read.width).toBe(2);
    expect(read.height).toBe(2);
    expect(read.frames).toHaveLength(1);
    expect(pixel(read.frames[0], 2, 0, 0)).toEqual(RED);
    expect(pixel(read.frames[0], 2, 1, 0)).toEqual(GREEN);
    expect(pixel(read.frames[0], 2, 0, 1)).toEqual(BLUE);
    expect(pixel(read.frames[0], 2, 1, 1)).toEqual([255, 255, 255, 255]);
    expect(read.frameMs).toEqual([100]);
  });

  it("lays each frame on the ones before, with its transparent colour", () => {
    const read = gifFrames(
      gif(2, 1, [
        { indices: [0, 0], delayCs: 1 },
        { indices: [3, 1], transparent: 3, delayCs: 20 },
      ]),
    );
    expect(read.frames).toHaveLength(2);
    expect(pixel(read.frames[1], 2, 0, 0)).toEqual(RED);
    expect(pixel(read.frames[1], 2, 1, 0)).toEqual(GREEN);
    expect(read.frameMs).toEqual([100, 200]);
  });

  it("clears a frame's rectangle when it says so, and restores when it says so", () => {
    const cleared = gifFrames(
      gif(2, 1, [
        { indices: [2, 2], disposal: 2 },
        { indices: [1], left: 1, width: 1 },
      ]),
    );
    expect(pixel(cleared.frames[1], 2, 0, 0)).toEqual(CLEAR);
    expect(pixel(cleared.frames[1], 2, 1, 0)).toEqual(GREEN);

    const restored = gifFrames(
      gif(2, 1, [
        { indices: [2, 2] },
        { indices: [0], width: 1, disposal: 3 },
        { indices: [1], left: 1, width: 1 },
      ]),
    );
    expect(pixel(restored.frames[1], 2, 0, 0)).toEqual(RED);
    expect(pixel(restored.frames[2], 2, 0, 0)).toEqual(BLUE);
    expect(pixel(restored.frames[2], 2, 1, 0)).toEqual(GREEN);
  });

  it("puts an interlaced frame's rows in their places", () => {
    // Rows come as 0, 4, 2, 6, 1, 3, 5, 7: each row's colour is its number
    // in that order, mod 4.
    const order = [0, 4, 2, 6, 1, 3, 5, 7];
    const read = gifFrames(
      gif(1, 8, [{ indices: order.map((_, k) => k % 4), interlaced: true }]),
    );
    const colours = [RED, GREEN, BLUE, [255, 255, 255, 255]];
    order.forEach((row, k) => {
      expect(pixel(read.frames[0], 1, 0, row)).toEqual(colours[k % 4]);
    });
  });

  it("keeps at most 8 frames, equally spaced, each as long as the ones it stands for", () => {
    const frames = Array.from({ length: 20 }, (_, i) => ({
      indices: [i % 4],
      delayCs: 10,
    }));
    const read = gifFrames(gif(1, 1, frames));
    expect(read.frames).toHaveLength(8);
    expect(read.frames.map((f) => pixel(f, 1, 0, 0))).toEqual(
      spacedIndices(20, 8).map((i) => [RED, GREEN, BLUE, [255, 255, 255, 255]][i % 4]),
    );
    expect(read.frameMs.reduce((a, b) => a + b, 0)).toBe(2000);
  });

  it("makes a large GIF small on its longest side, and fewer frames to fit the budget", () => {
    // 8 frames of 256 px are 2 MiB of RGBA: the default limits keep them all.
    expect(8 * 256 * 256 * 4).toBe(GIF_LIMITS.budgetBytes);
    const frames = Array.from({ length: 8 }, (_, i) => ({
      indices: new Array<number>(64 * 48).fill(i % 4),
    }));
    const limits = { ...GIF_LIMITS, maxSide: 32, budgetBytes: 8 * 32 * 24 * 4 };
    const read = gifFrames(gif(64, 48, frames), limits);
    expect(read.width).toBe(32);
    expect(read.height).toBe(24);
    expect(read.frames).toHaveLength(8);
    expect(read.frames[0]).toHaveLength(32 * 24 * 4);
    const tight = gifFrames(gif(64, 48, frames), {
      ...limits,
      budgetBytes: 3 * 32 * 24 * 4 + 10,
    });
    expect(tight.frames).toHaveLength(3);
  });

  it("keeps only the first frame of a GIF too long to lay", () => {
    const frames = Array.from({ length: 6 }, (_, i) => ({ indices: [i % 4, 0, 0, 0] }));
    const read = gifFrames(gif(2, 2, frames), { ...GIF_LIMITS, maxWork: 10 });
    expect(read.frames).toHaveLength(1);
    expect(pixel(read.frames[0], 2, 0, 0)).toEqual(RED);
  });

  it("keeps the whole frames of a GIF cut short after them", () => {
    const whole = gif(1, 1, [{ indices: [1] }, { indices: [2] }]);
    const read = gifFrames(whole.subarray(0, whole.length - 6));
    expect(read.frames).toHaveLength(1);
    expect(pixel(read.frames[0], 1, 0, 0)).toEqual(GREEN);
  });

  it("throws on an empty file, a broken GIF and a GIF with no frames", () => {
    expect(() => gifFrames(new Uint8Array(0))).toThrow();
    const whole = gif(2, 2, [{ indices: [0, 1, 2, 3] }]);
    expect(() => gifFrames(whole.subarray(0, 20))).toThrow();
    const noFrames = Uint8Array.from([...whole.subarray(0, 25), 0x3b]);
    expect(() => gifFrames(noFrames)).toThrow();
    const badBlock = Uint8Array.from([...whole.subarray(0, 25), 0x99]);
    expect(() => gifFrames(badBlock)).toThrow();
    const notAGif = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10]);
    expect(() => gifFrames(notAGif)).toThrow();
  });
});

describe("shrink", () => {
  it("averages the pixels each one covers, by how opaque they are", () => {
    const rgba = Uint8Array.from([...RED, ...CLEAR, ...BLUE, ...BLUE]);
    const out = shrink(rgba, 2, 2, 1, 1);
    expect(Array.from(out)).toEqual([85, 0, 170, 191]);
  });
});

describe("spacedIndices", () => {
  it("spaces the kept frames from the first", () => {
    expect(spacedIndices(20, 8)).toEqual([0, 2, 5, 7, 10, 12, 15, 17]);
    expect(spacedIndices(3, 8)).toEqual([0, 1, 2]);
    expect(spacedIndices(5, 0)).toEqual([0]);
  });
});
