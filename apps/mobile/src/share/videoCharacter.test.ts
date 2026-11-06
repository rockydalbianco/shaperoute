/// <reference types="node" />

import { bytesOfBase64 } from "./videoFile";
import {
  base64OfBytes,
  CHARACTERS,
  characterEmoji,
  characterName,
  storedFileOf,
} from "./videoCharacter";

/** A zip with one stored file, as `zip -0` writes it. */
function storedZip(
  name: string,
  data: Uint8Array,
  { method = 0, flags = 0, extra = 0 } = {},
): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const out = new Uint8Array(30 + nameBytes.length + extra + data.length + 16);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 10, true);
  view.setUint16(6, flags, true);
  view.setUint16(8, method, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, extra, true);
  out.set(nameBytes, 30);
  out.set(data, 30 + nameBytes.length + extra);
  return out;
}

describe("the animals of the video", () => {
  it("are the twelve of the pack, each with a name and an emoji", () => {
    expect(CHARACTERS).toHaveLength(12);
    expect(new Set(CHARACTERS).size).toBe(12);
    for (const character of CHARACTERS) {
      expect(characterName(character)).not.toBe("");
      expect(characterEmoji(character)).not.toBe("");
    }
    expect(characterName("white_horse")).toBe("White horse");
    expect(characterName("shiba")).toBe("Shiba Inu");
  });
});

describe("a model's file", () => {
  const model = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]);

  it("is the stored file of the zip, after its header and its name", () => {
    expect(Array.from(storedFileOf(storedZip("model.glb", model)))).toEqual(
      Array.from(model),
    );
    expect(
      Array.from(storedFileOf(storedZip("model.glb", model, { extra: 4 }))),
    ).toEqual(Array.from(model));
  });

  it("is refused when the zip is not one, is compressed, or is cut short", () => {
    expect(() => storedFileOf(model)).toThrow("not a zip");
    expect(() => storedFileOf(new Uint8Array(40))).toThrow("not a zip");
    expect(() => storedFileOf(storedZip("model.glb", model, { method: 8 }))).toThrow(
      "not stored",
    );
    expect(() => storedFileOf(storedZip("model.glb", model, { flags: 0x8 }))).toThrow(
      "not stored",
    );
    expect(() => storedFileOf(storedZip("model.glb", model).subarray(0, 40))).toThrow(
      "cut short",
    );
  });
});

describe("base64OfBytes", () => {
  it("writes bytes as base64 the page reads back, whatever their length", () => {
    for (const length of [0, 1, 2, 3, 4, 5, 255, 1000]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 37 + 11) & 255);
      const text = base64OfBytes(bytes);
      expect(text).toBe(Buffer.from(bytes).toString("base64"));
      expect(Array.from(bytesOfBase64(text))).toEqual(Array.from(bytes));
    }
  });
});
