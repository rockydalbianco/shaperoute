import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { cachedPhotoName, PhotoViewer } from "./PhotoViewer";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

// A photo of a post in «Feed» on the whole screen: «Save» downloads it with
// the post's headers and opens the phone's sheet, where it is saved.

const SOURCE = {
  uri: "http://api/drawings/d1/photos/2",
  headers: { Authorization: "Bearer tok" },
};

async function show(
  download: jest.Mock = jest.fn().mockResolvedValue(undefined),
  share: jest.Mock = jest.fn().mockResolvedValue(undefined),
  onClose: jest.Mock = jest.fn(),
) {
  await render(
    <PhotoViewer
      source={SOURCE}
      drawingId="d1"
      n={2}
      onClose={onClose}
      download={download}
      share={share}
    />,
  );
  return { download, share, onClose };
}

test("shows the whole photo, not cut", async () => {
  await show();
  const image = screen.getByTestId("feed-photo-whole");
  expect(image.props.source).toEqual(SOURCE);
  expect(image.props.resizeMode).toBe("contain");
});

test("«Save» downloads the photo with its headers and opens the sheet", async () => {
  const { download, share } = await show();
  await act(async () => {
    fireEvent.press(screen.getByTestId("feed-photo-save"));
  });
  expect(download).toHaveBeenCalledTimes(1);
  const [url, fileUri, headers] = download.mock.calls[0];
  expect(url).toBe(SOURCE.uri);
  expect(fileUri).toMatch(/feed-photo-d1-2\.jpg$/);
  expect(headers).toEqual(SOURCE.headers);
  expect(share).toHaveBeenCalledWith(fileUri);
});

test("without a connection it says so and opens no sheet", async () => {
  const { share } = await show(jest.fn().mockRejectedValue(new Error("offline")));
  await act(async () => {
    fireEvent.press(screen.getByTestId("feed-photo-save"));
  });
  expect(share).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toBeOnTheScreen();
});

test("a sheet closed without saving says nothing", async () => {
  await show(undefined, jest.fn().mockRejectedValue(new Error("dismissed")));
  await act(async () => {
    fireEvent.press(screen.getByTestId("feed-photo-save"));
  });
  expect(screen.queryByRole("alert")).toBeNull();
});

test("«Close» closes it", async () => {
  const { onClose } = await show();
  await fireEvent.press(screen.getByTestId("feed-photo-close"));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("the cached name is safe for a file", () => {
  expect(cachedPhotoName("a/b c", 3)).toBe("feed-photo-a_b_c-3.jpg");
});
