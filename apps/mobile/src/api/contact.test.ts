import emailRequest from "@shaperoute/shared-types/fixtures/change-email-request.json";
import phoneRequest from "@shaperoute/shared-types/fixtures/change-phone-request.json";
import session from "@shaperoute/shared-types/fixtures/session.json";

import { answers, apiError } from "../account/testing";
import { isUser } from "./accounts";
import { changeEmail, changePhone } from "./contact";

const URL = "http://api";
const TOKEN = "the-token";
const AUTH = { Authorization: `Bearer ${TOKEN}` };

test("a user reads with a phone number, without one, and from an API of before", () => {
  expect(isUser(session.user)).toBe(true);
  expect(isUser({ ...session.user, phone: "+393331234567" })).toBe(true);
  const { phone: _phone, ...before } = session.user;
  expect(isUser(before)).toBe(true);
});

test("the email change sends the new address and the password, with the token", async () => {
  const changed = { ...session.user, email: emailRequest.email };
  const fetchFn: jest.Mock = answers({ status: 200, body: changed });
  const outcome = await changeEmail(URL, TOKEN, emailRequest, { fetchFn, key: null });
  expect(outcome).toEqual({ kind: "ok", value: changed });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/email");
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual(emailRequest);
});

test("the phone number is sent as written, and null takes it away", async () => {
  const changed = { ...session.user, phone: "+393331234567" };
  const fetchFn: jest.Mock = answers(
    { status: 200, body: changed },
    { status: 200, body: session.user },
  );
  const kept = await changePhone(URL, TOKEN, phoneRequest, { fetchFn, key: null });
  expect(kept).toEqual({ kind: "ok", value: changed });
  const gone = await changePhone(URL, TOKEN, { phone: null }, { fetchFn, key: null });
  expect(gone).toEqual({ kind: "ok", value: session.user });
  const [url, init] = fetchFn.mock.calls[0];
  expect(url).toBe("http://api/me/phone");
  expect(init).toMatchObject({ method: "PUT", headers: AUTH });
  expect(JSON.parse(init.body)).toEqual(phoneRequest);
  expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({ phone: null });
});

test("what the API refuses comes back with its code", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 403, body: apiError("wrong_credentials", "Wrong password.") },
    { status: 409, body: apiError("email_taken") },
    { status: 404, body: apiError("http_error", "Not Found") },
    new Error("Network request failed"),
  );
  const ask = () => changeEmail(URL, TOKEN, emailRequest, { fetchFn, key: null });
  expect(await ask()).toMatchObject({ kind: "api_error", code: "wrong_credentials" });
  expect(await ask()).toMatchObject({ kind: "api_error", code: "email_taken" });
  // An API older than TASK-183.
  expect(await ask()).toMatchObject({ kind: "api_error", code: "http_error" });
  expect(await ask()).toEqual({ kind: "unreachable", url: URL });
});
