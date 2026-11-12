/**
 * The «+» of the Feed's bar (TASK-476): with an account and the file
 * picker in the app, at the right of the tabs; without an account, or in
 * an app built without the picker, not there.
 */
import page from "@shaperoute/shared-types/fixtures/feed.json";
import session from "@shaperoute/shared-types/fixtures/session.json";
import type { FeedPost, Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { AccountState } from "../account/useAccount";
import { forgetFeed } from "../feed/useFeed";
import { filePickerAvailable } from "../imports/pickActivityFile";
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
jest.mock("../imports/pickActivityFile", () => ({
  ...jest.requireActual("../imports/pickActivityFile"),
  filePickerAvailable: jest.fn(() => true),
}));

const API = "http://api";
const SIGNED_IN: AccountState = { status: "signedIn", session: session as Session };
const SIGNED_OUT: AccountState = { status: "signedOut", notice: null };
const [STAR] = page.posts as FeedPost[];

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
  jest.mocked(filePickerAvailable).mockReturnValue(true);
  fetchSpy = jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith(`${API}/feed`)) {
      return Response.json({ posts: [STAR], next: null, filter: "all" });
    }
    return Response.json(
      { error: { code: "http_error", message: url } },
      { status: 404 },
    );
  });
});

afterEach(() => fetchSpy.mockRestore());

test("with an account, the «+» is beside the tabs and opens «Add activity»", async () => {
  await render(
    <Around state={SIGNED_IN}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await screen.findByText("Sunday heart by the river");
  expect(screen.getByText("Following")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Add activity" }));
  expect(screen.getByText("From a file")).toBeOnTheScreen();
});

test("without an account there is no «+»", async () => {
  await render(
    <Around state={SIGNED_OUT}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await screen.findAllByTestId("feed-list");
  expect(screen.queryByTestId("feed-add")).toBeNull();
});

test("in an app built without the file picker there is no «+»", async () => {
  jest.mocked(filePickerAvailable).mockReturnValue(false);
  await render(
    <Around state={SIGNED_IN}>
      <FeedScreen onOpen={() => {}} />
    </Around>,
  );
  await screen.findByText("Sunday heart by the river");
  expect(screen.queryByTestId("feed-add")).toBeNull();
});
