import list from "@shaperoute/shared-types/fixtures/gear-list.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Gear, RunActivity, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";

import { answers, apiError } from "../account/testing";
import { FollowsContext } from "../social/followsDoor";
import { defaultsFor, GearPicker, toggled, useGearChoice } from "./GearPicker";

// «Gear» at the end of an activity (TASK-486 part C, ADR-0393): the items
// in use, the sport's defaults chosen until a tap.

const URL = "http://api";
const [SHOES, HELMET] = list.gear as Gear[];
const BIKE: Gear = {
  ...SHOES,
  id: "bike",
  kind: "bike",
  name: "Canyon",
  defaults: ["cycling"],
};
const MINE: Gear[] = [
  { ...SHOES, defaults: ["running", "hiking"] },
  BIKE,
  { ...HELMET, defaults: ["cycling"] },
];

test("the defaults are the items in use of that sport", () => {
  expect(defaultsFor(MINE, "running")).toEqual([SHOES.id]);
  // The helmet is retired: never chosen by itself.
  expect(defaultsFor(MINE, "cycling")).toEqual(["bike"]);
  expect(defaultsFor(MINE, "paddling")).toEqual([]);
});

test("a tap adds or takes off, never past ten", () => {
  expect(toggled(["a"], "b")).toEqual(["a", "b"]);
  expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  const ten = Array.from({ length: 10 }, (_, n) => `g${n}`);
  expect(toggled(ten, "x")).toEqual(ten);
});

type FormProps = { fetchFn: jest.Mock; on?: boolean; withDefaults?: boolean };

function Form({ fetchFn, on = true, withDefaults }: FormProps) {
  const [activity, setActivity] = useState<RunActivity>("running");
  const choice = useGearChoice(activity, {
    api: { baseUrl: URL, fetchFn, key: null },
    on,
    withDefaults,
  });
  return (
    <>
      <Text onPress={() => setActivity("cycling")}>Ride</Text>
      <Text testID="chosen">{choice.chosen.join(",")}</Text>
      <GearPicker {...choice} />
    </>
  );
}

async function show(fetchFn: jest.Mock, on = true, withDefaults?: boolean) {
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: null,
        account: {
          state: { status: "signedIn", session: session as Session },
          sessionEnded: jest.fn(),
        },
        openProfile: () => {},
      }}
    >
      <Form fetchFn={fetchFn} on={on} withDefaults={withDefaults} />
    </FollowsContext.Provider>,
  );
}

test("off, nothing is asked and there is no row", async () => {
  const off: jest.Mock = answers({ status: 200, body: { gear: MINE } });
  await show(off, false);
  expect(off).not.toHaveBeenCalled();
  expect(screen.queryByTestId("gear-picker")).toBeNull();
});

test("an API without gear shows no row", async () => {
  const old: jest.Mock = answers({ status: 404, body: apiError("http_error") });
  await show(old);
  await waitFor(() => expect(old).toHaveBeenCalled());
  expect(screen.queryByTestId("gear-picker")).toBeNull();
});

test("the sport's defaults start chosen and follow the sport until a tap", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: MINE } });
  await show(fetchFn);
  expect(await screen.findByText("👟 The red ones")).toBeOnTheScreen();
  // The retired helmet is not offered.
  expect(screen.queryByText(/Petzl/)).toBeNull();
  expect(screen.getByTestId("chosen")).toHaveTextContent(SHOES.id);
  await fireEvent.press(screen.getByText("Ride"));
  expect(screen.getByTestId("chosen")).toHaveTextContent("bike");
  // A tap: the choice is the user's, a change of sport keeps it.
  await fireEvent.press(screen.getByText("👟 The red ones"));
  expect(screen.getByTestId("chosen")).toHaveTextContent(`bike,${SHOES.id}`);
  expect(screen.getByTestId(`gear-chip-${SHOES.id}`)).toBeSelected();
});

test("an activity from a file starts with no gear chosen", async () => {
  const fetchFn: jest.Mock = answers({ status: 200, body: { gear: MINE } });
  await show(fetchFn, true, false);
  expect(await screen.findByText("👟 The red ones")).toBeOnTheScreen();
  expect(screen.getByTestId("chosen")).toHaveTextContent("");
});
