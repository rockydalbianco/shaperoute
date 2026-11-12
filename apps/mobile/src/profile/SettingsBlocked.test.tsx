import session from "@shaperoute/shared-types/fixtures/session.json";
import type { Session } from "@shaperoute/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Account } from "../account/useAccount";
import { FollowsContext } from "../social/followsDoor";
import { SettingsPage } from "./SettingsPage";

// «Blocked people» is in «Settings», under the account (TASK-457): it was
// a row among the numbers of the profile.

jest.mock("expo-notifications");

const URL = "http://api";
const signedIn = session as Session;

const account: Account = {
  state: { status: "signedIn", session: signedIn },
  busy: null,
  problem: null,
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  deleteAccount: jest.fn(),
  editProfile: jest.fn(),
  changeEmail: jest.fn(),
  changePhone: jest.fn(),
  changeNotifications: jest.fn(),
  clearProblem: jest.fn(),
  sessionEnded: jest.fn(),
};

afterEach(() => {
  jest.restoreAllMocks();
});

test("«Blocked people» is a row of the account and opens its list", async () => {
  const fetchFn = jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () =>
      Response.json({ people: [], next: null, total: 0 }),
    );
  await render(
    <FollowsContext.Provider
      value={{
        apiUrl: URL,
        account: { state: account.state, sessionEnded: jest.fn() },
        openProfile: jest.fn(),
      }}
    >
      <SettingsPage
        user={signedIn.user}
        account={account}
        onAbout={jest.fn()}
        feedbackApi={{ baseUrl: null }}
      />
    </FollowsContext.Provider>,
  );
  const names = screen
    .getAllByRole("button")
    .map((button) => button.props.accessibilityLabel as string | undefined);
  // Among the rows of the account: after the phone number, before the sport.
  expect(names.indexOf("Blocked people")).toBeGreaterThan(0);
  expect(names.indexOf("Blocked people")).toBeLessThan(names.indexOf("Help"));

  await fireEvent.press(screen.getByRole("button", { name: "Blocked people" }));
  expect(await screen.findByText("You have not blocked anyone.")).toBeOnTheScreen();
  expect(
    fetchFn.mock.calls.some(([url]) => String(url).startsWith(`${URL}/me/blocked`)),
  ).toBe(true);
});
