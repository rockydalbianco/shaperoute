import { imageProblemText, problemText } from "./problems";

// An API reached from outside the home Wi-Fi asks for a key and limits
// requests (TASK-081, ADR-0076): the screen says what to do. Since TASK-256
// a key refused is said for whoever runs: an app too old, to update; where
// the key goes is for the developer, under `detail`.

test("a wrong key says to update the app", () => {
  const problem = {
    kind: "api_error",
    code: "unauthorized",
    message: "Missing or wrong API key: send it in the X-API-Key header.",
  } as const;
  expect(problemText(problem)).toEqual({
    text: "This version of the app is no longer allowed in. Update the app.",
    detail: problem.message,
  });
  expect(imageProblemText(problem).text).toMatch(/Update the app/);
});

test("too many requests says to wait", () => {
  expect(
    problemText({ kind: "api_error", code: "too_many_requests", message: "Wait" }),
  ).toEqual({
    text: "Too many requests to the API in the last minute. Wait a minute, then try again.",
    detail: "Wait",
  });
});
