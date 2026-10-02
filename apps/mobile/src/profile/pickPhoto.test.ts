import type * as ImagePicker from "expo-image-picker";

import { PHOTO_OPTIONS, pickPhoto } from "./pickPhoto";

const ASSET = { uri: "file:///me.jpg", width: 1200, height: 1200, base64: "aGVsbG8=" };

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

test("a picture from the library comes as base64, cropped to a square by the phone", async () => {
  const fake = picker();
  expect(await pickPhoto("library", fake)).toEqual({
    kind: "picked",
    base64: ASSET.base64,
  });
  expect(fake.launchImageLibraryAsync).toHaveBeenCalledWith(PHOTO_OPTIONS);
  expect(fake.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(PHOTO_OPTIONS).toMatchObject({
    base64: true,
    allowsEditing: true,
    aspect: [1, 1],
    exif: false,
  });
});

test("the camera asks first; refused, it says so", async () => {
  const fake = picker({ granted: false });
  expect(await pickPhoto("camera", fake)).toEqual({ kind: "denied" });
  expect(fake.launchCameraAsync).not.toHaveBeenCalled();
  const allowed = picker();
  expect((await pickPhoto("camera", allowed)).kind).toBe("picked");
  expect(allowed.launchCameraAsync).toHaveBeenCalledWith(PHOTO_OPTIONS);
});

test("cancelled, failed, empty and too large pictures", async () => {
  const cancelled = picker({ result: { canceled: true, assets: null } });
  expect(await pickPhoto("library", cancelled)).toEqual({ kind: "cancelled" });
  expect(await pickPhoto("library", picker({ fails: true }))).toEqual({
    kind: "pick_failed",
  });
  const noData = { canceled: false, assets: [{ ...ASSET, base64: null }] };
  expect(await pickPhoto("library", picker({ result: noData }))).toEqual({
    kind: "pick_failed",
  });
  // 13 333 340 characters of base64: 10 000 005 bytes.
  const huge = {
    canceled: false,
    assets: [{ ...ASSET, base64: "A".repeat(13_333_340) }],
  };
  expect(await pickPhoto("library", picker({ result: huge }))).toEqual({
    kind: "too_large",
  });
});
