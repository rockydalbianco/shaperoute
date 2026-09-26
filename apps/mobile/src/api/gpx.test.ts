import type { GpxRequest } from "@shaperoute/shared-types";
import gpxRequest from "@shaperoute/shared-types/fixtures/gpx-request.json";

import { FALLBACK_FILE_NAME, fileNameOf, requestGpx } from "./gpx";

const URL = "http://192.168.1.23:8000";
const BODY = gpxRequest as GpxRequest;
const GPX = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1"></gpx>\n';

function answers(response: Response): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue(response);
}

test("posts request and result, and gets the file with its name", async () => {
  const fetchFn = answers(
    new Response(GPX, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition":
          'attachment; filename="shaperoute-heart-5km-2026-09-23.gpx"',
      },
    }),
  );
  await expect(requestGpx(URL, BODY, fetchFn)).resolves.toEqual({
    kind: "gpx",
    text: GPX,
    fileName: "shaperoute-heart-5km-2026-09-23.gpx",
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe(`${URL}/gpx`);
  expect(init?.method).toBe("POST");
  expect(JSON.parse(String(init?.body))).toEqual(gpxRequest);
});

test("an error of the API keeps its code", async () => {
  const error = { error: { code: "invalid_request", message: "result: missing" } };
  const outcome = await requestGpx(
    URL,
    BODY,
    answers(Response.json(error, { status: 422 })),
  );
  expect(outcome).toEqual({ kind: "api_error", ...error.error });
});

test("a network failure says where the API was looked for", async () => {
  const fetchFn = jest.fn().mockRejectedValue(new TypeError("Network request failed"));
  await expect(requestGpx(URL, BODY, fetchFn)).resolves.toEqual({
    kind: "unreachable",
    url: URL,
  });
});

test("a 200 that is not GPX is a bad answer", async () => {
  const outcome = await requestGpx(URL, BODY, answers(new Response("<html></html>")));
  expect(outcome).toEqual({ kind: "bad_answer", status: 200 });
});

test.each([
  [
    'attachment; filename="shaperoute-circle-3km-2026-09-23.gpx"',
    "shaperoute-circle-3km-2026-09-23.gpx",
  ],
  [null, FALLBACK_FILE_NAME],
  ['attachment; filename="../../etc/passwd"', FALLBACK_FILE_NAME],
  ['attachment; filename="route.txt"', FALLBACK_FILE_NAME],
])("fileNameOf(%p) is %p", (disposition, name) => {
  expect(fileNameOf(disposition)).toBe(name);
});

test("the key goes with the request (TASK-081)", async () => {
  const fetchFn = answers(new Response(GPX));
  await requestGpx(URL, BODY, fetchFn, "secret-key-for-tests");
  const [, init] = fetchFn.mock.calls[0];
  expect(new Headers(init?.headers).get("X-API-Key")).toBe("secret-key-for-tests");
});
