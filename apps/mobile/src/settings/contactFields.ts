import type {
  ChangeEmailRequest,
  ChangePhoneRequest,
  User,
} from "@shaperoute/shared-types";

import { type Checked, emailProblem } from "../account/fields";
import { accountProblem } from "../account/messages";
import type { AccountOutcome } from "../api/accounts";
import { t, tLater } from "../i18n";

/**
 * What «Change email» and «Phone number» check before asking the API
 * (TASK-183): the API's own rules (docs/API.md, «Email and phone number»),
 * so a mistake is told in words at once.
 */

type Failed = Exclude<AccountOutcome<unknown>, { kind: "ok" }>;

/** An API older than TASK-183 has no PUT /me/email. Shown with `t()`. */
export const NO_EMAIL_CHANGE = tLater(
  "Changing the email is not available on this API yet.",
);

/** An API older than TASK-183 has no PUT /me/phone. Shown with `t()`. */
export const NO_PHONE = tLater("The phone number is not available on this API yet.");

/** In E.164: «+», the country code, the number; 8 to 15 digits in all. */
const PHONE = /^\+[1-9][0-9]{7,14}$/;
/** What people put between the digits. */
const SEPARATORS = /[\s\-.()/]/g;

export type EmailFields = { email: string; password: string };

/** The new address and the password, as PUT /me/email wants them. */
export function checkEmailChange(
  fields: EmailFields,
  user: User,
): Checked<ChangeEmailRequest> {
  const email = fields.email.trim();
  const problem =
    emailProblem(email) ??
    (email.toLowerCase() === user.email
      ? t("This is already the email of your account.")
      : null) ??
    (fields.password === "" ? t("Enter your password.") : null);
  return problem === null
    ? { ok: true, request: { email, password: fields.password } }
    : { ok: false, problem };
}

/**
 * The number as the API keeps it, whatever the spaces, dashes, dots and
 * brackets, with «00» in front read as «+»; `null` out of the rule.
 */
export function phoneOf(written: string): string | null {
  const digits = written.replace(SEPARATORS, "");
  const phone = digits.startsWith("00") ? `+${digits.slice(2)}` : digits;
  return PHONE.test(phone) ? phone : null;
}

/** The number written, as PUT /me/phone wants it; nothing written: none. */
export function checkPhone(written: string): Checked<ChangePhoneRequest> {
  if (written.trim() === "") {
    return { ok: true, request: { phone: null } };
  }
  const phone = phoneOf(written);
  return phone === null
    ? {
        ok: false,
        problem: t("Write the number with its country code, like +39 333 123 4567."),
      }
    : { ok: true, request: { phone } };
}

/** The number of an account; an API older than TASK-183 has none. */
export function phoneOfUser(user: User): string | null {
  return user.phone ?? null;
}

/** A change of email or phone number that failed, in words (docs/UI.md). */
export function contactProblem(failed: Failed, what: "email" | "phone"): string {
  if (failed.kind === "api_error") {
    switch (failed.code) {
      // The password of the account, asked again: the email is not in doubt.
      case "wrong_credentials":
        return t("Wrong password.");
      case "email_taken":
        return t("Another account has this email.");
      // The API says what is wrong with a value in words, for people.
      case "invalid_request":
        return failed.message;
      case "http_error":
        return t(what === "email" ? NO_EMAIL_CHANGE : NO_PHONE);
    }
  }
  return accountProblem(failed);
}
