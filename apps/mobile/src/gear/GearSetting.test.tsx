import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import one from "@shaperoute/shared-types/fixtures/gear.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { GearSetting } from "./GearSetting";

// «Gear» in «Settings» (TASK-486 part B, ADR-0393): off behind GEAR_ON,
// only on an API that has it, the list of the items in use then retired.

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);

const URL = "http://api";

async function show(fetchFn: jest.Mock, on = true) {
  const sessionEnded = jest.fn();
  await render(
    <GearSetting
      account={{
        state: { status: "signedIn", session: session as Session },
        sessionEnded,
      }}
      api={{ baseUrl: URL, fetchFn, key: null }}
      on={on}
    />,
  );
  return sessionEnded;
}

test("off, nothing is asked and nothing shows", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn, false);
  expect(fetchFn).not.toHaveBeenCalled();
  expect(screen.queryByText("Gear")).toBeNull();
});

test("an API without gear shows no row", async () => {
  const fetchFn: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  await show(fetchFn);
  await waitFor(() => expect(fetchFn).toHaveBeenCalled());
  expect(screen.queryByText("Gear")).toBeNull();
});

test("the row counts the items in use and opens the list", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: list });
  await show(fetchFn);
  const row = await screen.findByLabelText("Gear, 1");
  await fireEvent.press(row);
  expect(await screen.findByText("The red ones")).toBeOnTheScreen();
  expect(screen.getByText("412.3 km · 38 activities")).toBeOnTheScreen();
  expect(screen.getByText("Retired")).toBeOnTheScreen();
  expect(screen.getByText("Petzl")).toBeOnTheScreen();
  expect(screen.getByText("2 h · 2 activities")).toBeOnTheScreen();
});

test("an empty list says what gear is for", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(fetchFn);
  await fireEvent.press(await screen.findByLabelText("Gear"));
  expect(
    await screen.findByText(/Add your shoes, your bike, your skis/),
  ).toBeOnTheScreen();
});

test("a new item is sent whole and the list is read again", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [] } },
    { status: 201, body: one },
    { status: 200, body: { gear: [one] } },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByLabelText("Gear"));
  await fireEvent.press(await screen.findByText("Add gear"));
  await fireEvent.changeText(screen.getByLabelText("Brand"), "Nike");
  await fireEvent.changeText(screen.getByLabelText("Model"), "Pegasus 41");
  await fireEvent.changeText(screen.getByLabelText("Month bought"), "3");
  await fireEvent.changeText(screen.getByLabelText("Year bought"), "2025");
  await fireEvent.changeText(screen.getByLabelText("Limit"), "700");
  await fireEvent.press(screen.getByText(/ Run$/));
  await fireEvent.press(screen.getByText("Save"));
  await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe("http://api/me/gear");
  expect(JSON.parse(init.body)).toEqual({
    kind: "shoes",
    brand: "Nike",
    model: "Pegasus 41",
    name: null,
    bought_on: "2025-03-01",
    note: null,
    limit_m: 700_000,
    off_profile: false,
    retired: false,
    defaults: ["running"],
  });
  expect(await screen.findByText("The red ones")).toBeOnTheScreen();
});

test("without a brand nothing is sent", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: [] } });
  await show(fetchFn);
  await fireEvent.press(await screen.findByLabelText("Gear"));
  await fireEvent.press(await screen.findByText("Add gear"));
  await fireEvent.press(screen.getByText("Save"));
  expect(await screen.findByText("Say the brand.")).toBeOnTheScreen();
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test("a word the filter refuses is said in the app's words", async () => {
  const fetchFn: jest.Mock = answers(
    { status: 200, body: { gear: [] } },
    { status: 422, body: apiError("comment_rejected") },
  );
  await show(fetchFn);
  await fireEvent.press(await screen.findByLabelText("Gear"));
  await fireEvent.press(await screen.findByText("Add gear"));
  await fireEvent.changeText(screen.getByLabelText("Brand"), "Nike");
  await fireEvent.press(screen.getByText("Save"));
  expect(
    await screen.findByText("These words can't be used. Try other words."),
  ).toBeOnTheScreen();
});
