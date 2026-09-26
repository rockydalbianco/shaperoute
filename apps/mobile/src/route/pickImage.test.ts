import { MAX_IMAGE_BYTES } from "@shaperoute/shared-types";
import type * as ImagePicker from "expo-image-picker";

import { base64Bytes, pickImage, PICKER_OPTIONS } from "./pickImage";

const ASSET = { uri: "file:///cat.jpg", width: 3024, height: 4032, base64: "aGVsbG8=" };

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

test("a picture from the library comes as JPEG in base64, uncropped", async () => {
  const fake = picker();
  expect(await pickImage("library", fake)).toEqual({
    kind: "picked",
    picture: { uri: ASSET.uri, width: 3024, height: 4032 },
    base64: ASSET.base64,
  });
  expect(fake.launchImageLibraryAsync).toHaveBeenCalledWith(PICKER_OPTIONS);
  expect(fake.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  expect(PICKER_OPTIONS).toMatchObject({ base64: true, allowsEditing: false });
});

test("the camera asks first; refused, it says so", async () => {
  const fake = picker({ granted: false });
  expect(await pickImage("camera", fake)).toEqual({ kind: "denied" });
  expect(fake.launchCameraAsync).not.toHaveBeenCalled();
  const allowed = picker();
  expect((await pickImage("camera", allowed)).kind).toBe("picked");
  expect(allowed.launchCameraAsync).toHaveBeenCalled();
});

test("cancelled, failed, empty and too large pictures", async () => {
  const cancelled = picker({ result: { canceled: true, assets: null } });
  expect(await pickImage("library", cancelled)).toEqual({ kind: "cancelled" });
  expect(await pickImage("library", picker({ fails: true }))).toEqual({
    kind: "pick_failed",
  });
  const noData = { canceled: false, assets: [{ ...ASSET, base64: null }] };
  expect(await pickImage("library", picker({ result: noData }))).toEqual({
    kind: "pick_failed",
  });
  // 13 333 340 characters of base64: 10 000 005 bytes.
  const huge = "A".repeat(13_333_340);
  const big = { canceled: false, assets: [{ ...ASSET, base64: huge }] };
  expect(await pickImage("library", picker({ result: big }))).toEqual({
    kind: "too_large",
    bytes: MAX_IMAGE_BYTES + 5,
  });
});

test("base64 sizes without decoding", () => {
  expect(base64Bytes("aGVsbG8=")).toBe(5);
  expect(base64Bytes("aGVsbA==")).toBe(4);
  expect(base64Bytes("aGVs")).toBe(3);
});
