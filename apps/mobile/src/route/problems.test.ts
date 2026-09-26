import { IMAGE_REASONS } from "@shaperoute/shared-types";

import { imageProblemText, problemText, REASON_TEXT } from "./problems";
import type { RouteProblem } from "./useRouteRequest";

const REASON = "a 5 km heart cannot be drawn here: the best route scores 0.52";

test.each<[RouteProblem, string, string | undefined]>([
  [
    { kind: "api_error", code: "map_data_unavailable", message: "Overpass timed out" },
    "Map data for this area could not be downloaded. Try again later.",
    "Overpass timed out",
  ],
  [
    { kind: "api_error", code: "engine_error", message: "see the API log" },
    "The route engine failed. Try again; if it happens again, look at the API log.",
    undefined,
  ],
  [
    { kind: "api_error", code: "invalid_request", message: "distance_m: missing" },
    "The app and the API do not agree (a bug): invalid_request.",
    "distance_m: missing",
  ],
  [
    { kind: "api_error", code: "http_error", message: "Not Found" },
    "The app and the API do not agree (a bug): http_error.",
    "Not Found",
  ],
  [
    { kind: "bad_answer", status: 502 },
    "The app and the API do not agree (a bug): unexpected answer, HTTP 502.",
    undefined,
  ],
  [
    { kind: "unreachable", url: "http://192.168.1.23:8000" },
    "Cannot reach the API at http://192.168.1.23:8000. Check that it is running (on the PC: with --lan) and that the phone can reach it: same Wi-Fi, Tailscale on, or the server address in apps/mobile/.env (docs/DEPLOY.md).",
    undefined,
  ],
  [
    { kind: "timeout" },
    "The API took more than 5 minutes. Try again later, or a shorter distance.",
    undefined,
  ],
  [
    { kind: "lost" },
    "The API lost this request (was it restarted?). Try again.",
    undefined,
  ],
  [{ kind: "no_sharing" }, "This phone cannot open the share sheet.", undefined],
  [
    { kind: "share_failed" },
    "The GPX could not be saved on the phone. Try again.",
    undefined,
  ],
  [
    { kind: "no_api_url" },
    "The app does not know where the API is: open it from the QR code of npm run mobile on the PC.",
    undefined,
  ],
])("%j", (problem, text, detail) => {
  expect(problemText(problem)).toEqual(detail ? { text, detail } : { text });
});

const FAR =
  "a 7 km heart cannot be drawn here: the best shape is -2.7 km from the target";

test("a shape that misses the distance offers the distance it fits", () => {
  expect(
    problemText({
      kind: "api_error",
      code: "shape_not_drawable",
      message: FAR,
      suggested_distance_m: 4000,
    }),
  ).toEqual({
    text: "This shape does not fit the roads here at this distance. It fits at about 4 km.",
    detail: FAR,
    tryDistanceM: 4000,
  });
});

test.each([null, undefined, 30_000])(
  "without a distance the app can ask for (%p), the shapes are offered",
  (suggested) => {
    expect(
      problemText({
        kind: "api_error",
        code: "shape_not_drawable",
        message: REASON,
        suggested_distance_m: suggested,
      }),
    ).toEqual({
      text: "This shape does not fit the roads here. Try another shape, or another start:",
      detail: REASON,
      pickShape: true,
    });
  },
);

test("a word that fits at another distance offers it, as a word", () => {
  expect(
    problemText(
      {
        kind: "api_error",
        code: "shape_not_drawable",
        message: FAR,
        suggested_distance_m: 15_000,
      },
      "word",
    ),
  ).toEqual({
    text: "This word does not fit the roads here at this distance. It fits at about 15 km.",
    detail: FAR,
    tryDistanceM: 15_000,
  });
});

test("a word that does not fit is not offered the shapes", () => {
  expect(
    problemText(
      { kind: "api_error", code: "shape_not_drawable", message: REASON },
      "word",
    ),
  ).toEqual({
    text: "This word does not fit the roads here. Try a shorter word, or another start.",
    detail: REASON,
  });
});

test("every reason the engine gives has its own plain words", () => {
  for (const reason of IMAGE_REASONS) {
    const { text, detail } = problemText({
      kind: "api_error",
      code: "image_not_usable",
      message: "engine words",
      reason,
    });
    expect(text).toBe(REASON_TEXT[reason]);
    expect(detail).toBe("engine words");
  }
  expect(new Set(Object.values(REASON_TEXT)).size).toBe(IMAGE_REASONS.length);
  expect(REASON_TEXT.background).toMatch(/plain background/);
});

test("an image refused by an API without reasons still says something", () => {
  const problem = {
    kind: "api_error",
    code: "image_not_usable",
    message: "m",
  } as const;
  expect(problemText(problem).text).toMatch(/one clear outline/);
});

test("an outline that does not fit offers the distance, but no shapes", () => {
  const notDrawable = {
    kind: "api_error",
    code: "shape_not_drawable",
    message: REASON,
  } as const;
  const text = problemText(notDrawable, "image");
  expect(text.text).toMatch(/This outline does not fit/);
  expect(text.pickShape).toBeUndefined();
  expect(
    problemText({ ...notDrawable, suggested_distance_m: 9000 }, "image"),
  ).toMatchObject({ text: expect.stringMatching(/^This image/), tryDistanceM: 9000 });
});

test("picking problems are said before any API is asked", () => {
  expect(imageProblemText({ kind: "denied" }).text).toMatch(/camera is off/);
  expect(imageProblemText({ kind: "too_large", bytes: 12_300_000 }).text).toBe(
    "This picture is too large: 12.3 MB, at most 10 MB. Choose a smaller one.",
  );
  expect(imageProblemText({ kind: "pick_failed" }).text).toMatch(/could not be opened/);
  expect(imageProblemText({ kind: "unreachable", url: "http://pc:8000" }).text).toMatch(
    /Cannot reach the API/,
  );
});
