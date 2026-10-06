import type * as ImagePicker from "expo-image-picker";

import {
  DRAWING_PHOTO_OPTIONS,
  DRAWING_PHOTO_SIDE,
  pickDrawingPhoto,
  type Shrink,
  shrunkSide,
} from "./pickDrawingPhoto";

const ASSET = { uri: "file:///run.heic", width: 4032, height: 3024 };

function picker({
  result = { canceled: false, assets: [ASSET] } as unknown,
  granted = true,
  fails = false,
} = {}) {
  const launch = jest.fn(async () => {
    if (fails) {
      throw new Error("no picker");
    }
    return result as ImagePicker.ImagePickerResult;
  });
  return {
    launchImageLibraryAsync: launch,
    launchCameraAsync: jest.fn(launch),
    requestCameraPermissionsAsync: jest.fn(
      async () => ({ granted }) as ImagePicker.CameraPermissionResponse,
    ),
  };
}

const shrink: Shrink = jest.fn(async (_uri, width, height) => ({
  base64: "c2hydW5r",
  width: Math.min(width, DRAWING_PHOTO_SIDE),
  height: Math.round((height * Math.min(width, DRAWING_PHOTO_SIDE)) / width),
}));

test("the long side goes to 1080 px, and a small picture stays as it is", () => {
  expect(shrunkSide(4032, 3024)).toEqual({ width: DRAWING_PHOTO_SIDE });
  expect(shrunkSide(3024, 4032)).toEqual({ height: DRAWING_PHOTO_SIDE });
  expect(shrunkSide(1080, 1080)).toBeNull();
  expect(shrunkSide(800, 600)).toBeNull();
});

test("a picture from the library is handed over whole, then shrunk to a JPEG", async () => {
  const fake = picker();
  expect(await pickDrawingPhoto("library", fake, shrink)).toEqual({
    kind: "picked",
    base64: "c2hydW5r",
    width: 1080,
    height: 810,
  });
  expect(fake.launchImageLibraryAsync).toHaveBeenCalledWith(DRAWING_PHOTO_OPTIONS);
  expect(DRAWING_PHOTO_OPTIONS.allowsEditing).toBe(false);
  expect(shrink).toHaveBeenCalledWith(ASSET.uri, ASSET.width, ASSET.height);
});

test("the camera asks first, and a no is said", async () => {
  const fake = picker({ granted: false });
  expect(await pickDrawingPhoto("camera", fake, shrink)).toEqual({ kind: "denied" });
  expect(fake.launchCameraAsync).not.toHaveBeenCalled();
  const ok = picker();
  expect((await pickDrawingPhoto("camera", ok, shrink)).kind).toBe("picked");
  expect(ok.launchCameraAsync).toHaveBeenCalledWith(DRAWING_PHOTO_OPTIONS);
});

test("nothing chosen, a picker that fails, and a picture that cannot be shrunk are said", async () => {
  expect(
    await pickDrawingPhoto("library", picker({ result: { canceled: true } }), shrink),
  ).toEqual({ kind: "cancelled" });
  expect(await pickDrawingPhoto("library", picker({ fails: true }), shrink)).toEqual({
    kind: "pick_failed",
  });
  const broken: Shrink = async () => {
    throw new Error("no image");
  };
  expect(await pickDrawingPhoto("library", picker(), broken)).toEqual({
    kind: "pick_failed",
  });
});

test("a picture that is still too large after shrinking is refused", async () => {
  const huge: Shrink = async () => ({
    base64: "A".repeat(14_000_000),
    width: 1,
    height: 1,
  });
  expect(await pickDrawingPhoto("library", picker(), huge)).toEqual({
    kind: "too_large",
  });
});
