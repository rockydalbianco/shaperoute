import editRequest from "@shaperoute/shared-types/fixtures/image-outline-edit-request.json";
import edited from "@shaperoute/shared-types/fixtures/image-outline-edited.json";
import imageOutline from "@shaperoute/shared-types/fixtures/image-outline.json";
import editError from "@shaperoute/shared-types/fixtures/outline-edit-error.json";
import type { ImageOutline, OutlinePoint } from "@shaperoute/shared-types";

import { isImageOutline } from "./imageOutlines";
import { requestOutlineEdit } from "./outlineEdits";

const URL = "http://192.168.1.23:8000";
const OUTLINE = imageOutline as ImageOutline;
const LINE = editRequest.line as OutlinePoint[];

function answering(status: number, body: unknown) {
  return jest.fn(async () => Response.json(body, { status }));
}

test("sends the outline shown and the line, and gets the new outline", async () => {
  const fetchFn = answering(200, edited);
  const outcome = await requestOutlineEdit(URL, OUTLINE, "detail", LINE, { fetchFn });
  expect(outcome).toEqual({ kind: "outline", outline: edited });
  const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${URL}/image-outline-edits`);
  // The same request as the contract's fixture.
  expect(JSON.parse(init.body as string)).toEqual(editRequest);
});

test("a refused drawing gives the engine's reason", async () => {
  const outcome = await requestOutlineEdit(URL, OUTLINE, "detail", LINE, {
    fetchFn: answering(422, editError),
  });
  expect(outcome).toEqual({ kind: "api_error", ...editError.error });
  expect(outcome).toMatchObject({ reason: "crosses" });
});

test("no API is unreachable, a cancelled request is cancelled", async () => {
  const failing = jest.fn(async () => {
    throw new Error("Network request failed");
  });
  expect(
    await requestOutlineEdit(URL, OUTLINE, "part", LINE, { fetchFn: failing }),
  ).toEqual({ kind: "unreachable", url: URL });
  const stop = new AbortController();
  stop.abort();
  expect(
    await requestOutlineEdit(URL, OUTLINE, "part", LINE, {
      fetchFn: failing,
      signal: stop.signal,
    }),
  ).toEqual({ kind: "cancelled" });
});

test("an answer that is not an outline is a bad answer", async () => {
  const outcome = await requestOutlineEdit(URL, OUTLINE, "part", LINE, {
    fetchFn: answering(200, { ...edited, image_strokes: [] }),
  });
  expect(outcome).toEqual({ kind: "bad_answer", status: 200 });
});

test("the guard wants details in both frames, one for one", () => {
  expect(isImageOutline(edited)).toBe(true);
  const { strokes, image_strokes, ...traced } = edited;
  expect(isImageOutline(traced)).toBe(true); // an API older than TASK-079
  expect(isImageOutline({ ...traced, strokes })).toBe(false);
  expect(
    isImageOutline({
      ...edited,
      strokes: [
        [
          [2, 0],
          [0, 0],
        ],
      ],
    }),
  ).toBe(false);
  expect(isImageOutline({ ...edited, image_strokes: [[[0.5, 0.5]]] })).toBe(false);
  expect(
    isImageOutline({ ...edited, image_strokes: [...image_strokes, ...image_strokes] }),
  ).toBe(false);
});

test("the key goes with the edit (TASK-081)", async () => {
  const fetchFn = answering(200, edited);
  await requestOutlineEdit(URL, OUTLINE, "detail", LINE, {
    fetchFn,
    key: "secret-key-for-tests",
  });
  const init = (fetchFn.mock.calls[0] as unknown[])[1] as RequestInit;
  expect(new Headers(init.headers).get("X-API-Key")).toBe("secret-key-for-tests");
});
