import { imageProblemText, problemText } from "./problems";

// An API reached from outside the home Wi-Fi asks for a key and limits
// requests (TASK-081, ADR-0076): the screen says what to do.

test("a wrong key says where the key goes", () => {
  const problem = {
    kind: "api_error",
    code: "unauthorized",
    message: "Missing or wrong API key: send it in the X-API-Key header.",
  } as const;
  expect(problemText(problem)).toEqual({
    text: "The API refused this app's key. Put the API's key in EXPO_PUBLIC_API_KEY in apps/mobile/.env, then restart npm run mobile (docs/DEPLOY.md).",
    detail: problem.message,
  });
  expect(imageProblemText(problem).text).toMatch(/refused this app's key/);
});

test("too many requests says to wait", () => {
  expect(
    problemText({ kind: "api_error", code: "too_many_requests", message: "Wait" }),
  ).toEqual({
    text: "Too many requests to the API in the last minute. Wait a minute, then try again.",
    detail: "Wait",
  });
});
