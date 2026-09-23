import * as Sharing from "expo-sharing";

import { GPX_UTI, shareGpx } from "./shareGpx";

jest.mock("expo-file-system");
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

const { written } =
  jest.requireMock<typeof import("../../__mocks__/expo-file-system")>(
    "expo-file-system",
  );
const isAvailable = jest.mocked(Sharing.isAvailableAsync);
const share = jest.mocked(Sharing.shareAsync);

const GPX = '<?xml version="1.0"?><gpx version="1.1"></gpx>';

beforeEach(() => {
  written.clear();
  isAvailable.mockReset();
  share.mockReset();
});

test("saves the file in the cache folder and shares it as GPX", async () => {
  isAvailable.mockResolvedValue(true);
  share.mockResolvedValue();
  await expect(shareGpx(GPX, "shaperoute-heart-5km-2026-09-23.gpx")).resolves.toBe(
    "shared",
  );
  const uri = "file:///cache/shaperoute-heart-5km-2026-09-23.gpx";
  expect(written.get(uri)).toBe(GPX);
  expect(share).toHaveBeenCalledWith(uri, {
    mimeType: "application/gpx+xml",
    UTI: GPX_UTI,
    dialogTitle: "Export GPX",
  });
});

test("without a share sheet nothing is written", async () => {
  isAvailable.mockResolvedValue(false);
  await expect(shareGpx(GPX, "a.gpx")).resolves.toBe("no_sharing");
  expect(written.size).toBe(0);
  expect(share).not.toHaveBeenCalled();
});
