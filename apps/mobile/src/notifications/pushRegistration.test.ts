import type { PushTokenRequest } from "@shaperoute/shared-types";

import type { AccountOutcome } from "../api/accounts";
import type { PushPermission } from "./pushDevice";
import { type PushDeps, sendPushToken, takeBackPushToken } from "./pushRegistration";
import type { PushSent } from "./pushSent";

const PHONE = "ExponentPushToken[this-phone]";
const OK: AccountOutcome<null> = { kind: "ok", value: null };
const OFFLINE: AccountOutcome<null> = { kind: "unreachable", url: "http://api" };

/** A phone, an API and a keychain, faked; `kept` is the keychain. */
function fakes(permission: PushPermission = "granted", token: string | null = PHONE) {
  let kept: PushSent | null = null;
  const keep = jest.fn(async (_request: PushTokenRequest) => OK);
  const forget = jest.fn(async (_token: string) => OK);
  const deps: PushDeps = {
    permission: jest.fn(async () => permission),
    deviceToken: jest.fn(async () => token),
    platform: "ios",
    keep,
    forget,
    sent: () => kept,
    save: async (sent) => {
      kept = sent;
    },
    clear: async () => {
      kept = null;
    },
  };
  return { deps, keep, forget, kept: () => kept };
}

test("allowed, the token goes once, with the platform and the language", async () => {
  const { deps, keep, kept } = fakes();
  expect(await sendPushToken(7, "it", deps)).toEqual({ kind: "sent" });
  expect(keep).toHaveBeenCalledWith({ token: PHONE, platform: "ios", language: "it" });
  expect(kept()).toEqual({ userId: 7, token: PHONE, language: "it" });
  // At the next opening: nothing new to say.
  expect(await sendPushToken(7, "it", deps)).toEqual({ kind: "already" });
  expect(keep).toHaveBeenCalledTimes(1);
});

test("another language, account or token sends it again", async () => {
  const { deps, keep } = fakes();
  await sendPushToken(7, "it", deps);
  await sendPushToken(7, "en", deps);
  await sendPushToken(8, "en", deps);
  expect(keep).toHaveBeenCalledTimes(3);
  deps.deviceToken = async () => "ExponentPushToken[new-one]";
  expect(await sendPushToken(8, "en", deps)).toEqual({ kind: "sent" });
  expect(keep).toHaveBeenCalledTimes(4);
});

test("without the phone's permission, or a token, nothing goes", async () => {
  for (const permission of ["denied", "undetermined"] as const) {
    const { deps, keep } = fakes(permission);
    expect(await sendPushToken(7, "en", deps)).toEqual({ kind: "not_allowed" });
    expect(deps.deviceToken).not.toHaveBeenCalled();
    expect(keep).not.toHaveBeenCalled();
  }
  // Expo Go, or Expo out of reach.
  const { deps, keep } = fakes("granted", null);
  expect(await sendPushToken(7, "en", deps)).toEqual({ kind: "no_token" });
  expect(keep).not.toHaveBeenCalled();
});

test("a token the API did not take is sent again next time", async () => {
  const { deps, keep, kept } = fakes();
  keep.mockResolvedValueOnce(OFFLINE);
  expect(await sendPushToken(7, "en", deps)).toEqual({
    kind: "failed",
    outcome: OFFLINE,
  });
  expect(kept()).toBeNull();
  expect(await sendPushToken(7, "en", deps)).toEqual({ kind: "sent" });
});

test("switched off, the token comes back from the API and is forgotten", async () => {
  const { deps, forget, kept } = fakes();
  await sendPushToken(7, "en", deps);
  expect(await takeBackPushToken(7, deps)).toBe(true);
  expect(forget).toHaveBeenCalledWith(PHONE);
  expect(kept()).toBeNull();
  // Nothing left: nothing asked.
  expect(await takeBackPushToken(7, deps)).toBe(true);
  expect(forget).toHaveBeenCalledTimes(1);
});

test("offline the token is taken back later; an API of before never had it", async () => {
  const { deps, forget, kept } = fakes();
  await sendPushToken(7, "en", deps);
  forget.mockResolvedValueOnce(OFFLINE);
  expect(await takeBackPushToken(7, deps)).toBe(false);
  expect(kept()).not.toBeNull();
  forget.mockResolvedValueOnce({
    kind: "api_error",
    code: "http_error",
    message: "Not Found",
    retryAfterS: null,
  });
  expect(await takeBackPushToken(7, deps)).toBe(true);
  expect(kept()).toBeNull();
});

test("another account's token is not taken back", async () => {
  const { deps, forget } = fakes();
  await sendPushToken(7, "en", deps);
  expect(await takeBackPushToken(8, deps)).toBe(true);
  expect(forget).not.toHaveBeenCalled();
});
