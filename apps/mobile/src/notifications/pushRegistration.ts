import type {
  PushLanguage,
  PushPlatform,
  PushTokenRequest,
} from "@shaperoute/shared-types";

import type { AccountOutcome } from "../api/accounts";
import type { PushPermission } from "./pushDevice";
import type { PushSent } from "./pushSent";

/**
 * When this phone's push token goes to the API and when it comes back
 * (TASK-262, ADR-0226), with the phone, the API and the keychain handed
 * in: the tests give fakes.
 *
 * - «Push notifications» on, the phone allowing them: the token goes to the
 *   API, once; again only for another account, another token or another
 *   language of the app.
 * - Switched off, or logging out: the token comes back from the API.
 *
 * Nothing here asks the phone for the permission: only the switch does
 * (`NotificationsSetting`).
 */
export type PushDeps = {
  permission: () => Promise<PushPermission>;
  deviceToken: () => Promise<string | null>;
  platform: PushPlatform;
  keep: (request: PushTokenRequest) => Promise<AccountOutcome<null>>;
  forget: (pushToken: string) => Promise<AccountOutcome<null>>;
  sent: () => PushSent | null;
  save: (sent: PushSent) => Promise<void>;
  clear: () => Promise<void>;
};

export type Sending =
  | { kind: "sent" }
  | { kind: "already" }
  | { kind: "not_allowed" }
  | { kind: "no_token" }
  | { kind: "failed"; outcome: Exclude<AccountOutcome<null>, { kind: "ok" }> };

/** «Push notifications» is on for `userId`: the token on the API, once. */
export async function sendPushToken(
  userId: number,
  language: PushLanguage,
  deps: PushDeps,
): Promise<Sending> {
  if ((await deps.permission()) !== "granted") {
    return { kind: "not_allowed" };
  }
  const token = await deps.deviceToken();
  if (token === null) {
    return { kind: "no_token" };
  }
  const before = deps.sent();
  if (
    before !== null &&
    before.userId === userId &&
    before.token === token &&
    before.language === language
  ) {
    return { kind: "already" };
  }
  const outcome = await deps.keep({ token, platform: deps.platform, language });
  if (outcome.kind !== "ok") {
    return { kind: "failed", outcome };
  }
  await deps.save({ userId, token, language });
  return { kind: "sent" };
}

/**
 * «Push notifications» is off for `userId`: the token this phone sent for
 * it comes back from the API. True once nothing of it is left there; false
 * when the API could not be told, and it is tried again next time.
 */
export async function takeBackPushToken(
  userId: number,
  deps: Pick<PushDeps, "forget" | "sent" | "clear">,
): Promise<boolean> {
  const before = deps.sent();
  if (before === null || before.userId !== userId) {
    return true;
  }
  const outcome = await deps.forget(before.token);
  // An API older than TASK-262 never had it.
  const gone =
    outcome.kind === "ok" ||
    (outcome.kind === "api_error" && outcome.code === "http_error");
  if (gone) {
    await deps.clear();
  }
  return gone;
}
