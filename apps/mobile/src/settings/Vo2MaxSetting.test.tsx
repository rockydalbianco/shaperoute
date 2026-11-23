import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { Vo2MaxSetting } from "./Vo2MaxSetting";

// «Show VO₂ max on my profile» in «Settings» (TASK-397): the yes, kept by
// the API, on and off.

const URL = "http://api";
const TOKEN = (session as Session).token;
const estimate = {
  value: 50,
  source: "estimate",
  measured_on: "2026-10-18",
  from_distance: "5k",
};

async function show(fetchFn: jest.Mock, baseUrl: string | null = URL) {
  const sessionEnded = jest.fn();
  await render(
    <Vo2MaxSetting
      account={{
        state: { status: "signedIn", session: session as Session },
        sessionEnded,
      }}
      api={{ baseUrl, fetchFn, key: null }}
    />,
  );
  return sessionEnded;
}

function calls(fetchFn: jest.Mock) {
  return fetchFn.mock.calls.map(([url, init]) => [url, init.method]);
}

test("the switch with its approved words, as the API keeps it", async () => {
  const fetchFn: jest.Mock = answers({
    status: 200,
    body: { show: true, vo2max: estimate },
  });
  await show(fetchFn);
  const row = await screen.findByRole("switch", { name: "Show VO₂ max on my profile" });
  expect(row.props.accessibilityState).toMatchObject({ checked: true });
  expect(calls(fetchFn)).toEqual([[`${URL}/me/vo2max`, "GET"]]);
  expect(fetchFn.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
});

test("a touch turns it off, then on again, with the API's answer", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { show: true, vo2max: estimate } },
    { status: 200, body: { show: false, vo2max: estimate } },
    { status: 200, body: { show: true, vo2max: estimate } },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByRole("switch"));
  await waitFor(() =>
    expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
      checked: false,
    }),
  );
  await fireEvent.press(screen.getByRole("switch"));
  await waitFor(() =>
    expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
      checked: true,
    }),
  );
  expect(calls(fetchFn)).toEqual([
    [`${URL}/me/vo2max`, "GET"],
    [`${URL}/me/vo2max`, "PUT"],
    [`${URL}/me/vo2max`, "PUT"],
  ]);
  expect(fetchFn.mock.calls.slice(1).map(([, init]) => JSON.parse(init.body))).toEqual([
    { show: false },
    { show: true },
  ]);
});

test("a change that does not arrive says why and keeps the switch as it was", async () => {
  await show(
    answers(
      { status: 200, body: { show: false, vo2max: null } },
      new TypeError("offline"),
    ),
  );
  await fireEvent.press(await screen.findByRole("switch"));
  expect(await screen.findByText(/^No connection\./)).toBeOnTheScreen();
  expect(screen.getByRole("switch").props.accessibilityState).toMatchObject({
    checked: false,
  });
});

test("an API older than TASK-397, or none, has no row", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: { detail: "Not Found" } });
  await show(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("switch")).toBeNull();
  const none = answers();
  await show(none, null);
  expect(none).not.toHaveBeenCalled();
  expect(screen.queryByRole("switch")).toBeNull();
});

test("an ended session is said to the account", async () => {
  const sessionEnded = await show(
    answers({ status: 401, body: apiError("session_expired") }),
  );
  await waitFor(() => expect(sessionEnded).toHaveBeenCalledWith(TOKEN));
  expect(screen.queryByRole("switch")).toBeNull();
});
