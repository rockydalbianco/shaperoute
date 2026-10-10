import assert from "node:assert/strict";
import { test } from "node:test";

import data from "../fixtures/push-data.json" with { type: "json" };
import token from "../fixtures/push-token-request.json" with { type: "json" };
import type { PushData, PushKind, PushTokenRequest } from "../src/index.ts";

// The same JSON is read by the API's test_push.py (TASK-262).
const request: PushTokenRequest = {
  ...token,
  platform: token.platform === "android" ? "android" : "ios",
  language: "it",
};
const kinds: PushKind[] = ["comment", "follow_request"];
const opened: PushData[] = [
  { kind: kinds[0], drawing_id: data[0].drawing_id ?? "" },
  {
    kind: kinds[1],
    public_id: data[1].public_id ?? "",
    username: data[1].username ?? "",
  },
];

test("the push token example is a token of Expo's", () => {
  assert.match(request.token, /^ExponentPushToken\[.+\]$/);
  assert.equal(request.platform, token.platform);
  assert.equal(request.language, token.language);
});

test("a notification opens a drawing or a profile", () => {
  assert.deepEqual(
    data.map((d) => d.kind),
    kinds,
  );
  assert.deepEqual(
    opened.map((d) => ("drawing_id" in d ? "drawing" : "profile")),
    ["drawing", "profile"],
  );
});
