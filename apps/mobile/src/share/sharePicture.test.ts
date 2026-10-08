import * as Sharing from "expo-sharing";
import { createRef } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { pictureProblem, sharePicture } from "./sharePicture";

jest.mock("expo-file-system");
jest.mock("react-native-view-shot");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const isAvailable = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);
const capture = jest.mocked(captureRef);

function shown() {
  const view = createRef<View>();
  (view as { current: View | null }).current = {} as View;
  return view;
}

beforeEach(() => {
  isAvailable.mockReset().mockResolvedValue(true);
  share.mockReset().mockResolvedValue();
  capture.mockClear();
});

test("makes a PNG of the post and opens the share sheet with it", async () => {
  const view = shown();
  await expect(sharePicture(view)).resolves.toBe("shared");
  expect(capture).toHaveBeenCalledWith(view, { format: "png", result: "tmpfile" });
  expect(share).toHaveBeenCalledWith("file:///cache/post.png", {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Share",
  });
  expect(pictureProblem("shared")).toBeNull();
});

test("without a share sheet no picture is made", async () => {
  isAvailable.mockResolvedValue(false);
  await expect(sharePicture(shown())).resolves.toBe("no_sharing");
  expect(capture).not.toHaveBeenCalled();
  expect(pictureProblem("no_sharing")).toBe("This phone cannot open the share sheet.");
});

test("a picture not made, or a sheet that does not open, is said", async () => {
  capture.mockRejectedValueOnce(new Error("no view"));
  await expect(sharePicture(shown())).resolves.toBe("failed");
  expect(share).not.toHaveBeenCalled();

  share.mockRejectedValueOnce(new Error("busy"));
  await expect(sharePicture(shown())).resolves.toBe("failed");

  await expect(sharePicture(createRef<View>())).resolves.toBe("failed");
  expect(pictureProblem("failed")).toBe("The picture could not be made. Try again.");
});
