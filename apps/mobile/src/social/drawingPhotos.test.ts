import myDrawing from "@shaperoute/shared-types/fixtures/my-drawing.json";

import { answers, apiError } from "../account/testing";
import {
  DRAWING_PHOTO_PREFIX,
  DRAWING_PHOTOS_FILE,
  forgetAllPhotosOf,
  forgetPhotosOf,
  keepPhoto,
  keepPhotos,
  loadDrawingPhotos,
  phonePhotoUri,
  photosOnPhone,
  removePhoto,
  syncPhotos,
} from "./drawingPhotos";

// The phone's documents folder, in memory.
jest.mock("expo-file-system", () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(directory: { uri: string }, name: string) {
      this.uri = `${directory.uri}${name}`;
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    create(): void {
      files.set(this.uri, "");
    }
    write(text: string): void {
      files.set(this.uri, text);
    }
    textSync(): string {
      return files.get(this.uri) ?? "";
    }
    delete(): void {
      files.delete(this.uri);
    }
  }
  return { File, files, Paths: { document: { uri: "file:///documents/" } } };
});

const { files } = jest.requireMock<{ files: Map<string, string> }>("expo-file-system");
const URL = "http://api";
const TOKEN = "the-token";
const options = (fetchFn: jest.Mock) => ({ fetchFn, key: null });
const photoFile = (owner: number, key: string, n: number) =>
  `file:///documents/${DRAWING_PHOTO_PREFIX}${owner}-${key}-${n}.b64`;

beforeEach(() => {
  files.clear();
});

test("a photo is kept in a file of its own, and listed as not sent", () => {
  expect(keepPhoto(1, "a", 2, "BBBB")).toBe(true);
  expect(files.get(photoFile(1, "a", 2))).toBe("BBBB");
  expect(loadDrawingPhotos()).toEqual([{ owner: 1, key: "a", n: 2, sent: false }]);
  expect(photosOnPhone(1, "a")).toEqual([{ n: 2, base64: "BBBB" }]);
  expect(phonePhotoUri("BBBB")).toBe("data:image/jpeg;base64,BBBB");
  // In place of the one there, and sent no more.
  files.set(
    `file:///documents/${DRAWING_PHOTOS_FILE}`,
    JSON.stringify([{ owner: 1, key: "a", n: 2, sent: true }]),
  );
  keepPhoto(1, "a", 2, "B2B2");
  expect(loadDrawingPhotos()).toEqual([{ owner: 1, key: "a", n: 2, sent: false }]);
  expect(photosOnPhone(1, "a")).toEqual([{ n: 2, base64: "B2B2" }]);
});

test("the photos of the end of a run take the places 1, 2, 3 in order", () => {
  keepPhotos(1, "a", ["AAAA", "BBBB"]);
  expect(photosOnPhone(1, "a")).toEqual([
    { n: 1, base64: "AAAA" },
    { n: 2, base64: "BBBB" },
  ]);
  expect(photosOnPhone(1, "b")).toEqual([]);
  expect(photosOnPhone(2, "a")).toEqual([]);
});

test("a photo taken off is gone from the phone; one the API has is to be emptied there", () => {
  keepPhoto(1, "a", 1, "AAAA");
  removePhoto(1, "a", 1, false);
  expect(files.has(photoFile(1, "a", 1))).toBe(false);
  expect(loadDrawingPhotos()).toEqual([]);

  keepPhoto(1, "a", 2, "BBBB");
  files.set(
    `file:///documents/${DRAWING_PHOTOS_FILE}`,
    JSON.stringify([{ owner: 1, key: "a", n: 2, sent: true }]),
  );
  removePhoto(1, "a", 2, false);
  expect(loadDrawingPhotos()).toEqual([
    { owner: 1, key: "a", n: 2, sent: true, removed: true },
  ]);
  expect(photosOnPhone(1, "a")).toEqual([]);

  // Never on this phone, only on the API: the same.
  removePhoto(1, "a", 3, true);
  expect(loadDrawingPhotos()).toContainEqual({
    owner: 1,
    key: "a",
    n: 3,
    sent: true,
    removed: true,
  });
});

test("a run gone takes its photos; an account gone takes them all", () => {
  keepPhotos(1, "a", ["AAAA"]);
  keepPhotos(1, "b", ["BBBB"]);
  keepPhotos(2, "a", ["CCCC"]);
  forgetPhotosOf(1, "a");
  expect(files.has(photoFile(1, "a", 1))).toBe(false);
  expect(loadDrawingPhotos().map((item) => [item.owner, item.key])).toEqual([
    [1, "b"],
    [2, "a"],
  ]);
  forgetAllPhotosOf(1);
  expect(files.has(photoFile(1, "b", 1))).toBe(false);
  expect(loadDrawingPhotos()).toEqual([{ owner: 2, key: "a", n: 1, sent: false }]);
});

test("while others see the run, the photos not on the API go to their places, in order", async () => {
  keepPhotos(1, "a", ["AAAA", "BBBB", "CCCC"]);
  files.set(
    `file:///documents/${DRAWING_PHOTOS_FILE}`,
    JSON.stringify([
      { owner: 1, key: "a", n: 3, sent: false },
      { owner: 1, key: "a", n: 1, sent: true },
      { owner: 1, key: "a", n: 2, sent: false },
    ]),
  );
  const fetchFn = answers(
    { status: 200, body: myDrawing },
    { status: 200, body: myDrawing },
  );
  expect(await syncPhotos(URL, TOKEN, 1, "a", "followers", options(fetchFn))).toBe(
    "done",
  );
  expect(fetchFn.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
    ["http://api/me/activities/a/drawing/photos/2", "PUT"],
    ["http://api/me/activities/a/drawing/photos/3", "PUT"],
  ]);
  expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toEqual({ image: "BBBB" });
  expect(loadDrawingPhotos().every((item) => item.sent)).toBe(true);
});

test("with «Only me» the API dropped its photos: they are all to send again", async () => {
  keepPhotos(1, "a", ["AAAA"]);
  files.set(
    `file:///documents/${DRAWING_PHOTOS_FILE}`,
    JSON.stringify([
      { owner: 1, key: "a", n: 1, sent: true },
      { owner: 1, key: "a", n: 2, sent: true, removed: true },
      { owner: 2, key: "a", n: 1, sent: true },
    ]),
  );
  const fetchFn = answers();
  expect(await syncPhotos(URL, TOKEN, 1, "a", "only_me", options(fetchFn))).toBe(
    "done",
  );
  expect(fetchFn).not.toHaveBeenCalled();
  expect(loadDrawingPhotos()).toEqual([
    { owner: 1, key: "a", n: 1, sent: false },
    { owner: 2, key: "a", n: 1, sent: true },
  ]);
});

test("a place emptied here is emptied on the API, then forgotten", async () => {
  files.set(
    `file:///documents/${DRAWING_PHOTOS_FILE}`,
    JSON.stringify([{ owner: 1, key: "a", n: 2, sent: true, removed: true }]),
  );
  const fetchFn = answers({ status: 204 });
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(fetchFn.mock.calls[0][0]).toBe("http://api/me/activities/a/drawing/photos/2");
  expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  expect(loadDrawingPhotos()).toEqual([]);
});

test("a photo the API will not take yet waits, with the ones after it", async () => {
  keepPhotos(1, "a", ["AAAA", "BBBB"]);
  const fetchFn = answers({
    status: 409,
    body: apiError("http_error", "Photos stay on the phone…"),
  });
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "waits",
  );
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(loadDrawingPhotos().map((item) => item.sent)).toEqual([false, false]);

  const offline = answers(new TypeError("Network request failed"));
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(offline))).toBe(
    "waits",
  );
});

test("a file the API will never take is let go", async () => {
  keepPhotos(1, "a", ["notaphoto", "BBBB"]);
  const fetchFn = answers(
    { status: 422, body: apiError("invalid_request", "Not a photo.") },
    { status: 200, body: myDrawing },
  );
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(files.has(photoFile(1, "a", 1))).toBe(false);
  expect(loadDrawingPhotos()).toEqual([{ owner: 1, key: "a", n: 2, sent: true }]);
});

test("an ended session stops and says so", async () => {
  keepPhotos(1, "a", ["AAAA"]);
  const fetchFn = answers({ status: 401, body: apiError("session_expired") });
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "session_ended",
  );
  expect(loadDrawingPhotos()).toEqual([{ owner: 1, key: "a", n: 1, sent: false }]);
});

test("nothing to send is done at once", async () => {
  const fetchFn = answers();
  expect(await syncPhotos(URL, TOKEN, 1, "a", "everyone", options(fetchFn))).toBe(
    "done",
  );
  expect(fetchFn).not.toHaveBeenCalled();
});
