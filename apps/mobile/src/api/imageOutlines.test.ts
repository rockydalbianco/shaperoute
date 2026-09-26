import imageError from "@shaperoute/shared-types/fixtures/image-error.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";

import { isImageOutline, requestImageOutline } from "./imageOutlines";

const URL = "http://192.168.1.23:8000";

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

test("posts the image in base64 and gets the traced outline", async () => {
  const fetchFn = answering(200, imageOutline);
  const outcome = await requestImageOutline(URL, "aGVsbG8=", { fetchFn });
  expect(outcome).toEqual({ kind: "outline", outline: imageOutline });
  expect(fetchFn).toHaveBeenCalledWith(
    `${URL}/image-outlines`,
    expect.objectContaining({ method: "POST", body: '{"image":"aGVsbG8="}' }),
  );
});

test("a refused image gives the engine's reason", async () => {
  const outcome = await requestImageOutline(URL, "aGVsbG8=", {
    fetchFn: answering(422, imageError),
  });
  expect(outcome).toEqual({ kind: "api_error", ...imageError.error });
  expect(outcome).toMatchObject({ reason: "background" });
});

test("an answer that is not an outline is a bad answer", async () => {
  const outcome = await requestImageOutline(URL, "aGVsbG8=", {
    fetchFn: answering(200, { points: [] }),
  });
  expect(outcome).toEqual({ kind: "bad_answer", status: 200 });
});

test("no API is unreachable, a cancelled request is cancelled", async () => {
  const failing = jest.fn(async () => {
    throw new Error("Network request failed");
  });
  expect(await requestImageOutline(URL, "x", { fetchFn: failing })).toEqual({
    kind: "unreachable",
    url: URL,
  });
  const stop = new AbortController();
  stop.abort();
  expect(
    await requestImageOutline(URL, "x", { fetchFn: failing, signal: stop.signal }),
  ).toEqual({ kind: "cancelled" });
});

test("the guard wants points in [-1, 1], picture points in [0, 1], one each", () => {
  expect(isImageOutline(imageOutline)).toBe(true);
  const [first, ...rest] = imageOutline.points;
  expect(isImageOutline({ ...imageOutline, points: [[2, 0], ...rest] })).toBe(false);
  expect(isImageOutline({ ...imageOutline, image_points: [[-0.1, 0], ...rest] })).toBe(
    false,
  );
  expect(isImageOutline({ ...imageOutline, points: [first, ...rest, first] })).toBe(
    false,
  );
  expect(isImageOutline({ ...imageOutline, aspect: 0 })).toBe(false);
  expect(isImageOutline(null)).toBe(false);
});
