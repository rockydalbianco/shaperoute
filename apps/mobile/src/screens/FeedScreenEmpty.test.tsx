/**
 * «All» with nothing in it (TASK-509): a page that says so and offers the
 * one thing to do about it. With an account «Record now», which starts a
 * recording as the «+»'s first entry does; without one «Log in», which
 * opens the profile's page. A Feed not given the way has no button.
 */
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { forgetFeed } from "../feed/useFeed";
import { FollowsContext } from "../social/followsDoor";
import { PeopleContext } from "../social/peopleDoor";
import { FeedScreen } from "./FeedScreen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../feed/feedTabChoice", () => ({
  loadFeedTab: jest.fn(() => "all"),
  saveFeedTab: jest.fn(),
}));

const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };
const SIGNED_OUT: AccountState = { status: "signedOut", notice: null };

let fetchSpy: jest.SpiedFunction<typeof fetch>;

function Around({ children, state }: { children: ReactNode; state: AccountState }) {
  return (
    <FollowsContext.Provider
      value={{
        apiUrl: API,
        account: { state, sessionEnded: () => {} },
        openProfile: () => {},
      }}
    >
      <PeopleContext.Provider value={{ open: () => {} }}>
        {children}
      </PeopleContext.Provider>
    </FollowsContext.Provider>
  );
}

beforeEach(() => {
  forgetFeed();
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: [], next: null, filter: "all" });
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => fetchSpy.mockRestore());

test("with an account, the empty «All» offers «Record now» and it starts a recording", async () => {
  const onRecord = jest.fn();
  await render(
    <Around state={SIGNED_IN}>
      <FeedScreen onOpen={() => {}} onRecord={onRecord} />
    </Around>,
  );
  const empty = await screen.findByTestId("feed-no-posts-all");
  expect(within(empty).getByText("Nobody has published anything yet.")).toBeTruthy();
  await fireEvent.press(within(empty).getByRole("button", { name: "Record now" }));
  expect(onRecord).toHaveBeenCalledTimes(1);
});

test("without an account, the empty «All» offers «Log in» and it opens the profile", async () => {
  const onLogIn = jest.fn();
  await render(
    <Around state={SIGNED_OUT}>
      <FeedScreen onOpen={() => {}} onLogIn={onLogIn} />
    </Around>,
  );
  const empty = await screen.findByTestId("feed-log-in");
  expect(
    within(empty).getByText("Log in from Profile to see the activities."),
  ).toBeTruthy();
  await fireEvent.press(within(empty).getByRole("button", { name: "Log in" }));
  expect(onLogIn).toHaveBeenCalledTimes(1);
});

test("a Feed not given the way to record or to log in has no button there", async () => {
  await render(
    <Around state={SIGNED_IN}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  const empty = await screen.findByTestId("feed-no-posts-all");
  expect(within(empty).queryByRole("button")).toBeNull();
});
