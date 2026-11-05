import vo2maxSettings from "@shaperoute/shared-types/fixtures/vo2max-settings.json";

import { answers } from "../account/testing";
import { fetchVo2Max, isVo2MaxSettings, saveVo2MaxShow } from "./vo2max";

// The yes of the VO₂ max (TASK-397): GET and PUT /me/vo2max with the token.

const URL = "http://api";
const TOKEN = "the-token";

test("GET /me/vo2max reads the fixture's yes and value with the session", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: vo2maxSettings });
  expect(await fetchVo2Max(URL, TOKEN, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: vo2maxSettings,
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect([url, init.method, init.body]).toEqual([`${URL}/me/vo2max`, "GET", undefined]);
  expect(init).toMatchObject({ headers: { Authorization: `Bearer ${TOKEN}` } });
});

test("PUT /me/vo2max carries only the yes", async () => {
  const fetchFn: jest.Mock = answers({
    status: 200,
    body: { show: false, vo2max: null },
  });
  expect(await saveVo2MaxShow(URL, TOKEN, false, { fetchFn, key: null })).toEqual({
    kind: "ok",
    value: { show: false, vo2max: null },
  });
  const [url, init] = fetchFn.mock.calls[0];
  expect([url, init.method]).toEqual([`${URL}/me/vo2max`, "PUT"]);
  expect(JSON.parse(init.body)).toEqual({ show: false });
});

test("an API older than TASK-397 has no /me/vo2max: not an answer", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: { detail: "Not Found" } });
  expect((await fetchVo2Max(URL, TOKEN, { fetchFn, key: null })).kind).not.toBe("ok");
});

test("only the shape of Vo2MaxSettings is taken", () => {
  const estimate = {
    value: 50,
    source: "estimate",
    measured_on: "2026-10-18",
    from_distance: "5k",
  };
  expect(isVo2MaxSettings({ show: true, vo2max: estimate })).toBe(true);
  expect(isVo2MaxSettings({ show: false, vo2max: null })).toBe(true);
  expect(isVo2MaxSettings({ show: "yes", vo2max: null })).toBe(false);
  expect(
    isVo2MaxSettings({ show: true, vo2max: { ...estimate, source: "garmin" } }),
  ).toBe(false);
  expect(
    isVo2MaxSettings({ show: true, vo2max: { ...estimate, from_distance: "3k" } }),
  ).toBe(false);
  expect(isVo2MaxSettings({ show: true, vo2max: { ...estimate, value: "50" } })).toBe(
    false,
  );
  expect(isVo2MaxSettings(null)).toBe(false);
});
