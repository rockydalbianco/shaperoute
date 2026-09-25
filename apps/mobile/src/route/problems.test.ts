import { problemText } from "./problems";
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
    "Cannot reach the API at http://192.168.1.23:8000. Start it on the PC with --lan, on the same Wi-Fi.",
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
