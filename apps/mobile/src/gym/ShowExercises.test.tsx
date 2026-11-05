/**
 * «Show exercises» on the card of a workout in «My activities» (TASK-385
 * part D, the user's «Visibili, nascondibili»): as the API has it, changed
 * there at once, and back as it was when the API does not take it.
 */
import type { Session } from "@shaperoute/shared-types";
import session from "@shaperoute/shared-types/fixtures/session.json";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { answers, apiError } from "../account/testing";
import { FollowsContext, type FollowsDoor } from "../social/followsDoor";
import { ShowExercises } from "./ShowExercises";

const SAVED = {
  id: "key12345",
  started_at: "2026-11-05T17:00:00Z",
  duration_s: 3600,
  rests: 0,
  rest_s: 0,
  show_exercises: true,
  sets: [],
};

function follows(): FollowsDoor {
  return {
    apiUrl: "http://api",
    account: {
      state: { status: "signedIn", session: session as Session },
      sessionEnded: () => {},
    },
    openProfile: () => {},
  } as unknown as FollowsDoor;
}

async function show(fetchFn: jest.Mock) {
  await render(
    <FollowsContext.Provider value={follows()}>
      <ShowExercises gymKey="key12345" fetchFn={fetchFn} />
    </FollowsContext.Provider>,
  );
  await act(async () => {});
}

const theSwitch = () => screen.getByRole("switch", { name: "Show exercises" });

test("it starts as the API has it, and a tap turns it off there", async () => {
  const fetchFn = answers({ status: 200, body: SAVED }, { status: 204 });
  await show(fetchFn);
  expect(theSwitch()).toBeChecked();
  await fireEvent.press(theSwitch());
  await act(async () => {});
  expect(theSwitch()).not.toBeChecked();
  const [url, init] = fetchFn.mock.calls[1];
  expect(url).toBe("http://api/me/gym-sessions/key12345/show-exercises");
  expect(init?.method).toBe("PUT");
  expect(JSON.parse(init?.body as string)).toEqual({ show: false });
});

test("hidden before, it shows off; turned on, it says show: true", async () => {
  const fetchFn = answers(
    { status: 200, body: { ...SAVED, show_exercises: false } },
    { status: 204 },
  );
  await show(fetchFn);
  expect(theSwitch()).not.toBeChecked();
  await fireEvent.press(theSwitch());
  await act(async () => {});
  expect(JSON.parse(fetchFn.mock.calls[1][1]?.body as string)).toEqual({ show: true });
});

test("without a network it goes back, and says so", async () => {
  const fetchFn = answers({ status: 200, body: SAVED }, new Error("offline"));
  await show(fetchFn);
  await fireEvent.press(theSwitch());
  await act(async () => {});
  expect(theSwitch()).toBeChecked();
  expect(
    screen.getByText("No connection. Try again when you are online."),
  ).toBeTruthy();
});

test("nothing shows for a key the API does not know", async () => {
  const fetchFn = answers({ status: 404, body: apiError("http_error") });
  await show(fetchFn);
  expect(screen.queryByTestId("show-exercises")).toBeNull();
});
