import type * as ImagePicker from "expo-image-picker";

import { gif } from "./gifWriter.testing";
import {
  MY_IMAGE_GIF,
  MY_IMAGE_OPTIONS,
  MY_IMAGE_PHOTO,
  MY_IMAGE_SIDE,
  myImageForPage,
  myImageStamp,
  myImageUri,
  type MyImageFiles,
  pageImageOf,
  pickMyImage,
  removeMyImage,
  subscribeMyImage,
} from "./myImage";

/** The first bytes of a JPEG, enough for the tests: never read as one. */
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const SHRUNK = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb, 9, 9]);
const GIF = gif(2, 1, [{ indices: [0, 1] }, { indices: [1, 0] }]);

/** The app's folder and the picker's files, in memory. */
function memoryFiles(picked: Record<string, Uint8Array> = {}) {
  const kept = new Map<string, Uint8Array>();
  const shrink = jest.fn(async () => SHRUNK);
  const files: MyImageFiles = {
    uriOf: (name) => (kept.has(name) ? `file:///app/${name}` : null),
    bytesOf: async (uri) => {
      const name = uri.replace("file:///app/", "");
      const bytes = kept.get(name) ?? picked[uri];
      if (bytes === undefined) {
        throw new Error("no such file");
      }
      return bytes;
    },
    write: (name, bytes) => {
      kept.set(name, bytes);
    },
    remove: (name) => {
      kept.delete(name);
    },
    shrink,
  };
  return { files, kept, shrink };
}

function picker(result: ImagePicker.ImagePickerResult, granted = true) {
  return {
    launchImageLibraryAsync: jest.fn(async () => result),
    launchCameraAsync: jest.fn(async () => result),
    requestCameraPermissionsAsync: jest.fn(async () => ({ granted }) as never),
  };
}

function chosen(uri: string, width = 900): ImagePicker.ImagePickerResult {
  return {
    canceled: false,
    assets: [{ uri, width, height: width }],
  };
}

describe("pickMyImage", () => {
  it("asks the phone's editor for a square, at full quality", async () => {
    const { files } = memoryFiles({ "file:///pick/a.jpg": JPEG });
    const p = picker(chosen("file:///pick/a.jpg"));
    await pickMyImage("library", p, files);
    expect(p.launchImageLibraryAsync).toHaveBeenCalledWith(MY_IMAGE_OPTIONS);
    expect(MY_IMAGE_OPTIONS).toMatchObject({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
  });

  it("keeps a photo as a JPEG of 256 px, in place of a GIF kept before", async () => {
    const { files, kept, shrink } = memoryFiles({ "file:///pick/a.jpg": JPEG });
    kept.set(MY_IMAGE_GIF, GIF);
    const before = myImageStamp();
    const picked = await pickMyImage(
      "library",
      picker(chosen("file:///pick/a.jpg")),
      files,
    );
    expect(picked).toEqual({ kind: "picked", uri: `file:///app/${MY_IMAGE_PHOTO}` });
    expect(shrink).toHaveBeenCalledWith("file:///pick/a.jpg", MY_IMAGE_SIDE);
    expect(kept.get(MY_IMAGE_PHOTO)).toBe(SHRUNK);
    expect(kept.has(MY_IMAGE_GIF)).toBe(false);
    expect(myImageStamp()).toBe(before + 1);
  });

  it("never makes a small photo larger", async () => {
    const { files, shrink } = memoryFiles({ "file:///pick/a.jpg": JPEG });
    await pickMyImage("camera", picker(chosen("file:///pick/a.jpg", 120)), files);
    expect(shrink).toHaveBeenCalledWith("file:///pick/a.jpg", 120);
  });

  it("keeps a GIF as it is, once it reads, in place of a photo", async () => {
    const { files, kept, shrink } = memoryFiles({ "file:///pick/a.gif": GIF });
    kept.set(MY_IMAGE_PHOTO, SHRUNK);
    const picked = await pickMyImage(
      "library",
      picker(chosen("file:///pick/a.gif")),
      files,
    );
    expect(picked).toEqual({ kind: "picked", uri: `file:///app/${MY_IMAGE_GIF}` });
    expect(kept.get(MY_IMAGE_GIF)).toBe(GIF);
    expect(kept.has(MY_IMAGE_PHOTO)).toBe(false);
    expect(shrink).not.toHaveBeenCalled();
  });

  it("keeps nothing of a broken GIF or of an empty file, and says it cannot be read", async () => {
    const broken = GIF.subarray(0, 20);
    const { files, kept } = memoryFiles({
      "file:///pick/broken.gif": broken,
      "file:///pick/empty.jpg": new Uint8Array(0),
    });
    files.shrink = jest.fn(async () => {
      throw new Error("not an image");
    });
    expect(
      await pickMyImage("library", picker(chosen("file:///pick/broken.gif")), files),
    ).toEqual({ kind: "unreadable" });
    expect(
      await pickMyImage("library", picker(chosen("file:///pick/empty.jpg")), files),
    ).toEqual({
      kind: "unreadable",
    });
    expect(kept.size).toBe(0);
  });

  it("says nothing when the picker is closed, and why when the camera is refused", async () => {
    const { files } = memoryFiles();
    expect(
      await pickMyImage("library", picker({ canceled: true, assets: null }), files),
    ).toEqual({ kind: "cancelled" });
    const refused = picker(chosen("file:///pick/a.jpg"), false);
    expect(await pickMyImage("camera", refused, files)).toEqual({ kind: "denied" });
    expect(refused.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("never throws when the picker does", async () => {
    const { files } = memoryFiles();
    const p = picker({ canceled: true, assets: null });
    p.launchImageLibraryAsync.mockRejectedValueOnce(new Error("no photos"));
    expect(await pickMyImage("library", p, files)).toEqual({ kind: "unreadable" });
  });
});

describe("removeMyImage", () => {
  it("takes either file off the phone and tells who listens", () => {
    const { files, kept } = memoryFiles();
    kept.set(MY_IMAGE_PHOTO, SHRUNK);
    const heard = jest.fn();
    const stop = subscribeMyImage(heard);
    removeMyImage(files);
    stop();
    expect(kept.size).toBe(0);
    expect(myImageUri(files)).toBeNull();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});

describe("pageImageOf", () => {
  it("gives a photo to the page as a JPEG data URL, still", () => {
    expect(pageImageOf(JPEG)).toEqual({
      frames: [{ src: "data:image/jpeg;base64,/9j/4AECAwQ=" }],
      frameMs: [0],
    });
  });

  it("gives a GIF to the page as its frames' pixels, each with its time", () => {
    const image = pageImageOf(GIF);
    expect(image.frameMs).toEqual([100, 100]);
    expect(image.frames).toEqual([
      {
        width: 2,
        height: 1,
        rgba: Buffer.from([255, 0, 0, 255, 0, 255, 0, 255]).toString("base64"),
      },
      {
        width: 2,
        height: 1,
        rgba: Buffer.from([0, 255, 0, 255, 255, 0, 0, 255]).toString("base64"),
      },
    ]);
  });

  it("throws on an empty file and on a broken GIF", () => {
    expect(() => pageImageOf(new Uint8Array(0))).toThrow();
    expect(() => pageImageOf(GIF.subarray(0, 20))).toThrow();
  });
});

describe("myImageForPage", () => {
  it("is null with no image, and with one that does not read: the video goes out without it", async () => {
    const { files, kept } = memoryFiles();
    removeMyImage(files);
    expect(await myImageForPage(files)).toBeNull();
    kept.set(MY_IMAGE_GIF, GIF.subarray(0, 20));
    removeMyImage({ ...files, remove: () => {} });
    expect(await myImageForPage(files)).toBeNull();
  });

  it("reads the kept image once for each image", async () => {
    const { files, kept } = memoryFiles();
    kept.set(MY_IMAGE_PHOTO, JPEG);
    removeMyImage({ ...files, remove: () => {} });
    const read = jest.spyOn(files, "bytesOf");
    const first = await myImageForPage(files);
    const again = await myImageForPage(files);
    expect(first).toEqual(pageImageOf(JPEG));
    expect(again).toBe(first);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
